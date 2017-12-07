var roomMgr = require("./roommgr");
var userMgr = require("./usermgr");
var db = require("../utils/db");
var crypto = require("../utils/crypto");
var assert = require('assert');

var logger = require ("../utils/logger");
var games = {};
var gameSeatsOfUsers = {};
var dissolvingList = [];

var TOTAL_CARD_COUNT = 40;
var MAX_CARD_ID = 40;
var MIN_CARD_ID = 1;
var SEAT_COUNT = 6;
var PREPARE_TIME = 15; // in second

function getCardValue(cardId) {
    if(cardId < 1 || cardId > TOTAL_CARD_COUNT){
        logger.error('invalid cardId: ' + cardId);
        return 0;
    }

    var value = cardId % 10;

    if (value == 0)
        return 10;
    else
        return value;
}

//40개의 패짝을 우연적으로 발생시킨다.
//패섞기
//game.cards 40개의 요소를 가진 배렬
function shuffle(game) {
    var cards = game.cards;

    var index = 0;

    for(var i = MIN_CARD_ID; i <= MAX_CARD_ID; ++i){
        cards[index] = i;
            index++;
    }

    for( i = 0; i < cards.length; ++i){
        var lastIndex = cards.length - 1 - i;

        index = Math.floor(Math.random() * lastIndex);

        var t = cards[index];
        cards[index] = cards[lastIndex];
        cards[lastIndex] = t;
    }
}

//주어진 자리에 있는 player 에게 주패를 하나 준다.
function mopai(game, seatIndex) {
    if(game.currentIndex == TOTAL_CARD_COUNT)
        throw new Error('Failed to get one card! There is no more card!');

    var data = game.gameSeats[seatIndex];
    var cards = data.holds;

    var pai = game.cards[game.currentIndex];

    cards.push(pai);

    game.currentIndex ++;

    return pai;
}

//40개의 주패를 선수들에게 2장씩 나눈다.
function deal(game){
    //强制清0
    game.currentIndex = 0;

    //每人13张 一共 13*4 ＝ 52张 庄家多一张 53张
    var seatIndex = game.button;
    var playerCount = game.gameSeats.length;

    for ( var i = 0; i < playerCount; i++) {
        if(game.gameSeats[seatIndex].userId <= 0) {
            seatIndex++;
            continue;
        }

        var cards = game.gameSeats[seatIndex].holds;

        if(cards === null)
            throw new Error('cards could not be null!');

        if(cards.length !== 0 ) {
            logger.error('Length of cards could not be 0! length = ' + cards.length , game.roomInfo.id);
            throw new Error('Length of cards could not be 0! roomId = ' + game.roomInfo.id);
        }

        mopai(game, seatIndex);
        mopai(game, seatIndex);
        seatIndex++;

        seatIndex %= playerCount;
    }
}

//패를 나누어준다.
function doFapai (game) {
    //洗牌
    shuffle(game);
    //发牌
    deal(game);

    var seats = game.gameSeats;

    var roomId = game.roomInfo.id;

    for (var i = 0; i < seats.length; i++) {
        var seat = seats[i];

        if (seat.userId <= 0) {
            continue;
        }

        // for debug

        /*if (seat.seatIndex != game.button) {
            seat.holds = [9,9];
        }*/

        userMgr.sendMsg(seat.userId,'game_holds_push',game.gameSeats[i].holds);

        logger.log("game_holds_push. userId: " + seat.userId + " " + JSON.stringify(seat.holds), roomId);
    }

    userMgr.broadcastObserversInRoom('game_holds_push', null, getZhuangUserId(game));

    var zhuangSeatData = getZhuangSeatData(game);

    zhuangSeatData.fapaiCount = zhuangSeatData.fapaiCount + 1;
}

//홑패 2개에 대한 점수를 계산한다.
function calculateScoreForDianzi(cards) {
    if (cards == null)
        throw new Error('cards could not be null!');

    if (cards.length != 2)
        throw new Error('cards.length should be 2!');

    var value1 = getCardValue(cards[0]);
    var value2 = getCardValue(cards[1]);

    if (value1 == value2)
        return new Error('this is not dianzi!');

    var score = value1 + value2;

    if (score >= 10)
        score = score - 10;

    return score;
}

//같은패 2개에 대한 점수를 계산한다.
function calculateScoreForDuizi(cards) {
    if (cards == null)
        throw new Error('cards could not be null!');

    if (cards.length != 2)
        throw new Error('cards.length should be 2!');

    var value1 = getCardValue(cards[0]);
    var value2 = getCardValue(cards[1]);

    if (value1 != value2)
        return new Error('this is not duizi!');

    return value1;
}

//홑패인가를 검사한다.
function isDianzi(cards) {
    if (cards == null)
        throw new Error('cards could not be null!');

    if (cards.length != 2)
        throw new Error('cards.length should be 2!');

    var value1 = getCardValue(cards[0]);
    var value2 = getCardValue(cards[1]);

    return value1 != value2 ;
}

//같은 패 2개인가를 검사한다.
function isDuizi(cards) {
    if (cards == null)
        throw new Error('cards could not be null!');

    if (cards.length != 2)
        throw new Error('cards.length should be 2!');

    var value1 = getCardValue(cards[0]);
    var value2 = getCardValue(cards[1]);

    return value1 == value2;
}

//만일 A가 이기면 true 아니면 false
function compare(seatDataA, seatDataB){
    var cardsA = seatDataA.holds;

    assert.notEqual(cardsA, null, 'cardsA could not be null!');
    assert(cardsA.length == 2, 'cardsA.length should be 2!');

    var cardsB = seatDataB.holds;

    assert.notEqual(cardsB, null, 'cardsB could not be null!');
    assert(cardsB.length == 2, 'cardsB.length should be 2!');

    var game = seatDataA.game;
    var scoreA = 0, scoreB= 0;

    //둘중의 하나는 선이다.
    assert(seatDataA.seatIndex == game.button || seatDataB.seatIndex == game.button, 'Either of two should be zhuang!');

    //둘다 선일수는 없다.
    if (seatDataA.seatIndex == game.button && seatDataB.seatIndex == game.button)
        throw new Error('Either of two should be zhuang!');

    if (isDianzi(cardsA) && isDianzi(cardsB)){
        //둘다 홑패인 경우

        scoreA = calculateScoreForDianzi(cardsA);
        scoreB = calculateScoreForDianzi(cardsB);

        if (scoreA > scoreB)
            return true;
        else if (scoreA < scoreB)
            return false;
        else {

            //점수가 같은 경우 선이 이긴다.
            return seatDataA.seatIndex == game.button;
        }
    }
    //둘다 같은 패인 경우
    else if (isDuizi(cardsA) && isDuizi(cardsB)){
        scoreA = calculateScoreForDuizi(cardsA);
        scoreB = calculateScoreForDuizi(cardsB);

        if (scoreA > scoreB)
            return true;
        else if (scoreA < scoreB)
            return false;
        else {
            //점수가 같은 경우 선이 이긴다.
            return seatDataA.seatIndex == game.button;
        }
    }
    else if (isDuizi(cardsA) && isDianzi(cardsB))
            return true;
    else if (isDuizi(cardsB) && isDianzi(cardsA))
        return false;
    else {
        throw new Error('this case should not exist!');
    }
}

function getZhuangSeatData(game) {
    return game.gameSeats[game.button];
}

function getZhuangUserId(game) {
    return game.gameSeats[game.button].userId;
}

function getPlayerDifen(game, seatIndex) {
    return game.gameSeats[seatIndex].difen;
}

//우연적으로 선을 결정한다.
function determineRandomZhuang(game) {
    var onlineUserCount = 0;
    var userId = 0;

    var playerCount = game.gameSeats.length;

    for ( var i = 0; i < playerCount; i++) {
        var seatData = game.gameSeats[i];

        userId = seatData.userId;

        if(userId > 0) {
            if (userMgr.isOnline(userId)) {
                onlineUserCount++;
            }
        }
    }

    logger.log("onlineUserCount: " + onlineUserCount, game.roomInfo.id);

    var seatIndex = Math.floor(Math.random() * 6);

    userId = game.gameSeats[seatIndex].userId;

    while (userId <= 0) {
        seatIndex = Math.floor(Math.random() * 6);
        userId = game.gameSeats[seatIndex].userId;
    }

    game.button = seatIndex;
}

function validSeatCount(game) {
    var count = 0;
    var userId = 0;

    for ( var i = 0; i < game.gameSeats.length; i++) {
        var seatData = game.gameSeats[i];

        userId = seatData.userId;

        if(userId > 0) {
            count++;
        }
    }

    return count;
}

//다음 자리번호를 돌린다.
function getNextSeatIndex(game, seatIndex) {
   var temp = seatIndex + 1;

    var seatCount = validSeatCount(game);

    return temp % seatCount;
}

function isYirenYiZhunag(game) {
    return game.conf.jushuType == 1;
}

function isYirenErZhunag(game) {
    return game.conf.jushuType == 2;
}

function isFapaiedSeat(seatData) {
    return seatData.holds.length == 2;
}

function isZhuangSeat(game, seatData) {
    return game.button == seatData.seatIndex;
}

function isFapaiedSeatIndex(game, seatIndex) {
    var seatData = game.gameSeats[seatIndex];

    return isFapaiedSeat(seatData);
}

function isZhuangSeatIndex(game, seatIndex) {
    var seatData = game.gameSeats[seatIndex];

    return isZhuangSeat(game, seatData);
}

function isAllPlayerReady(game) {
    var seatCount = game.gameSeats.length;

    for ( var i = 0; i < seatCount; i++) {
        var seatData = game.gameSeats[i];

        var userId = seatData.userId;

        if (userId <= 0 ){
            continue;
        }

        if(seatData.ready == false){
            return false;
        }
    }

    return true;
}

function  isAllXianPlayerDetermineDifen(game) {
    var seatCount = game.gameSeats.length;

    for ( var i = 0; i < seatCount; i++) {
        var seatData = game.gameSeats[i];

        if (isZhuangSeat(game, seatData)) {
            continue;
        }

        var userId = seatData.userId;

        if (userId <= 0 ){
            continue;
        }

        if(seatData.difen < 0){
            return false;
        }
    }

    return true;
}

//모두 패를 뒤집었는가?
function  isAllPlayerLiangpai(game) {
    var seatCount = game.gameSeats.length;

    for ( var i = 0; i < seatCount; i++) {
        var seatData = game.gameSeats[i];

        if (!isFapaiedSeat(seatData)){
            continue;
        }

        var userId = seatData.userId;

        if (userId <= 0 ){
            continue;
        }

        if(!seatData.liangPai ){
            return false;
        }
    }

    return true;
}

// fapai 후 모두와 비교했는가?
function isAllPlayerBipai(game) {
    var playerCount = game.gameSeats.length;

    for ( var i = 0; i < playerCount; i++) {
        var seatData = game.gameSeats[i];

        if (!isFapaiedSeat(seatData)){
            continue;
        }

        if (isZhuangSeat(game, seatData)) {
            continue;
        }

        var userId = seatData.userId;

        if (userId <= 0 ){
            continue;
        }

        if(!seatData.bipai){
            return false;
        }
    }

    return true;
}

//game over 할수 있는가?
function isMeetGameOverCondition(game) {
    //선이 한바퀴 돌았으면 즉 모든 사람이 다 선을 한번씩 했으면
    if(game.zhuangRoundCount == 1 && isYirenYiZhunag(game)) {
        return true;
    }
    //선이 두바퀴 돌았으면 즉 모든 사람이 다 선을 두번씩 했으면
    else {
        return game.zhuangRoundCount == 2 && isYirenErZhunag(game);
    }
}

function currentZhuangFapaiCount(game) {
    var seatData = game.gameSeats[game.button];

    return seatData.fapaiCount;
}

//bipai 이후의 게임로직
function continueGameLogicAfterBipai(game) {
    var userId = getZhuangUserId(game);

    if (game.difen == 0) {
        storeCurrentJuHistory(game);

        if (isMeetGameOverCondition(game)) {
            setTimeout(function () {
                doGameOver(game, userId);
            }, 1000);

            return;
        }

        //선을 넘긴다.
        moveToNextZhuang(game);

        var data = {
            button: game.button,
            turn: game.turn,
            difen: 0
        };

        userMgr.broadcastInRoom('game_change_zhuang_push', data, userId, true);

        clearAllOptions(game);

        game.state = 'ready';

        setTimeout(function () {
            userMgr.broadcastInRoom('game_request_ready_push', null, userId, true);
            setAutoOperationFireTimeForGame(game);
        }, 2000);
    }
    else {
        if (isAllPlayerBipai(game)) {
            storeCurrentJuHistory(game);

            clearAllOptions(game);

            userMgr.broadcastInRoom('game_bipai_finish_push', null, userId, true);

            //fast debug option
            if (currentZhuangFapaiCount(game) >= 3 ) {
           // if (currentZhuangFapaiCount(game) >= 1 ) {
                //선단을 계속 하겠는가?

                game.state = 'ask_keep_zhuang';

                setTimeout(function () {
                    userMgr.broadcastInRoom('game_ask_keep_zhuang_push', null, userId, true);

                    var seatData = getZhuangSeatData(game);
                    setAutoOperationFireTimeForSeat(seatData);
                }, 1600);
            }
            else {
               //판이 바뀔 때마다 비교순서를 시계바늘 반대방향으로 하나 + 1
               moveToNextBipaiTurn(game);

               // 새로운 판에 준비하라고 통지한다.
               game.state = 'ready';

               setTimeout(function () {
                   userMgr.broadcastInRoom('game_request_ready_push', null, userId, true);
                   setAutoOperationFireTimeForGame(game);
               }, 1600);
            }
        }
        else {
            // 비교를 계속한다.
            // 다음 비교대상
            var seatIndex = getNextSeatIndex(game, game.turn);

            while (isZhuangSeatIndex(game, seatIndex) == true ||
                   isFapaiedSeatIndex(game, seatIndex) == false) {
                seatIndex = getNextSeatIndex(game, seatIndex);
            }

            game.turn = seatIndex;

            setTimeout(
                function(){
                    userMgr.broadcastInRoom('game_start_bifai_push', game.turn, userId, true);

                    var currentBipaiTurnUserId = game.gameSeats[game.turn].userId;

                    exports.onRequestBipai(currentBipaiTurnUserId)
                }, 1600);
        }
    }
}

function clearAllOptions(game,seatData){
    var fnClear = function(sd){
        sd.difen = -1;
        sd.ready = false;
        sd.liangPai = false;
        sd.bipai = false;
    };

    if(seatData){
        fnClear(seatData);
    }
    else{
        for(var i = 0; i < game.gameSeats.length; ++i){
            fnClear(game.gameSeats[i]);
        }
    }
}

function storeCurrentJuHistory(game) {
    var roomInfo = game.roomInfo;

    var playersData = [];

    for (var i =0; i < validSeatCount(game); i++){
        var rs = roomInfo.seats[i];

        var seatData = game.gameSeats[i];

        var score = seatData.score;

        if (seatData.seatIndex == game.button)
        {
            score += game.difen;
        }

        var playerData = {
            name: crypto.toBase64(rs.name),
            cards: seatData.holds,
            score: score,
            isZhuang: seatData.seatIndex == game.button
        };

        playersData.push(playerData);
    }

    var history = {
        round: game.roomInfo.numOfGames,
        players: playersData
    };

    game.juHistory.push(history);
}

function moveToNextZhuang(game) {
    var seatData = getZhuangSeatData(game);

    seatData.fapaiCount = 0;

    game.button = getNextSeatIndex(game, game.button);
    game.turn = getNextSeatIndex(game, game.button);
    game.startBipaiSeatIndex  = game.turn;

    //선이 한바퀴 돌았는가?
    if (getNextSeatIndex(game, game.button) == game.startZhuangSeatIndex ) {
        game.zhuangRoundCount = game.zhuangRoundCount + 1;
    }
}

function moveToNextBipaiTurn(game) {
    game.turn = getNextSeatIndex(game, game.startBipaiSeatIndex);

    if (game.turn == game.button) {
        game.turn = getNextSeatIndex(game, game.button);
    }

    game.startBipaiSeatIndex = game.turn;
}

function doGameOver(game, userId){
    if (game == null) {
        logger.error('game is null!');
        return;
    }

    var roomId = roomMgr.getUserRoom(userId);

    if (roomId == null ) {
        logger.error('roomId is null. userId: ' + userId);
        return;
    }

    var roomInfo = roomMgr.getRoom(roomId);

    if (roomInfo == null) {
        logger.error('error: roomInfo is null! roomId: ' + roomId, roomId);
        return;
    }

    logger.log("doGameOver", roomId);

    var results = [];
    var dbresult = [0,0,0,0,0,0];

   for(var i = 0; i < roomInfo.seats.length; ++i){
        var sd = game.gameSeats[i];
        var rs = roomInfo.seats[i];

        rs.score = sd.score;

        var userRT = {
            userId:sd.userId,
            score:sd.score,
            totalscore:sd.score
        };

        results.push(userRT);

        dbresult[i] = sd.score;

        if(sd.userId > 0) {
            logger.log('delete gameSeatsOfUsers. userId: ' + sd.userId, roomId);
            delete gameSeatsOfUsers[sd.userId];
        }
    }

    roomInfo.juHistory = game.juHistory;

    delete games[roomId];

    logger.log('delete game. roomId: ' + roomId, roomId);

    db.create_game(game.roomInfo.uuid, game.gameIndex, JSON.stringify(game.conf), roomInfo.createTime, JSON.stringify(dbresult), roomInfo.id, roomInfo.numOfGames);

    userMgr.broadcastInRoom('game_over_push',{results:results}, userId, true);

    logger.log("game_over_push", roomId);

    setTimeout(function(){
        if(roomInfo.numOfGames > 1){
            store_history(roomInfo);
        }

        userMgr.kickAllInRoom(roomId);
        roomMgr.destroy(roomId);
    },1500);
}

function store_single_history(userId,history){
    db.get_user_history(userId,function(data){
        if(data == null){
            data = [];
        }

        while(data.length >= 10){
            data.shift();
        }

        data.push(history);
        db.update_user_history(userId,data);
    });
}

function store_history(roomInfo){
    var seats = roomInfo.seats;

    var history = {
        uuid:roomInfo.uuid,
        id:roomInfo.id,
        time:roomInfo.createTime,
        seats:new Array(6),
        details: roomInfo.juHistory
    };

    for(var i = 0; i < seats.length; ++i){
        var rs = seats[i];
        var hs = history.seats[i] = {};

        hs.userId = rs.userId;
        hs.name = crypto.toBase64(rs.name);
        hs.score = rs.score;
    }

    for( i = 0; i < seats.length; ++i){
        var s = seats[i];

        if (s.userId <= 0) {
            continue;
        }

        logger.log("store_single_history userId: " + s.userId, roomInfo.id);
        store_single_history(s.userId, history);
    }
}

//requirement
// game is already started and at least one ju have done.
// all user have sufficient gem for cost.
function decrease_users_gem(game) {
    var roomInfo = game.roomInfo;

    var cost = roomInfo.conf.fangfei;

    //1: 局主支付 2: 每人支付
    if (roomInfo.conf.fangfeiType == 2) {
        for (var i = 0; i < game.gameSeats.length; i++) {
            var seat = game.gameSeats[i];

            if (seat.updateGem){
                continue
            }

            var userId = game.gameSeats[i].userId;

            if (userId > 0) {
                db.cost_gems(userId, cost, game.roomInfo.id);

                seat.updateGem = true;
            }
        }
    }
    else if (roomInfo.conf.fangfeiType == 1){
        if (game.updateGem == null) {
            db.cost_gems(roomInfo.conf.creator, cost, game.roomInfo.id);
            game.updateGem = true;
        }
    }
}

exports.getGames = function () {
    return games;
};

exports.getSeatsOfUsers = function () {
    return gameSeatsOfUsers;
};

exports.getSeatOfUser = function (userId) {
    return gameSeatsOfUsers[userId];
};

exports.getDissovingList = function () {
    return  dissolvingList
};

exports.getGame = function(roomId) {
    return games[roomId];
};

//observer 로 있다가 game 에 참가한다.
function joinToGame(game, observerUserId) {
    assert.notEqual(game, null);

    var seatIndex = roomMgr.getUserSeat(observerUserId);

    assert.notEqual(seatIndex, null, 'failed to get seatIndex for observer userId: ' + observerUserId );
    assert(seatIndex < SEAT_COUNT, 'invalid seatIndex: ' + seatIndex);

    var seatData = game.gameSeats[seatIndex];

    seatData.game = game;

    seatData.seatIndex = seatIndex;
    seatData.userId = observerUserId;

    seatData.holds = [];   //손에 든 주패장
    seatData.difen = -1;    //판돈
    seatData.score = 0;    //점수
    seatData.liangPai = false; //패를 뒤집었는가?
    seatData.bipai = false;
    seatData.fapaiCount = 0; //선에 올라서 몇번 fapai 했는가(경기를 운영했는가)?

    gameSeatsOfUsers[observerUserId] = seatData;

    logger.log("joinToGame userId: " + observerUserId, game.roomInfo.id);

    if (game.state == 'dingdifen' || game.state == 'ready') {
        logger.log("setAutoOperationFireTimeForSeat userId: " + observerUserId, game.roomInfo.id);
        setAutoOperationFireTimeForSeat(seatData);
    }
}

//자리를 차지한다.
exports.takeSeat = function(roomId, userId, userName) {
    var roomInfo = roomMgr.getRoom(roomId);

    assert.notEqual(roomInfo, null);

    if (roomMgr.hasObserver(roomId, userId)) {
        roomMgr.removeObserver(roomId, userId);
    }

    var ret = roomMgr.takeSeat(roomId, userId, userName);

    if (ret == false) {
        userMgr.sendMsg(userId, 'room_full_push');
        return;
    }

    var seatIndex = roomMgr.getUserSeat(userId);

    assert.notEqual(seatIndex, null);

    userMgr.sendMsg(userId, 'seat_ready_push', seatIndex);

    var userData = roomInfo.seats[seatIndex];

    userData.userId = userId;
    userData.name = userName;

    if (userMgr.get(userId)) {
        userData.ip = userMgr.get(userId).handshake.address;
    }
    else
    {
        logger.error('failed to get socket for userId: ' + userId);
    }


    roomMgr.setReady(userId, true);

    var game = games[roomId];

    if(game != null) {
        joinToGame(game, userId);
    }

    userMgr.broadcastInRoom('new_user_comes_push', userData, userId);
};

// 게임을 시작한다.
exports.begin = function(roomId) {
    var roomInfo = roomMgr.getRoom(roomId);

    assert.notEqual(roomInfo, null, 'Failed to get roomInfo for following roomId: ' + roomId );

    var seats = roomInfo.seats;
    var seatCount = seats.length;

    var game = {
        roomInfo:roomInfo,                   //게임이 진행되고있는 방의 정보
        conf:roomInfo.conf,                  //게임의 설정
        gameIndex:roomInfo.numOfGames,       //게임의 회전수
        gameSeats:new Array(seatCount),      //player 자료
        cards: new Array(TOTAL_CARD_COUNT),  //패
        currentIndex:0,                      //현재 패
        turn:-1,                             //차례
        fistBipaiSeatIndex:-1,               //한개 판에서 첫 bipai seatIndex
        lastBipaiSeatIndex:-1,               //한개 판에서 마지막 bipai seatIndex
        state:"idle",                        //게임의 상태
        button: -1,                          //선단
        //경기를 시작할 때 zhuang 의 자리
        startZhuangSeatIndex: -1,

        //한 round 에서 bipai 를 시작한 첫사람의 seatIndex
        startBipaiSeatIndex: -1,

        //모든 사람들이 zhunag 을 한번씩 않았댔으면 1
        //모든 사람들이 zhunag 을 2번씩 않았댔으면 2
        zhuangRoundCount:0,

        difen:0,                           //게임의 판돈
        juHistory: [] //매 국의 history
    };

    //국수 증가
    roomInfo.numOfGames++;

    db.update_num_of_turns(roomId, roomInfo.numOfGames);

    for(var i = 0; i < seatCount; ++i){
        var data = game.gameSeats[i] = {};

        data.game = game;

        data.seatIndex = i;
        data.userId = seats[i].userId;

        data.holds = [];   //손에 든 주패장
        data.difen = -1;   //판돈
        data.score = 0;    //점수
        data.liangPai = false; //패를 뒤집었는가?
        data.bipai = false; //비교를 했는가?
        data.fapaiCount = 0; //선에 올라서 몇번 fapai 했는가(경기를 운영했는가)?
        gameSeatsOfUsers[data.userId] = data;
    }

    games[roomId] = game;

    determineRandomZhuang(game);

    game.startZhuangSeatIndex = game.button;
    game.turn = getNextSeatIndex(game, game.button);
    game.startBipaiSeatIndex = game.turn;

    //현재 게임의 상태는 판돈을 대는 상태이다.
    game.state = "dingdifen";

    var userId = getZhuangUserId(game);

    userMgr.broadcastInRoom('game_begin_push', game.button, userId, true);
    logger.log("----- game_begin_push zhuangUserId = "  + userId, roomId);

    userMgr.broadcastInRoom('game_num_push', roomInfo.numOfGames, userId, true);
    logger.log("game_num_push numOfGames=" + roomInfo.numOfGames, roomId);

    setTimeout(function(){
        userMgr.broadcastInRoom('game_dingdifen_push', null, userId, true);
        logger.log("game_dingdifen_push", roomId);

        setAutoOperationFireTimeForGame(game);
        logger.log("setAutoOperationFireTimeForGame", roomId);
    },2000);
};

exports.notifyNewPlayer = function (userId, roomId) {
    var seatIndex = roomMgr.getUserSeat(userId);

    assert.notEqual(seatIndex,null);

    var roomInfo = roomMgr.getRoom(roomId);

    assert.notEqual(roomInfo, null);

    var seatData = roomInfo.seats[seatIndex];

    var data = {
        userId:seatData.userId,
        ip:seatData.ip,
        name:seatData.name,
        seatIndex:seatIndex
    };

    roomMgr.setReady(userId, true);

    userMgr.broadcastInRoom('new_user_comes_push', data, userId);
};

function setUserReady(userId){
    var seatData = gameSeatsOfUsers[userId];

    if(seatData == null) {
        logger.error('can not find seatData for following userId: ' + userId);
        return;
    }

    seatData.ready = true;
}

exports.sendRoomInfo = function(userId, roomInfo) {
    var seats = [];

    for(var i = 0; i < roomInfo.seats.length; ++i){
        var rs = roomInfo.seats[i];
        var online = false;

        if(rs.userId > 0){
            online = userMgr.isOnline(rs.userId);
        }

        seats.push({
            userId:rs.userId,
            ip:rs.ip,
            score:rs.score,
            name:rs.name,
            online:online,
            ready:rs.ready,
            seatIndex:i,
            difen: -1
        });

    }

    //通知前端
    var data = {
        errcode:0,
        errmsg:"ok",
        data:{
            roomId:roomInfo.id,
            conf:roomInfo.conf,
            numOfGames:roomInfo.numOfGames,
            seats:seats
        }
    };

    userMgr.sendMsg(userId, 'room_data_ready', data);
};

exports.sendGameInfo = function(userId, game) {
    assert.notEqual(userId, null);
    assert.notEqual(game, null);
    assert.notEqual(userMgr.get(userId), null);

    var data = {
        state:game.state,
        button:game.button,
        turn:game.turn,
        firstBipaiSeatIndex: game.firstBipaiSeatIndex,
        lastBipaiSeatIndex: game.lastBipaiSeatIndex,
        difen:game.difen
    };

    logger.log("---------------------------", game.roomInfo.id);
    logger.log("            game data = " + JSON.stringify(data), game.roomInfo.id);
    logger.log("---------------------------", game.roomInfo.id);

    data.seats = [];

    for( var i = 0; i < game.gameSeats.length; ++i){
        var sd = game.gameSeats[i];

        var s = {
            userId:sd.userId,
            holds:sd.holds,
            difen:sd.difen,
            score:sd.score,
            liangPai:sd.liangPai,
            bipai:sd.bipai,
            ready: sd.ready,
            autoOperationFireTime: sd.autoOperationFireTime
        };

        data.seats.push(s);
    }

    userMgr.sendMsg(userId,'game_sync_push',data);
};

// 방에 들어가서 경기를 할 준비를 한다.
exports.setReady = function(userId){
    var roomId = roomMgr.getUserRoom(userId);

    if(roomId === null) {
        logger.error('can not find roomId for following userId: ' + userId);
        return;
    }

    var roomInfo = roomMgr.getRoom(roomId);

    if(roomInfo === null) {
        logger.error('can not find roomInfo for following roomId: ' + roomId);
        return;
    }

    roomMgr.setReady(userId, true); //이 user 는 준비되였다.

    var game = games[roomId];

    if(game == null) //게임을 새로 시작하는 경우
        return;

    //이미 게임을 시작하였다가 다시 들어오는 경우 게임의 상태를 복귀한다.

    var data = {
        state:game.state,
        button:game.button,
        turn:game.turn
    };

    data.seats = [];

    for( var i = 0; i < game.gameSeats.length; ++i){
        var sd = game.gameSeats[i];

        var s = {
            userId:sd.userId,
            difen:sd.difen, //판돈
            holds:sd.holds,
            score:sd.score,
            liangPai:sd.liangPai
        };

        data.seats.push(s);
    }

    //同步整个信息给客户端
    userMgr.sendMsg(userId,'game_sync_push',data);
};

//클라이언트에서 판돈정보를 보냈을 때 실행되는 처리부
exports.onDingDifen = function(userId, difen){
    var seatData = gameSeatsOfUsers[userId];

    if(seatData == null){
        logger.error("failed to get seatData of userId: " + userId);
		logger.log(gameSeatsOfUsers);
        return;
    }

    difen = parseInt(difen);

    var game = seatData.game;

    if(game.state != "dingdifen") {
        logger.error("userId:" + userId + " can't receive dingdifen when game.state == " + game.state, game.roomInfo.id);
        return;
    }

    if (seatData.difen != -1) {
        logger.error('difen of userId: ' + userId + ' is already determined! difen = ' + seatData.difen, game.roomInfo.id);
        return;
    }

    seatData.autoOperationFireTime = -1;

    seatData.difen = difen;

    if (seatData.seatIndex == game.button) {
        seatData.score = seatData.score - difen;
        game.difen = difen;

        logger.log("userId: " + userId + " determined game.difen:" + game.difen, game.roomInfo.id);
    }
    else{
        logger.log("userId: " + userId + " determined difen:" + difen, game.roomInfo.id);
    }

    //检查玩家可以做的动作
    //如果4个人都定缺了，通知庄家出牌

    var data = {
        userId: userId,
        difen: difen,
        score: seatData.score
    };

    userMgr.broadcastInRoom('game_dingdifen_notify_push', data, seatData.userId, true);

    logger.log("game_dingdifen_notify_push", game.roomInfo.id);

    //장과 한이 모두 판돈을 걸었을 때
    if(game.difen > 0 && isAllXianPlayerDetermineDifen(game)){
        userMgr.broadcastInRoom('game_dingdifen_finish_push', null, seatData.userId, true);
        logger.log("game_dingdifen_finish_push", game.roomInfo.id);

        setTimeout(function () {
            game.state = "fapai";
            logger.log("fapai started!", game.roomInfo.id);
            doFapai(game);

            game.state = "liangpai";

            userMgr.broadcastInRoom('game_liangpai_started_push', null, seatData.userId, true);

            logger.log("game_liangpai_started_push", game.roomInfo.id);

            setAutoOperationFireTimeForGame(game);
            logger.log("setAutoOperationFireTimeForGame", game.roomInfo.id);
        }, 1000);
    }
};

//클라이언트가 패를 뒤집었을 때
exports.onLiangPai = function(userId){
    var seatData = gameSeatsOfUsers[userId];

    if(seatData == null)
    {
        logger.error('failed to get seatData of userId: ' + userId);
        return;
    }

    var game = seatData.game;
    var roomId = game.roomInfo.id;

    logger.log("onLiangPai userId: " + userId, roomId);

    if(game.state != "liangpai") {
        logger.log("userId: " + userId + " can't receive liangpai when game.state == " + game.state, roomId);
        return;
    }

    if (seatData.liangPai == true) {
        logger.log('userId: ' + userId + ' already liangpaied!', roomId);
        return;
    }

    seatData.autoOperationFireTime = -1;

    seatData.liangPai = true;

    if (seatData.holds.length != 2) {
        logger.error('bug detected in onLiangPai holds.length = ' + seatData.holds.length + ' userId: ' + seatData.userId, roomId); // 패를 받지 못하고 경기에 도중에 참가한 경우
        return;
    }

    var data = {userId: userId,
        holds: seatData.holds};

    userMgr.broadcastInRoom('game_liangpai_notify_push', data, userId, true);

    logger.log("game_liangpai_notify_push", roomId);

    // 사용자들이 모두 패를 뒤집었을 때
    if(isAllPlayerLiangpai(game)){
        setTimeout(function () {
            game.state = 'bipai';

            userMgr.broadcastInRoom('game_start_bifai_push', game.turn, userId, true);

            logger.log("game_start_bifai_push.", roomId);

            //find last bipai seatIndex

            seatIndex = game.turn;
            var lastBipaiSeatIndex = seatIndex;

            for (var i = 0; i < validSeatCount(game) - 1; i++) {
                var seatIndex = getNextSeatIndex(game, seatIndex);

                if(isZhuangSeatIndex(game, seatIndex) == true) {
                    continue;
                }

                if(isFapaiedSeatIndex(game, seatIndex) == false) {
                    continue;
                }

                lastBipaiSeatIndex = seatIndex;
            }

            game.firstBipaiSeatIndex = game.turn;
            game.lastBipaiSeatIndex = lastBipaiSeatIndex;

            var data = {
                firstBipaiSeatIndex: game.firstBipaiSeatIndex,
                lastBipaiSeatIndex: game.lastBipaiSeatIndex
            };

            userMgr.broadcastInRoom('game_bipai_seat_index_push', data, userId, true);

            logger.log("game_bipai_seat_index_push " + JSON.stringify(data), roomId);

            var currentBipaiTurnUserId = game.gameSeats[game.turn].userId;

            logger.log("currentBipaiTurnUserId = " + currentBipaiTurnUserId, roomId);
            exports.onRequestBipai(currentBipaiTurnUserId)
        }, 1000);
    }
};

//클라이언트가 bipai 를 요구할 때
exports.onRequestBipai = function(userId){
    var seatData = gameSeatsOfUsers[userId];

    if (seatData == null) {
        logger.error('seatData of userId: ' + userId + ' is null!');
        logger.log(gameSeatsOfUsers);
        return;
    }

    var game = seatData.game;

    logger.log('userId: ' + userId + ' requests bipai!', game.roomInfo.id);

    assert(seatData.seatIndex == game.turn, 'invalid userId: ' + userId + ' seatIndex: ' + seatData.seatIndex  + ' current turn: ' + game.turn);
    assert(seatData.seatIndex != game.button,'invalid userId: ' + userId + ' seatIndex: ' + seatData.seatIndex  + ' current button: ' + game.button );

    var zhuangSeatData = getZhuangSeatData(game);

    var isWinZhuang = compare(zhuangSeatData, seatData);

    //fast debug option
    //isWinZhuang = false;

    var playerDifen = getPlayerDifen(game, seatData.seatIndex);

    if(playerDifen == -1) {
        // 돈을 대지 않고 패를 받아 비교에 참가하는 경우
        playerDifen = 0;
    }

    // 만일 한이 대자를 가지고 있는 경우, 이기면 자기가 불렀던 점수(下注)의 2배를 가져가고 만일 지면 불렀던 점수만큼 냅니다.
    // 장가는 대자가 있든 없든 관계하지 않습니다.

    if (isWinZhuang == false && isDuizi(seatData.holds)) {
        playerDifen += playerDifen;
    }

    // 한가가 下注한 점수가 탁에 실지 있는 값보다 크게 되면 탁에 실지 남은 값만큼 가져가거나 내면 됩니다

    if (game.difen < playerDifen){
        playerDifen = game.difen;
    }

    var oldGameDifen = game.difen;

    if (isWinZhuang) {
        //한이 지면 유희에 건 돈을 판에 놓는다.
        game.difen = game.difen + playerDifen;

        seatData.score = seatData.score - playerDifen;
    }
    else {
        seatData.score = seatData.score + playerDifen;
        game.difen = game.difen - playerDifen;
    }

    var data = {
        userId: userId,        // xian 의 userId
        gameDifen: game.difen,
        oldGameDifen: oldGameDifen,
        score: seatData.score,
        isWinZhuang: isWinZhuang
    };

    seatData.bipai = true;

    userMgr.broadcastInRoom('game_bipai_result_push', data,userId, true);

    var roomId = game.roomInfo.id;
    logger.log("isWinZhuang = " + isWinZhuang, roomId);
    logger.log("game.difen = " + game.difen, roomId);
    logger.log("userId : " + userId + " score: " + seatData.score, roomId);

    continueGameLogicAfterBipai(game);
};

exports.onBaoZhuang = function(userId) {
    var seatData = gameSeatsOfUsers[userId];

    var game = seatData.game;

    var zhuangUserId = getZhuangUserId(game);

    if (userId != zhuangUserId) {
        logger.log("you: " + userId + " are not zhuang. current zhuang: "  + zhuangUserId, game.roomInfo.id);
        return;
    }

    moveToNextBipaiTurn(game);

    logger.log("onBaoZhuang userId: " + userId, game.roomInfo.id);

    // 새로운 판에 준비하라고 통지한다.

    game.state = 'ready';
    userMgr.broadcastInRoom('game_request_ready_push', null, userId, true);
    logger.log("broadcasting game_request_ready_push", game.roomInfo.id);

    setAutoOperationFireTimeForGame(game);
    logger.log("setAutoOperationFireTimeForGame", game.roomInfo.id);
};

exports.onXiaZhuang = function(userId){
    var seatData = gameSeatsOfUsers[userId];
    var game = seatData.game;

    var zhuangUserId = getZhuangUserId(game);

    if (userId != zhuangUserId) {
        logger.log("you: " + userId + " are not zhuang. current zhuang: "  + zhuangUserId, game.roomInfo.id);
        return;
    }

    logger.log("onXiaZhuang userId: " + userId, game.roomInfo.id);

    if(game.state != "ask_keep_zhuang") {
        logger.log("error: can't receive xiazhuang when game.state == " + game.state, game.roomInfo.id);
        return;
    }

    if (seatData.seatIndex != game.button) {
        logger.log('error: userId: ' + userId + ' is not current zhunag!', game.roomInfo.id);
        return;
    }

    assert(seatData.seatIndex == game.button);

    seatData.score = seatData.score + game.difen;

    game.difen = 0;

    if (isMeetGameOverCondition(game)) {
        setTimeout(function () {
            doGameOver(game, userId);
        }, 2000);

        return;
    }

    moveToNextZhuang(game);

    var data = {
        button: game.button
    };

    userMgr.broadcastInRoom('game_xiazhuang_push', data, userId, true);
    logger.log('new zhuang seat index: ' + game.button, game.roomInfo.id);

    logger.log('new zhuangUserId: ' + zhuangUserId, game.roomInfo.id);

    // 새로운 판에 준비하라고 통지한다.
    game.state = 'ready';
    userMgr.broadcastInRoom('game_request_ready_push', null, userId, true);
    logger.log("game_request_ready_push", game.roomInfo.id);

    setAutoOperationFireTimeForGame(game);
    logger.log("setAutoOperationFireTimeForGame", game.roomInfo.id);
};

exports.onUserReady = function(userId){
    var seatData = gameSeatsOfUsers[userId];

    if(seatData == null){
        logger.error("failed to get seatData of userId: " + userId);
		logger.log(gameSeatsOfUsers);
        return;
    }

    var game = seatData.game;
    var roomId = game.roomInfo.id;

    if(game.state != "ready") {
        logger.log("error: for userId:" + userId + " can't receive ready when game.state == " + game.state, roomId);
        return;
    }

    if (seatData.ready == true) {
        logger.log('error: userId: ' + userId + ' already ready!', roomId);
        return;
    }

    seatData.autoOperationFireTime = -1;

    setUserReady(userId);
    userMgr.broadcastInRoom('user_ready_push',{userId:userId,ready:true},userId,true);

    logger.log("userId: " + userId + " user_ready_push", roomId);

    if (isAllPlayerReady(game)){
        if (game.roomInfo.numOfGames > 0  ) {
            logger.log("decrease_users_gem", roomId);
            decrease_users_gem(game);
        }

        startNewJu(userId);
    }
};

exports.isPlaying = function(userId){
    var seatData = gameSeatsOfUsers[userId];

    if(seatData == null){
        return false;
    }

    var game = seatData.game;

    return game.state == "idle";
};

exports.isAllPlayerDissoveAgree = function(roomId, agreeStates) {
    var roomInfo = roomMgr.getRoom(roomId);

    if(roomInfo == null){
        logger.log('error: failed to get roomInfo of roomId: ' + roomId, roomId);
        return false;
    }

    var playerCount =  roomInfo.seats.length;

    for ( var i = 0; i < playerCount; i++) {
        var seatData = roomInfo.seats[i];

        var userId = seatData.userId;

        if (userMgr.isOnline(userId)) {
            if (agreeStates[i] == false) {
                return false;
            }
        }
    }

    return true;
};

function startNewJu (userId) {
    var seatData = gameSeatsOfUsers[userId];

    assert.notEqual(seatData, null);

    var game = seatData.game;

    var roomInfo = game.roomInfo;

    logger.log('new ju started!', roomInfo.id);

    assert.notEqual(roomInfo, null);

    //국수 증가
    roomInfo.numOfGames++;

    var roomId = game.roomInfo.id;

    logger.log("startNewJu numOfGames = " + roomInfo.numOfGames, roomId);
    var zhuangUserId = getZhuangUserId(game);
    logger.log("zhuangUserId = " + zhuangUserId, roomId);

    db.update_num_of_turns(roomInfo.id, roomInfo.numOfGames);

    var seats = roomInfo.seats;
    var seatCount = seats.length;

    for(var i = 0; i < seatCount; ++i){
        var data = game.gameSeats[i];

        data.holds = [];         //손에 든 주패장
        data.difen = -1;          //판돈
        data.liangPai = false;   //패를 뒤집었는가?
    }

    //현재 게임의 상태는 판돈을 대는 상태이다.
    game.state = 'dingdifen';

    userMgr.broadcastInRoom('game_num_push',roomInfo.numOfGames, userId, true);

    setTimeout(function(){
        userMgr.broadcastInRoom('game_dingdifen_push', null, userId, true);
        logger.log("game_dingdifen_push", roomId);

        setAutoOperationFireTimeForGame(game);
        logger.log("setAutoOperationFireTimeForGame", roomId);
    }, 2000);
}

exports.hasBegan = function(roomId){
    var game = games[roomId];

    if(game != null){
        return true;
    }

    var roomInfo = roomMgr.getRoom(roomId);

    if(roomInfo != null){
        return roomInfo.numOfGames > 0;
    }

    return false;
};

exports.doDissolve = function(roomId){
    logger.log("doDissove", roomId);

    var roomInfo = roomMgr.getRoom(roomId);

    if (roomInfo == null) {
        logger.log('error: roomInfo is null roomId: ' + roomId, roomId);
        return;
    }

    var game = games[roomId];

    if (game == null) {
        logger.log('error: game is null of roomId: ' + roomId, roomId);
        return;
    }

    var zhuangSeatData = getZhuangSeatData(game);

    zhuangSeatData.score += game.difen;

    doGameOver(game, roomInfo.seats[0].userId, true);
};

exports.dissolveRequest = function(roomId, userId){
    logger.log('exports.dissoveRequest. roomId: ' + roomId + 'userId: ' + userId, roomId);

    var roomInfo = roomMgr.getRoom(roomId);

    if(roomInfo == null){
        logger.log("error: roomInfo is null!", roomId);
        return null;
    }

    if(roomInfo.dr != null){
        logger.log("error: roomInfo.dr is already set!", roomId);
        return null;
    }

    var seatIndex = roomMgr.getUserSeat(userId);

    if(seatIndex == null){
        logger.log( "error: seatIndex is null!", roomId);
        return null;
    }

    roomInfo.dr = {
        endTime:Date.now() + 30000,
        states:[false,false,false,false,false,false]
    };

    roomInfo.dr.states[seatIndex] = true;

    dissolvingList.push(roomId);

    return roomInfo;
};

exports.dissolveAgree = function(roomId,userId,agree){
    var roomInfo = roomMgr.getRoom(roomId);

    if(roomInfo == null){
        return null;
    }

    if(roomInfo.dr == null){
        return null;
    }

    var seatIndex = roomMgr.getUserSeat(userId);

    if(seatIndex == null){
        return null;
    }

    if(agree){
        roomInfo.dr.states[seatIndex] = true;
    }
    else{
        roomInfo.dr = null;

        var idx = dissolvingList.indexOf(roomId);

        if(idx != -1){
            dissolvingList.splice(idx,1);           
        }
    }

    return roomInfo;
};

function update() {
    for(var i = dissolvingList.length - 1; i >= 0; --i){
        var roomId = dissolvingList[i];
        
        var roomInfo = roomMgr.getRoom(roomId);

        if(roomInfo != null && roomInfo.dr != null){
            if(Date.now() > roomInfo.dr.endTime){
                exports.doDissolve(roomId);
                dissolvingList.splice(i,1); 
            }
        }
        else{
            dissolvingList.splice(i,1);
        }
    }

   inspectAutoOperation();
   //exports.onTestSyn();
}

function inspectAutoOperation() {
    for (var roomId in games) {
        var game = games[roomId];

        var roomInfo = roomMgr.getRoom(roomId);

        //if this room is planed to dissolve, ignore it.
        if(roomInfo != null && roomInfo.dr != null) {
            continue;
        }

        if (game == null){
            logger.error('game is null. roomId: ' + roomId);
            continue;
        }
        inspectAutoOperationForGame(game);
    }
}

function inspectAutoOperationForGame(game) {
    //logger.log('inspectAutoOperationForGame: ' + game.roomInfo.id);

    for (var i = 0; i < game.gameSeats.length; i++) {
        var seat = game.gameSeats[i];

        if(seat.userId <= 0) {
            continue;
        }

        if (seat.autoOperationFireTime == null) {
            //logger.log('userId: ' + seat.userId +  ' autoOperationFireTime = null');
            continue;
        }

        if (seat.autoOperationFireTime == -1) {
            //logger.log('userId: ' + seat.userId +  ' autoOperationFireTime = -1');
            continue;
        }

        var remainingTime = seat.autoOperationFireTime - Date.now();

        remainingTime /= 1000;

        //logger.log('userId: ' + seat.userId + ', remainingTime: ' + remainingTime);

        if (Date.now() > seat.autoOperationFireTime) {
            seat.autoOperationFireTime = -1;
            executeAutoOperation(seat);
        }
    }
}

function setAutoOperationFireTimeForSeat(seat, prepareTimeArg) {
    var prepareTime = 0;

    if (prepareTimeArg == null) {
        prepareTime = PREPARE_TIME;
    }
    else {
        prepareTime = prepareTimeArg;
    }

    seat.autoOperationFireTime = Date.now() + prepareTime * 1000;

    if (userMgr.isOnline(seat.userId)) {
        userMgr.sendMsg(seat.userId, 'game_auto_operation_fire_time_push', {remainingTime: prepareTime} );
    }
}

function setAutoOperationFireTimeForGame (game, onlyFapaied) {
    for (var i = 0; i < game.gameSeats.length; i++ ) {
        var seat = game.gameSeats[i];

        if (seat.userId <= 0) {
            continue;
        }

        if (onlyFapaied == true && isFapaiedSeat(seat) == false ) {
            continue;
        }

        setAutoOperationFireTimeForSeat(seat);
    }
}

// execute auto operation
function executeAutoOperation(seat) {
    var game = seat.game;
    var roomId = game.roomInfo.id;

    var userId = seat.userId;

    var state = game.state;

    if (state == 'dingdifen') {
        var difen = 0;

        if (isZhuangSeat(game, seat)){
            if (game.difen == 0) {
                userMgr.sendMsg(userId, 'game_execute_auto_operation_push', null);

                difen = game.conf.shangzhuangDifen;
                exports.onDingDifen(userId, difen);

                logger.log('userId: ' + userId + ' auto execute dingdifen of zhuang', roomId);
            }
        }
        else {
            userMgr.sendMsg(userId, 'game_execute_auto_operation_push', null);

            difen = 20;
            exports.onDingDifen(userId, difen);
            logger.log('userId: ' + userId + ' auto execute dingdifen', roomId);
        }
    }
    else if (state == 'liangpai') {
        userMgr.sendMsg(userId, 'game_execute_auto_operation_push', null);
        exports.onLiangPai(userId);
        logger.log('userId: ' + userId + ' auto execute liangpai', roomId);
    }
    else if (state == 'bipai') {
        // nothing to do
    }
    else if (state == 'ready') {
        userMgr.sendMsg(userId, 'game_execute_auto_operation_push', null);
        exports.onUserReady(userId);
        logger.log('userId: ' + userId + ' auto execute ready', roomId);
    }
    else if (state == 'ask_keep_zhuang') {
        if (isZhuangSeat(game, seat)){
            userMgr.sendMsg(userId, 'game_execute_auto_operation_push', null);
            exports.onXiaZhuang(userId);
            logger.log('userId: ' + userId + ' auto execute xiazhunag', roomId);
        }
    }
    else {
        // nothing to do
    }
}

exports.onTestSyn = function() {
    logger.log('start test sync*******************');

    for (var i = 0; i < 999; i ++) {
        logger.log(i);
        for (var j = 0; j < 999; j ++) {
            var data = [];

            data.push(i);
        }
    }

    logger.log('end test sync#####################');
};

setInterval(update,1000);