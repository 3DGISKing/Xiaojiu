var crypto = require('../utils/crypto');
var express = require('express');
var db = require('../utils/db');
var http = require('../utils/http');
var roomMgr = require("./roommgr");
var userMgr = require("./usermgr");
var tokenMgr = require("./tokenmgr");
var gameMgr = require("./gamemgr");
var CircularJSON = require('circular-json');
var logger = require ("../utils/logger");

var app = express();
var config = null;

var serverIp = "";

//测试
app.all('*', function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "X-Requested-With");
	res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
	res.header("X-Powered-By",' 3.2.1');
	res.header("Content-Type", "application/json;charset=utf-8");
	next();
});

app.get('/get_server_info',function(req,res){
	var serverId = req.query.serverid;
	var sign = req.query.sign;

	if(serverId  != config.SERVER_ID || sign == null){
		http.send(res,1,"invalid parameters");
		return;
	}

	var md5 = crypto.md5(serverId + config.ROOM_PRI_KEY);

	if(md5 != sign){
		http.send(res,1,"sign check failed.");
		return;
	}

	var locations = roomMgr.getUserLocations();
	var arr = [];

	for(var userId in locations){
		var roomId = locations[userId].roomId;
		arr.push(userId);
		arr.push(roomId);
	}

	http.send(res,0,"ok",{userroominfo:arr});
});

app.get('/create_room',function(req,res){
	var userId = parseInt(req.query.userid);
	var sign = req.query.sign;
	var gems = req.query.gems;
	var conf = req.query.conf;

	if(userId == null || sign == null || conf == null){
		http.send(res,1,"invalid parameters");
		return;
	}

	var md5 = crypto.md5(userId + conf + gems + config.ROOM_PRI_KEY);

	if(md5 != req.query.sign){
		logger.log("invalid reuqest.");
		http.send(res,1,"sign check failed.");
		return;
	}

	conf = JSON.parse(conf);

	roomMgr.createRoom(userId,conf,gems,serverIp,config.CLIENT_PORT,function(errcode,roomId){
		if(errcode != 0 || roomId == null){
			http.send(res,errcode,"Failed to create room.");
		}
		else{
			http.send(res,0,"Successfully create room.",{roomid:roomId});
		}
	});
});

app.get('/enter_room',function(req,res){
	var userId = parseInt(req.query.userid);
	var name = req.query.name;
	var roomId = req.query.roomid;
	var sign = req.query.sign;

	if(userId == null || roomId == null || sign == null){
		http.send(res,1,"invalid parameters");
		return;
	}

	var md5 = crypto.md5(userId + name + roomId + config.ROOM_PRI_KEY);

	if(md5 != sign){
		http.send(res,2,"sign check failed.");
		return;
	}

	//安排玩家坐下
	roomMgr.enterRoom(roomId,userId,name,function(ret){
		if(ret != 0){
			if(ret == 1){
				http.send(res,4,"Failed to find room: " + roomId);
			}
			else{
				throw new Error('internal error');
			}
		}
		else {
			// db.insert_available_room(userId, roomId);
            var token = tokenMgr.createToken(userId,5000);
            http.send(res,0,"ok",{token:token});
		}
	});
});

app.get('/ping',function(req,res){
	var sign = req.query.sign;
	var md5 = crypto.md5(config.ROOM_PRI_KEY);

	if(md5 != sign){
		return;
	}

	http.send(res,0,"pong");
});

//hallServer 로부터 gameServer 가 실행중인가를 알아보는 요청이 올 때
app.get('/is_room_runing',function(req,res){
	var roomId = req.query.roomid;
	var sign = req.query.sign;

	if(roomId == null || sign == null){
		http.send(res, 1, "invalid parameters");
		return;
	}

	var md5 = crypto.md5(roomId + config.ROOM_PRI_KEY);

	if(md5 != sign){
		http.send(res,2,"sign check failed.");
		return;
	}
	
	//var roomInfo = roomMgr.getRoom(roomId);
	http.send(res, 0, "ok",{ runing:true } );
});

app.get('/get_users',function(req,res){
    var users = userMgr.getUserList();

    var users_array = [];

    for (var userId in users) {
        users_array.push(userId);
    }

    var data = JSON.stringify(users_array, null, 2);

    res.send(data);
});

app.get('/get_online_user_count',function(req,res){
    var count = userMgr.getOnlineCount();

    res.send({ count: count } );
});

app.get('/get_rooms',function(req,res){
    var rooms = roomMgr.getRooms();

    var rooms_array = [];

    for (var roomId in rooms) {
        rooms_array.push(rooms[roomId]);
    }

    var data = JSON.stringify(rooms_array, null, 2);

    res.send(data);
});

app.get('/get_total_room_count',function(req,res){
    var count = roomMgr.getTotalRooms();

    res.send({ count: count });
});

app.get('/get_games',function(req,res){
    var games = gameMgr.getGames();

    var array = [];
    for (var key in games) {
        array.push(games[key]);
    }

    var data = CircularJSON.stringify(array, null, 2);

    res.send(data);
});

app.get('/get_game_seats',function(req,res){
    var seats = gameMgr.getSeatsOfUsers();

    res.send(CircularJSON.stringify(seats, null, 2) );
});

app.get('/get_dissoving_list',function(req,res){
    var drs = gameMgr.getDissovingList();

    res.send( CircularJSON.stringify(drs, null, 2)  );
});

app.get('/dissolve_room',function(req,res){
    var roomId = req.query.roomid;

    gameMgr.doDissolve(roomId);

    res.send( "done");
});

app.get('/destroy_room',function(req,res){
    var roomId = req.query.roomid;

    roomMgr.destroy(roomId);

    res.send( "done" );
});

app.get("/destroy_empty_rooms", function (req, res) {

	var count = roomMgr.destroyEmptyRooms();

    http.send(res, 0, "ok", { count: count } );
});

var gameServerInfo = null;
var lastTickTime = 0;

//向大厅服定时心跳
function update(){
	if(lastTickTime + config.HTTP_TICK_TIME < Date.now()){
		lastTickTime = Date.now();
		gameServerInfo.load = roomMgr.getTotalRooms();

		http.get(config.HALL_IP,config.HALL_PORT,"/register_gs",gameServerInfo,function(ret,data){
			if(ret == true){
				if(data.errcode != 0){
					console.log(data.errmsg);
				}
				
				if(data.ip != null){
					serverIp = data.ip;
				}
			}
			else{
				//
				lastTickTime = 0;
			}
		});

		var mem = process.memoryUsage();

		var format = function(bytes) {  
              return (bytes/1024/1024).toFixed(2)+'MB';  
        };

		//logger.log('Process: heapTotal '+format(mem.heapTotal) + ' heapUsed ' + format(mem.heapUsed) + ' rss ' + format(mem.rss));
	}
}

exports.start = function($config){
	config = $config;

	gameServerInfo = {
		id:config.SERVER_ID,
		clientip:config.CLIENT_IP,
		clientport:config.CLIENT_PORT,
		httpPort:config.HTTP_PORT,
		load:roomMgr.getTotalRooms()
	};

	setInterval(update,1000);
	app.listen(config.HTTP_PORT,config.FOR_HALL_IP);
    logger.log("game server is listening on " + config.FOR_HALL_IP + ":" + config.HTTP_PORT);
};
