var crypto = require('../utils/crypto');
var db = require('../utils/db');

var tokenMgr = require('./tokenmgr');
var roomMgr = require('./roommgr');
var userMgr = require('./usermgr');
var assert = require('assert');
var gamemgr = require("./gamemgr");

var logger = require('../utils/logger');

var io = null;

exports.start = function(config){
	io = require('socket.io')(config.CLIENT_PORT);

	//게임봉사기와 player 와의 련결이 확립되였을 때
	io.sockets.on('connection',function(socket){

		//클라이언트가 방에 들어갈것을 요청할 때
		socket.on('request_enter_room', function(data){
			data = JSON.parse(data);

			if(socket.userId != null){
				//已经登陆过的就忽略
                logger.error('userId is not null!');
				return;
			}

			var token = data.token;
			var roomId = data.roomid;
			var time = data.time;
			var sign = data.sign;

            var userId = tokenMgr.getUserID(token);

            if(userId == null){
                logger.log('userId is null', roomId);
                socket.emit('enter_room_failed',{errcode:7, errmsg:"failed to get userId from token!"});
                return;
			}

            if (roomMgr.getUserRoom(userId) != null) {
            	var alreadyRoomId = roomMgr.getUserRoom(userId);

				if (roomId != alreadyRoomId) {
                    logger.log('roomId of userId: ' + userId + " is already determined " + alreadyRoomId, roomId);
                    socket.emit('enter_room_failed',{errcode:8, errmsg: "First of all, please leave room: " + alreadyRoomId});
					return;
				}
            }

			//파라메터의 유효성을 검사
			if(token == null || roomId == null || sign == null || time == null){
                logger.log('invalid parameter! token or roomId or sign or time is null!', roomId);
				socket.emit('enter_room_failed',{errcode:1, errmsg: "invalid parameters"});
				return;
			}
			
			//파라메터가 변경되였는지 검사
			var md5 = crypto.md5(roomId + token + time + config.ROOM_PRI_KEY);

			if(md5 != sign){
                logger.log('invalid sign!', roomId);
				socket.emit('enter_room_failed',{errcode:2,errmsg:"login failed. invalid sign!"});
				return;
			}
			
			//token 이 유효한지 검사.
			if(tokenMgr.isTokenValid(token)==false){
                logger.log('token out of time', roomId);
				socket.emit('enter_room_failed',{errcode:3,errmsg:"token out of time."});
				return;
			}

            logger.log('userId: ' + userId + ' sent ' + '"request_enter_room!" to server message', roomId);

			userMgr.bind(userId, socket);
			socket.userId = userId;

			//返回房间信息
			//통지할 자료준비
			var roomInfo = roomMgr.getRoom(roomId);

			if (roomInfo == null) {
                logger.error('roomInfo could not be null! roomId: ' + roomId);
                socket.emit('enter_room_failed',{errcode:4, errmsg:"roomInfo is null"});
				return;
			}

			if(roomInfo.numOfGames > 0 ) {
				if(roomInfo.gameMgr.getGame(roomId) == null){
                    socket.emit('enter_room_failed',{errcode:5, errmsg:"invalid room. game is null!"});
					return;
				}
			}

			var seatIndex = roomMgr.getUserSeat(userId);

			// 이미 자리가 있으면
			if (seatIndex != null && seatIndex != -1 ) {
                roomInfo.seats[seatIndex].ip = socket.handshake.address;
            }
            else{
				if (!roomMgr.hasObserver(roomId, userId)) {
                    roomMgr.addObserver(roomId, userId);
				}
			}

            socket.gameMgr = roomInfo.gameMgr;

			socket.gameMgr.sendRoomInfo(userId, roomInfo);

			if (socket.gameMgr.getGame(roomId) != null) {
                socket.gameMgr.sendGameInfo(userId, socket.gameMgr.getGame(roomId));
			}

			if (seatIndex != null && seatIndex != -1) {
                socket.gameMgr.notifyNewPlayer(userId, roomId);
            }

			//방에 들어갈 준비가 완료되였다고 통지
			socket.emit('enter_room_ready');

            logger.log('server sent "enter_room_ready" message to userId: ' + userId, roomId);

			//해산되는 방에 들어가는 경우
			if(roomInfo.dr != null){
				var dr = roomInfo.dr;
				var remainingTime = (dr.endTime - Date.now()) / 1000;

				data = {
					time:remainingTime,
					states:dr.states
				};

				userMgr.sendMsg(userId,'dissolve_notice_push', data);
			}
		});

		//클라이언트가 자리에 않겠다고 요청할 때
		socket.on('request_seat', function (data) {
            if(socket.userId == null){
                logger.error('userId is null!');
                return;
            }

            data = JSON.parse(data);

            //noinspection JSUnresolvedVariable
            var userName = data.userName;
            var roomId = data.roomId;
            var roomInfo = roomMgr.getRoom(roomId);

            if(roomInfo == null) {
            	logger.error('roomInfo could not be null! roomId: ' + roomId);
            	return;
			}

            logger.log('userId: ' + socket.userId + ' sent ' + '"request_seat" message to server!', roomId);

            //1: 局主支付 2: 每人支付
			if (roomInfo.conf.fangfeiType == 2 && socket.userId != roomInfo.conf.creator)
			{
                var gem = 0;
                var cost = roomInfo.conf.fangfei;

				db.get_gems_by_userid(socket.userId,function(data){
					if (data != null) {
						gem = data.gems;

						if(gem < cost) {
                            socket.emit('insufficient_gem');
						}
						else
						{
                            socket.gameMgr.takeSeat(roomId, socket.userId, userName);
						}
					}
					else{
						socket.emit('failed_get_gem');
					}
				});
			}
			else
			{
				assert(roomInfo.conf.fangfeiType == 1 || socket.userId == roomInfo.conf.creator, 'invalid condition, type:' + roomInfo.conf.fangfeiType + ' userId: ' + socket.userId);

                socket.gameMgr.takeSeat(roomId, socket.userId, userName);
			}
        });

		// when the creator of room click start button to start game.
		socket.on('start_game', function (data) {
            var roomId = roomMgr.getUserRoom(socket.userId);

            logger.info("socket.on('start_game')", roomId);

            if (roomId == null) {
                logger.error('userId: ' + socket.userId + "'s roomId +  is null!");
                return;
            }

            logger.info('userId: ' + socket.userId + ' sends ' + '"start_game" message to server!', roomId);

			socket.gameMgr.begin(data);
        });

        socket.on('dingdifen',function(data){
            if(socket.userId == null){
                logger.error('userId is null!');
                return;
            }

            var roomId = roomMgr.getUserRoom(socket.userId);

            if (roomId == null) {
                logger.error('userId: ' + socket.userId + "'s roomId +  is null!");
                return;
            }

            logger.info('userId: ' + socket.userId + ' sends ' + '"dingdifen" message to server!', roomId);

            //noinspection UnnecessaryLocalVariableJS
            var difen = data;

            socket.gameMgr.onDingDifen(socket.userId, difen);
        });

        //noinspection JSUnusedLocalSymbols
        socket.on('liangpai',function(data){
            if(socket.userId == null){
                logger.error('userId is null!');
                return;
            }

            var roomId = roomMgr.getUserRoom(socket.userId);

            if (roomId == null) {
                logger.error('userId: ' + socket.userId + "'s roomId +  is null!");
                return;
            }

            logger.info('userId: ' + socket.userId + ' sends ' + '"liangpai" message to server!', roomId);

            socket.gameMgr.onLiangPai(socket.userId);
        });

		//noinspection JSUnusedLocalSymbols
        socket.on('ready',function(data){
			var userId = socket.userId;

			if(userId == null){
                logger.error('userId is null!');
				return;
			}

            var roomId = roomMgr.getUserRoom(socket.userId);

            if (roomId == null) {
                logger.error('userId: ' + socket.userId + "'s roomId +  is null!");
                return;
            }

            logger.info('userId: ' + socket.userId + ' sends ' + '"ready" message to server!', roomId);

			socket.gameMgr.onUserReady(userId);
		});

        //noinspection JSUnusedLocalSymbols
        socket.on('baozhuang',function(data){
            var userId = socket.userId;

            if(userId == null){
                logger.error('userId is null!');
                return;
            }

            var roomId = roomMgr.getUserRoom(socket.userId);

            if (roomId == null) {
                logger.error('userId: ' + socket.userId + "'s roomId +  is null!");
                return;
            }

            logger.info('userId: ' + socket.userId + ' sends ' + '"baozhuang" message to server!', roomId);

            socket.gameMgr.onBaoZhuang(userId);
        });

        socket.on('xiazhuang',function(data){
            var userId = socket.userId;

            if(userId == null){
                logger.error('userId is null!');
                return;
            }

            var roomId = roomMgr.getUserRoom(socket.userId);

            if (roomId == null) {
                logger.error('userId: ' + socket.userId + "'s roomId +  is null!");
                return;
            }

            logger.info('userId: ' + socket.userId + ' sends ' + '"xiazhuang" message to server!', roomId);

            socket.gameMgr.onXiaZhuang(userId);
        });

		//聊天
		socket.on('chat',function(data){
			if(socket.userId == null){
				return;
			}

            var roomId = roomMgr.getUserRoom(socket.userId);

            if (roomId == null) {
                logger.error('userId: ' + socket.userId + "'s roomId +  is null!");
                return;
            }

            logger.info('userId: ' + socket.userId + ' sends ' + '"chat" message to server! data = ' + data, roomId);

			//noinspection UnnecessaryLocalVariableJS
            var chatContent = data;

			userMgr.broadcastInRoom('chat_push',{sender:socket.userId,content:chatContent},socket.userId,true);
		});
		
		//快速聊天
		socket.on('quick_chat',function(data){
			if(socket.userId == null){
                logger.error('userId is null!');
				return;
			}

            var roomId = roomMgr.getUserRoom(socket.userId);

            if (roomId == null) {
                logger.error('userId: ' + socket.userId + "'s roomId +  is null!");
                return;
            }

            logger.info('userId: ' + socket.userId + ' sends ' + '"quick_chat" message to server! data = ' + data, roomId);

			//noinspection UnnecessaryLocalVariableJS
            var chatId = data;

			userMgr.broadcastInRoom('quick_chat_push',{sender:socket.userId,content:chatId},socket.userId,true);
		});
		
		//语音聊天
		socket.on('voice_msg',function(data){
			if(socket.userId == null){
                logger.error('userId is null!');
				return;
			}

            var roomId = roomMgr.getUserRoom(socket.userId);

            if (roomId == null) {
                logger.error('userId: ' + socket.userId + "'s roomId +  is null!");
                return;
            }

            logger.info('userId: ' + socket.userId + ' sends ' + '"voice_msg" message to server!', roomId);

			userMgr.broadcastInRoom('voice_msg_push',{sender:socket.userId,content:data},socket.userId,true);
		});
		
		//表情
		socket.on('emoji',function(data){
			if(socket.userId == null){
                logger.error('userId is null!');
				return;
			}

			var roomId = roomMgr.getUserRoom(socket.userId);

			if (roomId == null) {
                logger.error('userId: ' + socket.userId + "'s roomId +  is null!");
                return;
			}

            logger.info('userId: ' + socket.userId + ' sends ' + '"emoji" message to server! data = ' + data, roomId);

			//noinspection UnnecessaryLocalVariableJS
            var phizId = data;

			userMgr.broadcastInRoom('emoji_push',{sender:socket.userId,content:phizId},socket.userId,true);
		});
		
		//退出房间
		socket.on('exit',function(data){
			var userId = socket.userId;

			if(userId == null){
				logger.error('userId is null!');
				return;
			}

			var roomId = roomMgr.getUserRoom(userId);

			if(roomId == null){
				logger.error('roomId is null!');
				return;
			}

            logger.info('userId: ' + socket.userId + ' sends ' + '"exit" message to server!', roomId);

			if(roomMgr.hasObserver(roomId, userId) == false) {
                //如果游戏已经开始，则不可以
                if(socket.gameMgr.hasBegan(roomId)){
                    logger.error('game is already began!');
                    return;
                }
			}

			//如果是房主，则只能走解散房间
			if(roomMgr.isCreator(userId)){
                logger.error('you are creator of room!');
				return;
			}
			
			//通知其它玩家，有人退出了房间
			userMgr.broadcastInRoom('exit_notify_push', userId, userId, false);
			
			roomMgr.exitRoom(userId);

            logger.info('delete userList. userId: ' + userId, roomId);
			userMgr.del(userId);
			
			socket.emit('exit_result');
			socket.disconnect();
		});
		
		//解散房间
		socket.on('dispress',function(data){
			var userId = socket.userId;

   			if(userId == null){
                logger.error('userId is null!');
				return;
			}

			var roomId = roomMgr.getUserRoom(userId);

			if(roomId == null){
                logger.error('roomId is null!');
				return;
			}

            logger.info('userId: ' + socket.userId + ' sends ' + '"dispress" message to server!', roomId);

			//如果游戏已经开始，则不可以
			if(socket.gameMgr.hasBegan(roomId)){
                logger.log('error game already began roomId: ' + roomId, roomId);
				return;
			}

			//如果不是房主，则不能解散房间
			if(roomMgr.isCreator(roomId,userId) == false){
                logger.log('you are not creator of room! userId: ' + userId, roomId);
				return;
			}

			userMgr.broadcastInRoom('dispress_push',{},userId,true);
			userMgr.kickAllInRoom(roomId);
			roomMgr.destroy(roomId);
			socket.disconnect();
		});

		/*
		  client sends this message to disssolve the game.

		*/
		socket.on('dissolve_request',function(data){
			var userId = socket.userId;

			if(userId == null){
				logger.error('userId is null!');
				return;
			}

			var roomId = roomMgr.getUserRoom(userId);

            logger.info('userId: ' + socket.userId + ' sends ' + '"dissolve_request" message to server!', roomId);

			if(roomId == null){
				logger.error('dissove_requested roomId is null!');
                logger.log('error dissove_requested roomId is null!', roomId);
				return;
			}

			//如果游戏未开始，则不可以
			if(socket.gameMgr.hasBegan(roomId) == false){
                logger.log('game has not began', roomId);
				return;
			}

			var ret = socket.gameMgr.dissolveRequest(roomId, userId);

			if(ret != null){
				var dr = ret.dr;
				var remainingTime = (dr.endTime - Date.now()) / 1000;

				data = {
					time:remainingTime,
					states:dr.states
				};

				userMgr.broadcastInRoom('dissolve_notice_push', data, userId, true);

                logger.log("broadcasting dissolve_notice_push", roomId);
			}
		});

		socket.on('dissolve_agree',function(data){
			var userId = socket.userId;

			if(userId == null){
                logger.error('userId is null!');
				return;
			}

			var roomId = roomMgr.getUserRoom(userId);

			if(roomId == null){
                logger.error('roomId is null!');
				return;
			}

            logger.log('userId: ' + socket.userId + ' sends ' + '"dissolve_agree" message to server!', roomId);

			var ret = socket.gameMgr.dissolveAgree(roomId,userId,true);

			if(ret != null){
				var dr = ret.dr;
				var ramainingTime = (dr.endTime - Date.now()) / 1000;

				data = {
					time:ramainingTime,
					states:dr.states
				};

				userMgr.broadcastInRoom('dissolve_notice_push',data,userId,true);

				if(socket.gameMgr.isAllPlayerDissoveAgree(roomId, data.states)){
					socket.gameMgr.doDissolve(roomId);					
				}
			}
		});

		socket.on('dissolve_reject',function(data){
			var userId = socket.userId;

			if(userId == null){
				logger.error('userId is null!');
				return;
			}

			var roomId = roomMgr.getUserRoom(userId);

            logger.log('userId: ' + socket.userId + ' sends ' + '"dissolve_reject" message to server!', roomId);

			if(roomId == null){
				logger.error('roomId is null');
				return;
			}

			var ret = socket.gameMgr.dissolveAgree(roomId,userId,false);

			if(ret != null){
				userMgr.broadcastInRoom('dissolve_cancel_push',{},userId,true);

                logger.log('dissolve_cancel_push', roomId);
			}
		});

		//断开链接
		socket.on('disconnect',function(data){
			var userId = socket.userId;

			if(!userId){
				logger.error('userId is null!');
				return;
			}

            var roomId = roomMgr.getUserRoom(userId);

            if(roomId != null){
                logger.log('userId: ' + socket.userId + ' sends ' + '"disconnect" message to server!', roomId);
                return;
            }

           	data = {
				userId:userId
			};

			//通知房间内其它玩家
			userMgr.broadcastInRoom('user_disconnected_push', data, userId);

			//清除玩家的在线信息

            logger.info('delete userList. userId: ' + userId, roomId);
			userMgr.del(userId);
			socket.userId = null;
		});
		
		socket.on('game_ping',function(data){
			var userId = socket.userId;

			if(!userId){
				return;
			}

			//logger.log('game_ping');
			socket.emit('game_pong');
		});

        socket.on('test_sync',function(data){
            var userId = socket.userId;

            if(userId == null){
                return;
            }

            socket.gameMgr.onTestSyn();
        });
	});

	logger.log("game server is listening on " + config.CLIENT_PORT);
};