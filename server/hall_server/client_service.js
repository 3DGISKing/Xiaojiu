var logger = require('../utils/logger');
var crypto = require('../utils/crypto');
var express = require('express');
var db = require('../utils/db');
var http = require('../utils/http');
var room_service = require("./room_service");
var bodyParser = require('body-parser');

var app = express();
var config = null;
// app.use(express.bodyParser());
app.use(bodyParser.text({ type: 'text/html' }));
app.use(bodyParser.text({ type: 'text/xml' }));
app.use(bodyParser.raw({ type: 'application/vnd.custom-type' }));
app.use(bodyParser.json({ type: 'application/*+json'}));
app.use(bodyParser.urlencoded({ extended: true }));

function check_account(req,res){
	var account = req.query.account;
	var sign = req.query.sign;

	if(account == null || sign == null){
		http.send(res,1,"unknown error");
		return false;
	}
	/*
	var serverSign = crypto.md5(account + req.ip + config.ACCOUNT_PRI_KEY);
	if(serverSign != sign){
		http.send(res,2,"login failed.");
		return false;
	}
	*/
	return true;
}

//设置跨域访问
app.all('*', function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "X-Requested-With");
	res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
	res.header("X-Powered-By",' 3.2.1');
	res.header("Content-Type", "application/json;charset=utf-8");
	next();
});

app.get('/login',function(req,res){
	if(!check_account(req,res)){
		return;
	}
	
	var ip = req.ip;

	if(ip.indexOf("::ffff:") != -1){
		ip = ip.substr(7);
	}
	
	var account = req.query.account;

	db.get_user_data(account,function(data){
		if(data == null){
			http.send(res,0,"Failed to get account information: account: " + account);
			return;
		}

		var ret = {
			account:data.account,
			userid:data.userid,
			name:data.name,
			lv:data.lv,
			coins:data.coins,
			gems:data.gems,
			ip:ip,
			sex:data.sex,
            dealerId: data.dealer_id
		};

        var onlinedate=parseInt(parseInt(Date.now())/1000);

        db.update_user_onlinedate(data.account, onlinedate);

		db.get_room_id_of_user(data.userid,function(roomId){
			//如果用户处于房间中，则需要对其房间进行检查。 如果房间还在，则通知用户进入
			if(roomId != null){
				//检查房间是否存在于数据库中
				db.is_room_exist(roomId,function (retval){
					if(retval){
						ret.roomid = roomId;
                        http.send(res,0,"You have previously entered room: " + roomId + " and this room still exist! You will be tried to enter this room again.",ret);
					}
					else{
						//如果房间不在了，表示信息不同步，清除掉用户记录
						db.set_room_id_of_user(data.userid,null);
                        http.send(res,0,"You have previously entered room: " + roomId + " but this room does not exist! Database will be updated.",ret);
					}
				});
			}
			else {
				http.send(res,0,"You have not previously entered any room!",ret);
			}
		});
	});
});

app.get('/create_user',function(req,res){
	if(!check_account(req,res)){
		return;
	}
	var account = req.query.account;
	var name = req.query.name;
	var coins = 1000;
	var gems = 21;
	console.log(name);

	db.is_user_exist(account,function(ret){
		if(!ret){
			db.create_user(account,name,coins,gems,0,null,function(ret){
				if (ret == null) {
					http.send(res,2,"system error.");
				}
				else{
					http.send(res,0,"ok");					
				}
			});
		}
		else{
			http.send(res,1,"account have already exist.");
		}
	});
});

app.get('/create_private_room',function(req,res){
	//验证参数合法性
	var data = req.query;
	//验证玩家身份
	if(!check_account(req,res)){
		return;
	}

	var account = data.account;

	data.account = null;
	data.sign = null;
	var conf = data.conf;
	db.get_user_data(account,function(data){
		if(data == null){
			http.send(res,1,"system error");
			return;
		}

		var userId = data.userid;
		var name = data.name;

		//验证玩家状态
		db.get_room_id_of_user(userId,function(roomId){
			if(roomId != null){
				db.is_room_exist(roomId, function (ret) {
					if(ret) {
                        http.send(res, 1234, "user is playing in room now.");
					}
					else {
                        //创建房间
                        room_service.createRoom(account,userId,conf,function(err,roomId){
                            if(err == 0 && roomId != null){
                                room_service.enterRoom(userId,name,roomId,function(errcode,enterInfo){
                                    //errorcode
                                    // 101 게임봉사기를 선택할수 없다.
                                    // 103 사용자의 보석정보를 얻을수 없다.


                                    if(enterInfo){
                                        var ret = {
                                            roomid:roomId,
                                            ip:enterInfo.ip,
                                            port:enterInfo.port,
                                            token:enterInfo.token,
                                            time:Date.now()
                                        };

                                        db.insert_available_room(userId, roomId);

                                        ret.sign = crypto.md5(ret.roomid + ret.token + ret.time + config.ROOM_PRI_KEY);
                                        http.send(res,0,"ok",ret);
                                    }
                                    else{
                                        http.send(res,errcode,"room doesn't exist.");
                                    }
                                });
                            }
                            else{
                                http.send(res,err,"Failed to create room.");
                            }
                        });
					}
                });

				return;
			}

			//创建房间
			room_service.createRoom(account,userId,conf,function(err,roomId){
				if(err == 0 && roomId != null){
					room_service.enterRoom(userId,name,roomId,function(errcode,enterInfo){
						//errorcode
						// 101 게임봉사기를 선택할수 없다.
						// 103 사용자의 보석정보를 얻을수 없다.


						if(enterInfo){
							var ret = {
								roomid:roomId,
								ip:enterInfo.ip,
								port:enterInfo.port,
								token:enterInfo.token,
								time:Date.now()
							};

                            db.insert_available_room(userId, roomId);

                            ret.sign = crypto.md5(ret.roomid + ret.token + ret.time + config.ROOM_PRI_KEY);
							http.send(res,0,"ok",ret);
						}
						else{
							http.send(res,errcode,"room doesn't exist.");
						}
					});
				}
				else{
					http.send(res,err,"Failed to create room.");
				}
			});
		});
	});
});

// 방에 들어가겠다고 요청이 왔을 때
app.get('/enter_private_room',function(req,res){
	var data = req.query;
	var roomId = data.roomid;

	if(roomId == null){
		http.send(res,-1,"parameters don't match api requirements. roomId is null!");
		return;
	}

	if(!check_account(req,res)){
		return;
	}

	var account = data.account;

	db.get_user_data(account,function(data){
		if(data == null){
			http.send(res,-1,"system error");
			return;
		}

		var userId = data.userid;
		var name = data.name;

		//进入房间
		room_service.enterRoom(userId,name,roomId,function(errcode, enterInfo){
			if(enterInfo){
				var ret = {
					roomid:roomId,
					ip:enterInfo.ip,
					port:enterInfo.port,
					token:enterInfo.token,
					time:Date.now()
				};
				db.insert_available_room(userId, roomId);
				ret.sign = crypto.md5(roomId + ret.token + ret.time + config.ROOM_PRI_KEY);
				http.send(res, 0, "Successfully to get game server address for given roomId:" + roomId, ret);
			}
			else{
				//error code
				// -2 주어진 방과 관련된 게임봉사기의 ip, port를 얻을수 없다. 자료기지에 해당 방번호에 대한 자료가 없을수 있다.
				http.send(res, errcode, "Failed to get game server address for given roomId:" + roomId + " Maybe the data for room does not exist in database.");
			}
		});
	});
});

app.get('/get_history_list',function(req,res){
	var data = req.query;
	if(!check_account(req,res)){
		return;
	}
	var account = data.account;
	db.get_user_data(account,function(data){
		if(data == null){
			http.send(res,-1,"system error");
			return;
		}
		var userId = data.userid;
		db.get_user_history(userId,function(history){
			http.send(res,0,"ok",{history:history});
		});
	});
});

app.get('/get_charge_history_list',function(req,res){
    var data = req.query;

    if(!check_account(req,res)){
        return;
    }

    var account = data.account;

    db.get_user_data(account,function(data){
        if(data == null){
            http.send(res,-1,"system error");
            return;
        }

        var userId = data.userid;

        db.get_charge_history(userId,function(rows){
            if (rows == null) {
                http.send(res, 1,"no history", null);
            }
            else {
                http.send(res,0,"ok",{data:rows});
            }
        });
    });
});


app.get('/get_games_of_room',function(req,res){
	var data = req.query;
	var uuid = data.uuid;
	if(uuid == null){
		http.send(res,-1,"parameters don't match api requirements.");
		return;
	}
	if(!check_account(req,res)){
		return;
	}
	db.get_games_of_room(uuid,function(data){
		console.log(data);
		http.send(res,0,"ok",{data:data});
	});
});

app.get('/get_detail_of_game',function(req,res){
	var data = req.query;
	var uuid = data.uuid;
	var index = data.index;
	if(uuid == null || index == null){
		http.send(res,-1,"parameters don't match api requirements.");
		return;
	}
	if(!check_account(req,res)){
		return;
	}
	db.get_detail_of_game(uuid,index,function(data){
		http.send(res,0,"ok",{data:data});
	});
});

app.get('/get_user_status',function(req,res){
	if(!check_account(req,res)){
		return;
	}
	var account = req.query.account;
	db.get_gems(account,function(data){
		if(data != null){
			db.get_available_rooms_by_user_account(account, function(rooms){

				var result = {gems: data.gems};
				if(rooms && rooms.length > 0){
					var availableRooms = [];
					for(var i = 0; i < rooms.length; i++){
						var avRoom = rooms[i];
						var baseInfo = JSON.parse(avRoom.base_info);
						var roomInfo = {roomid: avRoom.id, difen: baseInfo.shangzhuangDifen, jushu: baseInfo.jushuType};
						var playerCount = 0;
						for(var j = 0; j < 6; j++){
							var player = avRoom['user_id' + j]
							if(player == '0' || player == 0){

							}
							else{
								playerCount++;
							}
						}
						roomInfo.players = playerCount;
						availableRooms.push(roomInfo);
					}
					result.availableRooms = availableRooms;
				}
                http.send(res,0,"ok",result);
            });
		}
		else{
			http.send(res,1,"get gems failed.");
		}
	});
});

app.get('/get_message',function(req,res){
	if(!check_account(req,res)){
		return;
	}
	var type = req.query.type;
	
	if(type == null){
		http.send(res,-1,"parameters don't match api requirements.");
		return;
	}
	
	var version = req.query.version;
	db.get_message(type,version,function(data){
		if(data != null){
			http.send(res,0,"ok",{msg:data.msg,version:data.version});	
		}
		else{
			http.send(res,1,"get message failed.");
		}
	});
});

app.get('/is_server_online',function(req,res){
	if(!check_account(req,res)){
		return;
	}
	var ip = req.query.ip;
	var port = req.query.port;
	room_service.isServerOnline(ip,port,function(isonline){
		var ret = {
			isonline:isonline
		};
		http.send(res,0,"ok",ret);
	}); 
});

exports.start = function($config){
	config = $config;
	app.listen(config.CLEINT_PORT);

	logger.log("client service is listening on port " + config.CLEINT_PORT);
};

/**
 * 用户购买商品
 */
var alipay = require("../utils/alipay.js");
var WxPay = require("../utils/WxPay.js");
var order_model = require("../hall_server/order_model.js");

var apiBuyGoods = function (req, res) {
    db.get_user_data(req.query.account, function (user) {
        if (!user) {
            http.send(res, 1, "failed to get user data!");
            return ;
		}

		db.get_goods(req.query.targetItem, function(goods){
			if(!goods){
                http.send(res, 2, "failed to get good!");
				return;
			}

            var channel = "weixin";

			var ipAddress = "unknownIp";

			if(req.ip != null) {
				ipAddress = req.ip.replace("::ffff:", "");
			}

            order_model.createOrder(goods, user, channel, function (err, order_info) {
                if (err) {
                	//this case err argument represent order_id
                    db.update_order_results_by_order_id(err, order_model.OS_REQUEST_FAIL);
                    http.send(res, 3, "error", err);
                }
                else {
                    http.send(res, 0, "ok", order_info);
                }
            }, ipAddress);
		});
    });
};

app.get('/api/buy_goods', apiBuyGoods);
app.post('/api/alipay_notify', alipay.notify);
app.post('/weixin/WxPay_notify', WxPay.notify);

var fs = require('fs');

app.use('/api/link_app', express.static(__dirname + '/link'));

app.get('/set_dealer_id',function(req,res){
    if(!check_account(req,res)){
        http.send(res, 1, "failed to account check!");
        return;
    }

    var userId = req.query.userId;
    var dealerId = req.query.dealerId;

    db.is_userId_exist(dealerId, function (ret) {
        if (ret == false) {
            http.send(res, 2, "dealerId does not exist!");
        }
        else {
        	db.update_dealer_id_input_time(userId);
            db.update_user_dealer_id(userId, dealerId);

            db.get_gems_by_userid(userId, function(data){
                var gem = 0;

                if (data != null) {
                    gem = data.gems;

                    gem += 8;
                }
                else{
                    http.send(res, 3, "failed to get user gem!");
                    return;
                }

                db.update_gems(userId, gem);
            });

            db.get_dealer_level(dealerId, function (level) {
                if (level == null || level == 0){
                    db.update_dealer_level(dealerId, 1);
                    db.update_dealer_become_time(dealerId);
                    db.set_default_id_and_pwd(dealerId);
                }

                http.send(res, 0, "ok!");
            });
        }
    });
});

app.get('/guest_dealer_logic',function(req,res){
    var userId = req.query.userId;
    var amount = parseFloat(req.query.amount);

    var order_info = {
        user_id: userId,
    	gems: amount,
		charge_amount: amount,
        total_amount: amount
	};

    //  获取用户信息
    db.get_user_data_by_userid(order_info.user_id, function (user_info) {
        if (!user_info)
            return callback(new Error('can not find user info. user_id = ' + order_info.user_id));

        //  更新用户信息
        user_info.gems += order_info.gems;
        user_info.charge_amount += parseFloat(order_info.total_amount);

        db.update_user_gem_and_charge_amount(user_info.userid, user_info.gems, user_info.charge_amount);
    //    db.update_goods_sales(order_info.goods_id, order_info.sales + 1);
    //    db.update_order_results(order_info.id, OS_SUCCESS, buyer_id, trade_no);
        db.update_dealer_profit(order_info.user_id, order_info.total_amount);
    });

    http.send(res, 0, "ok!");
});

app.get('/report', function(req, res){
    var userId = req.query.userId;
    var level = parseInt(req.query.level);
    var msg = req.query.msg;

    var fileName = "user_" + userId;

    if (level == 0) {
    	fileName += "_log";

        logger.log(msg, fileName);
    }
	else if (level == 1) {
        fileName += "_error";
        logger.error(msg, fileName);
	}

    http.send(res, 0, "ok!");
});
