var logger = require('../utils/logger');
var crypto = require('../utils/crypto');
var express = require('express');
var db = require('../utils/db');
var http = require('../utils/http');
var app = express();

var config = null;
var rooms = {};
var serverMap = {};

//设置跨域访问
app.all('*', function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "X-Requested-With");
	res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
	res.header("X-Powered-By",' 3.2.1');
	res.header("Content-Type", "application/json;charset=utf-8");
	next();
});

app.get('/register_gs',function(req,res){
	
	var ip = req.ip;
	var clientip = req.query.clientip;
	var clientport = req.query.clientport;
	var httpPort = req.query.httpPort;
	var load = req.query.load;
	var id = clientip + ":" + clientport;

	if(serverMap[id]){
		var info = serverMap[id];

		if(info.clientport != clientport
			|| info.httpPort != httpPort
			|| info.ip != ip
		){
			logger.log("duplicate gsid:" + id + ",addr:" + ip + "(" + httpPort + ")");
			http.send(res,1,"duplicate gsid:" + id);
			return;
		}

		info.load = load;
		http.send(res,0,"ok",{ip:ip});
		return;
	}

	serverMap[id] = {
		ip:ip,
		id:id,
		clientip:clientip,
		clientport:clientport,
		httpPort:httpPort,
		load:load
	};

	http.send(res,0,"ok",{ip:ip});
	logger.log("game server registered.\n\tid:" + id + "\n\taddr:" + ip + "\n\thttp port:" + httpPort + "\n\tsocket clientport:" + clientport);

	var reqdata = {
		serverid:id,
		sign:crypto.md5(id+config.ROOM_PRI_KEY)
	};

	//获取服务器信息
	http.get(ip,httpPort,"/get_server_info",reqdata,function(ret,data){
		if(ret && data.errcode == 0){
			for(var i = 0; i < data.userroominfo.length; i += 2){
				var userId = data.userroominfo[i];
				var roomId = data.userroominfo[i+1];
			}
		}
		else{
			logger.log(data.errmsg);
		}
	});
});

function chooseServer(){
	var serverinfo = null;

	for(var s in serverMap){
		var info = serverMap[s];

		if(serverinfo == null){
			serverinfo = info;			
		}
		else{
			if(serverinfo.load > info.load){
				serverinfo = info;
			}
		}
	}

	return serverinfo;
}

exports.createRoom = function(account,userId,roomConf,fnCallback){
	var serverinfo = chooseServer();

	if(serverinfo == null){
		fnCallback(101,null);
		return;
	}
	
	db.get_gems(account,function(data){
		if(data != null){
			//2、请求创建房间
			var reqdata = {
				userid:userId,
				gems:data.gems,
				conf:roomConf
			};

			reqdata.sign = crypto.md5(userId + roomConf + data.gems + config.ROOM_PRI_KEY);

			http.get(serverinfo.ip,serverinfo.httpPort,"/create_room",reqdata,function(ret,data){
				if(ret){
					if(data.errcode == 0){
						fnCallback(0,data.roomid);
					}
					else{
						fnCallback(data.errcode,null);		
					}
					return;
				}

				fnCallback(102,null);
			});	
		}
		else{
			fnCallback(103,null);
		}
	});
};

//들어가려는 방과 련결된 게임봉사기의 ip, port를 얻는다.
// userId: 들어가려고 하는 user의 Id
// name:   들어가려고 하는 user의 name
// roomId: 들어가려고 하는 방의 번호
exports.enterRoom = function(userId,name,roomId,fnCallback){
	var reqdata = {
		userid:userId,
		name:name,
		roomid:roomId
	};

	reqdata.sign = crypto.md5(userId + name + roomId + config.ROOM_PRI_KEY);

	//게임봉사기가 실행중인가를 검사하고 그 성공여부에 따라 callback함수를 실행시키는 함수
	var checkRoomIsRuning = function(serverinfo, roomId, callback){
		var sign = crypto.md5(roomId + config.ROOM_PRI_KEY);

		http.get(serverinfo.ip, serverinfo.httpPort, "/is_room_runing", { roomid: roomId, sign:sign} ,function(ret, data){
			if(ret){
				if(data.errcode == 0 && data.runing == true){
					callback(true); //정상적으로 callback을 실행시킨다.
				}
				else{
					callback(false);
				}
			}
			else{
				callback(false);
			}
		});
	};

	//게임봉사기에 방에 들어가자고 요청하는 함수
	var enterRoomReq = function(serverinfo){
		http.get(serverinfo.ip, serverinfo.httpPort, "/enter_room", reqdata, function(ret,data){
			if(ret){
				if(data.errcode == 0){
						fnCallback(0,{
							ip:serverinfo.clientip,
							port:serverinfo.clientport,
							token:data.token
						});
				}
				else{
					logger.log(data.errmsg);
					fnCallback(data.errcode,null);
				}
			}
			else{
				fnCallback(-1,null);
			}
		});
	};

	var chooseServerAndEnter = function(serverinfo){
		serverinfo = chooseServer();

		if(serverinfo != null){
			enterRoomReq(serverinfo);
		}
		else{
			fnCallback(-1,null);					
		}
	};

	//자료기지에서 주어진 방번호에 대한 게임봉사기의 ip, port를 얻는다.
	db.get_room_addr(roomId, function(ret,ip,port){
		if(ret){
			//주어진 방번호에 대한 게임봉사기의 ip, port를 얻는데 성공했으면
			var id = ip + ":" + port;
			var serverinfo = serverMap[id];

			if(serverinfo != null){
				checkRoomIsRuning(serverinfo,roomId,function(isRuning){
					if(isRuning){
						enterRoomReq(serverinfo);
					}
					else{
						chooseServerAndEnter(serverinfo);
					}
				});
			}
			else{
				chooseServerAndEnter(serverinfo);
			}
		}
		else{
			//주어진 방번호에 대한 게임봉사기의 ip, port를 얻는데 실패했으면
			fnCallback(-2,null);
		}
	});
};

exports.isServerOnline = function(ip,port,callback){
	var id = ip + ":" + port;
	var serverInfo = serverMap[id];
	if(!serverInfo){
		callback(false);
		return;
	}
	var sign = crypto.md5(config.ROOM_PRI_KEY);
	http.get(serverInfo.ip,serverInfo.httpPort,"/ping",{sign:sign},function(ret,data){
		if(ret){
			callback(true);
		}
		else{
			callback(false);
		}
	});
};

exports.start = function($config){
	config = $config;
	app.listen(config.ROOM_PORT,config.FOR_ROOM_IP);
	logger.log("room service is listening on " + config.FOR_ROOM_IP + ":" + config.ROOM_PORT);
};