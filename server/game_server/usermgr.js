var roomMgr = require('./roommgr');
var gamemgr = require("./gamemgr");
var logger = require ("../utils/logger");

//userId를 key 로 하여 socket 목록을 관리한다.
var userList = {};
var userOnline = 0;

exports.bind = function(userId,socket){
    userList[userId] = socket;
    userOnline++;
};

exports.del = function(userId){
    delete userList[userId];
    userOnline--;
};

exports.get = function(userId){
    return userList[userId];
};

exports.getUserList = function(){
    return userList;
};

exports.isOnline = function(userId){
    var data = userList[userId];

    return data != null;
};

exports.isOffline = function (userId) {
    var data = userList[userId];

    return data == null;
};

exports.getOnlineCount = function(){
    return userOnline;
};

exports.sendMsg = function(userId, event, msgdata){
    var userInfo = userList[userId];

    if(userInfo == null){
        return;
    }

    var socket = userInfo;

    if(socket == null){
        return;
    }

    var roomId = roomMgr.getUserRoom(userId);

    if(roomId) {
        logger.log("server sent message " + event + ". data: " + JSON.stringify(msgdata) + " to userId: " + userId, roomId);
    }

    socket.emit(event,msgdata);
};

exports.kickAllInRoom = function(roomId){
    logger.log("kickAllInRoom", roomId);

    if(roomId == null){
        logger.error('roomId is null!');
        return;
    }

    var roomInfo = roomMgr.getRoom(roomId);

    if(roomInfo == null){
        logger.log('roomInfo is null. roomId: ' + roomId, roomId);
        return;
    }

    for(var i = 0; i < roomInfo.seats.length; ++i){
        var rs = roomInfo.seats[i];

        //如果不需要发给发送方，则跳过
        if(rs.userId > 0){
            socket = userList[rs.userId];

            if(socket != null){
                exports.del(rs.userId);
                socket.disconnect();
                logger.log("delete and disconnect userId: " + rs.userId, roomId);
            }
        }
    }

    for(i = 0; i < roomInfo.observers.length; ++i){
       var userId = roomInfo.observers[i];

        //如果不需要发给发送方，则跳过
        if(userId > 0){
            var socket = userList[userId];

            if(socket != null){
                exports.del(userId);
                socket.disconnect();
                logger.log("delete and disconnect userId: " + userId, roomId);
            }
        }
    }
};

//sender: 보내는 user 의 userId
exports.broadcastInRoom = function(event,data,sender,includingSender){
    var roomId = roomMgr.getUserRoom(sender);

    if(roomId == null){
        return;
    }

    var roomInfo = roomMgr.getRoom(roomId);

    if(roomInfo == null){
        return;
    }

    var socket = null;

    logger.log('userId: ' + sender + ' broadcasting ' + event + ' data: ' + JSON.stringify(data), roomId);

    //broadcast to players
    for(var i = 0; i < roomInfo.seats.length; ++i){
        var rs = roomInfo.seats[i];

        //如果不需要发给发送方，则跳过
        if(rs.userId == sender && includingSender != true){
            continue;
        }

        socket = userList[rs.userId];

        if(socket != null){
            socket.emit(event,data);
        }
    }

    //broadcast to observers

    for(i = 0; i < roomInfo.observers.length; ++i) {
        if (roomInfo.observers[i] == sender && includingSender != true) {
            continue;
        }

        socket = userList[roomInfo.observers[i]];

        if (socket != null) {
            socket.emit(event,data);
        }
        else {
            logger.log('Observer: ' + roomInfo.observers[i] + ' is not online so can not broadcast', roomId);
        }
    }
};

//sender: 보내는 user 의 userId
exports.broadcastPlayersInRoom = function(event,data,sender,includingSender){
    var roomId = roomMgr.getUserRoom(sender);

    if(roomId == null){
        return;
    }

    var roomInfo = roomMgr.getRoom(roomId);

    if(roomInfo == null){
        return;
    }

    var socket = null;

    //broadcast to players
    for(var i = 0; i < roomInfo.seats.length; ++i){
        var rs = roomInfo.seats[i];

        //如果不需要发给发送方，则跳过
        if(rs.userId == sender && includingSender != true){
            continue;
        }

        socket = userList[rs.userId];

        if(socket != null){
            socket.emit(event,data);
        }
    }
};

//sender: 보내는 user 의 userId
exports.broadcastObserversInRoom = function(event,data,sender,includingSender){
    var roomId = roomMgr.getUserRoom(sender);

    if(roomId == null){
        return;
    }

    var roomInfo = roomMgr.getRoom(roomId);

    if(roomInfo == null){
        return;
    }

    var socket = null;

    //broadcast to observers

    for( var i = 0; i < roomInfo.observers.length; ++i) {
        if (roomInfo.observers[i] == sender && includingSender != true) {
            continue;
        }

        socket = userList[roomInfo.observers[i]];

        if (socket != null) {
            socket.emit(event,data);
        }
        else {
            logger.log('Observer: ' + roomInfo.observers[i] + ' is not online so can not broadcast');
        }
    }
};