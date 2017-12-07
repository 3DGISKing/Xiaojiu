var db = require('../utils/db');
var assert = require('assert');
var gamemgr = require("./gamemgr");

var logger = require ("../utils/logger");

var rooms = {};
var creatingRooms = {};

var userLocation = {};
var totalRooms = 0;

function generateRoomId(){
	var roomId = "";

	for(var i = 0; i < 6; ++i){
		roomId += Math.floor(Math.random()*10);
	}

	return roomId;
}

//자료기지자료로부터 방을 생성한다.
function constructRoomFromDb(dbdata){
	var roomInfo = {
		uuid:dbdata.uuid,
		id:dbdata.id,
		numOfGames:dbdata.num_of_turns,
		createTime:dbdata.create_time,
		nextButton:dbdata.next_button,
		seats:new Array(6),
		observers:[],
		conf:JSON.parse(dbdata.base_info)
	};

	roomInfo.gameMgr = require("./gamemgr");

	var roomId = roomInfo.id;

	for(var i = 0; i < 6; ++i){
		var s = roomInfo.seats[i] = {};

		s.userId = dbdata["user_id" + i];
		s.score = dbdata["user_score" + i];
		s.name = dbdata["user_name" + i];
		s.ready = false;
		s.seatIndex = i;

		if(s.userId > 0){
			userLocation[s.userId] = {
				roomId:roomId,
				seatIndex:i
			};
		}
	}

	rooms[roomId] = roomInfo;
	totalRooms++;

	return roomInfo;
}

exports.getRooms = function () {
	return rooms;
};

exports.getCreatingRooms = function () {
	return creatingRooms;
};

exports.getUserLocations = function () {
	return userLocation;
};

exports.addObserver = function(roomId, userId){
    var roomInfo = rooms[roomId];

    if(roomInfo == null){
        logger.error('failed to get roomInfo of roomId: ' + roomId);
        return;
    }

    var observers = roomInfo.observers;

    var index = observers.indexOf(userId);

    if(index != -1) {
    	logger.error('failed to find observer index userId: ' + userId);
    	return;
	}

	roomInfo.observers.push(userId);

    userLocation[userId] = {
        roomId:roomId,
        seatIndex:-1
    };
};

exports.removeObserver = function(roomId, userId){
    var roomInfo = rooms[roomId];

    assert.notEqual(roomInfo, null);

    var observers = roomInfo.observers;

    var index = observers.indexOf(userId);

    assert.notEqual(index, null);

    roomInfo.observers.splice(index, 1);

    var location = userLocation[userId];

    if (location == null) {
    	logger.error("location is null. userId: " + userId);
        return;
    }

    assert.equal(location.seatIndex, -1);

    delete userLocation[userId];
};

exports.hasObserver = function(roomId, userId){
    var roomInfo = rooms[roomId];

    if(roomInfo == null){
        logger.error('failed to get roomInfo of roomId: ' + roomId);
        return;
    }

    var observers = roomInfo.observers;

    var index = observers.indexOf(userId);

	return index != -1;
};

exports.clearObservers = function(roomId){
    var roomInfo = rooms[roomId];

    if(roomInfo == null){
    	logger.error('failed to get roomInfo of roomId: ' + roomId);
        return;
    }

    roomInfo.observers = [];
};

exports.createRoom = function(creator,roomConf,gems,ip,port,callback){
	//check whether room is created

	// check the gems

	var cost = roomConf.fangfei;

	if(cost > gems){
		callback(2222,null);
		return;
	}

	var fnCreate = function(){
		var roomId = generateRoomId();

		if(rooms[roomId] != null || creatingRooms[roomId] != null){
			fnCreate();
		}
		else{
			creatingRooms[roomId] = true;
			db.is_room_exist(roomId, function(ret) {

				if(ret){
					delete creatingRooms[roomId];
					fnCreate();
				}
				else{
					var createTime = Math.ceil(Date.now()/1000);

					var roomInfo = {
						uuid:"",
						id:roomId,
						numOfGames:0,
						createTime:createTime,
						nextButton:-1,
						seats:[],
						observers:[],
						conf:{
							difenType: roomConf.difenType,  // 1: 积分制 2: 比例制
							shangzhuangDifen: roomConf.shangzhuangDifen, //단위 分
							jushuType: roomConf.jushuType,               // 1: 1人1庄 2: 1人2庄
							fangfeiType: roomConf.fangfeiType,            // 1: 局主支付 2: 每人支付
							fangfei: roomConf.fangfei,                    //단위 分
							tuoguan: roomConf.tuoguan,                    //boolean
						    creator:creator
						}
					};
					
					roomInfo.gameMgr = require("./gamemgr");

					for(var i = 0; i < 6; ++i){
						roomInfo.seats.push({
							userId:0,
							score:0,
							name:"",
							ready:false,
							seatIndex:i
						});
					}

					//写入数据库

					db.create_room(roomInfo.id,roomInfo.conf,ip,port,createTime,function(uuid){
						delete creatingRooms[roomId];

						if(uuid != null){
							roomInfo.uuid = uuid;

		                    logger.log('success to create room uuid: ' + uuid + 'roomId: ' + roomId, roomId);

							rooms[roomId] = roomInfo;
							totalRooms++;

							callback(0,roomId);
						}
						else{
							callback(3,null);
						}
					});
				}
			});
		}
	};

	fnCreate();
};

exports.destroy = function(roomId){
    logger.log("roommgr.destroy", roomId);

	var roomInfo = rooms[roomId];

	if(roomInfo == null){
        logger.log('error roomInfo is null. roomId: ' + roomId, roomId);
		return;
	}

	for(var i = 0; i < 6; ++i){
		var userId = roomInfo.seats[i].userId;

		if(userId > 0){
			delete userLocation[userId];

            logger.log('delete userLocation. userId: ' + userId, roomId);
			db.set_room_id_of_user(userId,null);
		}
	}

    for(i = 0; i < roomInfo.observers.length; ++i) {
        userId = roomInfo.observers[i];

        if (userId <= 0) {
        	continue;
		}

        delete userLocation[userId];

        logger.log('delete userLocation. userId: ' + userId, roomId);
    }

	delete rooms[roomId];

    logger.log('delete room. roomId: ' + roomId, roomId);

	totalRooms--;
	db.delete_room(roomId);
};

exports.getTotalRooms = function(){
	return totalRooms;
};

exports.getRoom = function(roomId){
	return rooms[roomId];
};

exports.isCreator = function(roomId,userId){
	var roomInfo = rooms[roomId];

	if(roomInfo == null){
		return false;
	}

	return roomInfo.conf.creator == userId;
};

exports.enterRoom = function(roomId,userId,userName,callback){
	var room = rooms[roomId];

	if(room){
		//success to find room
		callback(0);
	}
	else{
		db.get_room_data(roomId, function(dbdata){
			if(dbdata == null){
				//找不到房间
				callback(1); // can't find room
			}
			else{
				//construct room.
				room = constructRoomFromDb(dbdata);

				callback(0);
			}
		});
	}
};

exports.takeSeat = function(roomId, userId, userName) {
    var room = rooms[roomId];
    var icon = "";

    for(var i = 0; i < 6; ++i){
        var seat = room.seats[i];

        if(seat.userId <= 0){
            seat.userId = userId;
            seat.name = userName;

            userLocation[userId] = {
                roomId:roomId,
                seatIndex:i
            };

            db.update_seat_info(roomId,i,seat.userId,icon,seat.name);
            db.set_room_id_of_user(userId,roomId);

            logger.log("userId: " + userId + "(" + userName + ") take the seat seatIndex: " + seat.seatIndex, roomId);

            return true;
        }
    }

    logger.log("userId: " + userId + "(" + userName + ") does not take the seat", roomId);
    return false;	//room is full
};

exports.setReady = function(userId,value){
	var roomId = exports.getUserRoom(userId);

	if(roomId == null){
		return;
	}

	var room = exports.getRoom(roomId);

	if(room == null){
		return;
	}

	var seatIndex = exports.getUserSeat(userId);

	if(seatIndex == null){
		return;
	}

	var s = room.seats[seatIndex];
	s.ready = value;
};

exports.isReady = function(userId){
	var roomId = exports.getUserRoom(userId);

	if(roomId == null){
		return;
	}

	var room = exports.getRoom(roomId);

	if(room == null){
		return;
	}

	var seatIndex = exports.getUserSeat(userId);

	if(seatIndex == null){
		return;
	}

	var s = room.seats[seatIndex];

	return s.ready;	
};


exports.getUserRoom = function(userId){
	var location = userLocation[userId];

	if(location != null){
		return location.roomId;
	}

	return null;
};

exports.getUserSeat = function(userId){
	var location = userLocation[userId];

	if(location != null){
		return location.seatIndex;
	}

	return null;
};

exports.getUserLocations = function(){
	return userLocation;
};

exports.exitRoom = function(userId){
	var location = userLocation[userId];

	assert.notEqual(location, null, 'location could not be null. userId: ' + userId);

	var roomId = location.roomId;
	var seatIndex = location.seatIndex;

    if(seatIndex == -1){
        //for observer
        exports.removeObserver(roomId, userId);
        return;
    }

    //this user is not observer

	//first update roomId in database
    db.set_room_id_of_user(userId, null);

	delete userLocation[userId];

    var room = rooms[roomId];

    assert.notEqual(room, null, 'room could not be null. roomId: ' + roomId);
    assert.notEqual(seatIndex, null);
    assert(seatIndex >= 0);

	var seat = room.seats[seatIndex];

	assert(seat.seatIndex == seatIndex);

	//remove seat for user
	room.seats.splice(seatIndex, 1);

	//add new one empty seat
    room.seats.push({
        userId:0,
        score:0,
        name:"",
        ready:false,
        seatIndex:seatIndex
    });

    assert(room.seats.length == 6);

    //reassign seatIndex for all seats.
    for(var i = 0; i < 6; ++i) {
        seat =  room.seats[i];

        seat.seatIndex = i;

        userId = seat.userId;

        location = userLocation[userId];

        if (location!= null) {
        	location.seatIndex = i;
		}
    }
};

function isEmpty(roomInfo) {
	assert.notEqual(roomInfo, null);

    for(var i = 0; i < roomInfo.seats.length; ++i){
        var rs = roomInfo.seats[i];

        if(rs.userId > 0){
            return false;
        }
    }

    for(i = 0; i < roomInfo.observers.length; ++i) {
        if (roomInfo.observers[i] > 0 ) {
            return false;
        }
    }

    return true;
}

exports.destroyEmptyRooms = function() {
	var count = 0;

	for (var roomId in rooms) {
		var roomInfo = rooms[roomId];

		if(roomInfo == null){
			continue;
		}

		if(gamemgr.getGame(roomId) != null) {
			continue;
		}

		if(isEmpty(roomInfo)) {
			exports.destroy(roomInfo.id);

            db.clearUserRoomId(roomInfo.id);
			db.clearAvailableRoom(roomInfo.id);

			count++;
		}
	}

	return count;
};

