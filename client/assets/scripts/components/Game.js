    cc.Class({
    extends: cc.Component,

    properties: {
        _seatNodeArray: [],
        _cardsNodeArray: [],

        //현재 게임의 국수를 보여주는 label
        _gameNumberLabelNode: null,

        _startButton: null,
        _sitButton: null,
        _cuoPaiButton: null,
        _fanPaiButton: null,
        _liangPaiButton: null,
        _zhunBeiButton: null,
        _gameDifenLabel: null,

        //menu
        _downMarkSpriteFrame: null,
        _upMarkSpriteFrame: null,

        _golds: [],
        _GOLD_COUNT: 20,
        _GOLD_POS_X: -1,
        _GOLD_POS_Y: -1
    },

    onLoad: function () {
        this.addComponent("DingDifen");
        this.addComponent("DingZhuang");
        this.addComponent('Reconnect');
        this.addComponent("UserInfoShow");
        this.addComponent("Chat");
        this.addComponent("DissoveRoom");
        this.addComponent("GameInfo");
        this.addComponent("TimePointer");

        this._seatNodeArray.push(this.node.getChildByName('my_seat'));
        this._cardsNodeArray.push(this.node.getChildByName('my_cards'));

        var otherSeatsNode = this.node.getChildByName('other_seats');

        for (var i = 0; i < otherSeatsNode.children.length; ++i) {
            var seatNode = otherSeatsNode.children[i];

            this._seatNodeArray.push(seatNode);

            var otherCardsNode = seatNode.getChildByName('cards');

            cc.assert(otherCardsNode.children.length == 2, 'Child count of otherCardsNode could not be 2!');

            this._cardsNodeArray.push(otherCardsNode);
        }

        this._gameDifenLabel = cc.find('Canvas/difen/difen');

        this._startButton = this.node.getChildByName('start');
        this._sitButton = this.node.getChildByName('sit');
        this._cuoPaiButton = this.node.getChildByName('cuopai');
        this._fanPaiButton = this.node.getChildByName('fanpai');
        this._liangPaiButton = this.node.getChildByName('liangpai');
        this._zhunBeiButton = this.node.getChildByName('zhunbei');

        var url = cc.url.raw('resources/textures/game/menu/down.png');
        var texture = cc.textureCache.addImage(url);

        this._downMarkSpriteFrame = new cc.SpriteFrame(texture);

        url = cc.url.raw('resources/textures/game/menu/up.png');
        texture = cc.textureCache.addImage(url);

        this._upMarkSpriteFrame = new cc.SpriteFrame(texture);

        this.prepareGolds();

        this.initAllCards();

        this.hideAllButtons();
        this.refreshStartAndSitdownButtons();

        if (cc.vv.gameNetMgr.gameIsIdle()) {
            this.hideGameDifen();
        }
        else {
            this.showGameDifen();
            this.refreshGameDifen();

            if (cc.vv.gameNetMgr.getGameDifen() > 0) {
                this.goldsMoveFromSeatToGameDifen(cc.vv.gameNetMgr.getZhuangSeatIndex());
            }
        }

        this.onGameBegin();

        this.initEventHandlers();

        cc.vv.game = this;

        cc.vv.audioMgr.playBGM('background/game.mp3');
    },

    hideAllButtons: function () {
        this._cuoPaiButton.active = false;
        this._fanPaiButton.active = false;
        this._liangPaiButton.active = false;
        this._zhunBeiButton.active = false;
    },

    //set message string and show it.
    setMessage: function (msg) {
        cc.find('Canvas/message/message').getComponent(cc.Label).string = msg;
        cc.find('Canvas/message').active = true;
    },

    hideMessage: function () {
        /* 왜 조건을 판단해야 하는가?
         이 함수는 SetTimeout 를 통하여 실행된다.
         이 함수가 실행될 때 Game 씬이 아니라 Hall 씬일수도 있다.
         */

        if (cc.find('Canvas/message')) {
            cc.find('Canvas/message').active = false;
        }
    },

    hideAllPlayerCards: function () {
        for (var i = 0; i < cc.vv.gameNetMgr.getValidSeatCount(); i++) {
            var seatIndexInScene = cc.vv.gamemgr.getSeatIndexInScene(i);

            for (var j = 0; j < this._cardsNodeArray[seatIndexInScene].childrenCount; j++) {
                this._cardsNodeArray[seatIndexInScene].children[j].active = false;
            }
        }
    },

    setSpriteFrameByCardID: function (sprite, cardId) {
        sprite.spriteFrame = cc.vv.gamemgr.getSpriteFrameByCardID(cardId);
    },

    //패를 받은 선수의 패짝을 뒤판으로 설정
    initAllPlayerCardsWithBack: function () {
        for (var i = 0; i < cc.vv.gameNetMgr.getValidSeatCount(); i++) {
            if (cc.vv.gameNetMgr.isFapaiedSeat(i)) {
                var seatIndexInScene = cc.vv.gamemgr.getSeatIndexInScene(i);

                for (var j = 0; j < this._cardsNodeArray[seatIndexInScene].childrenCount; j++) {
                    this._cardsNodeArray[seatIndexInScene].children[j].getComponent(cc.Sprite).spriteFrame = cc.vv.gamemgr.getSpriteFrameOfCardBack();
                }
            }
        }
    },

    initOnePlayerCardsWithHoldsPai: function (logicalSeatIndex) {
        if (this._cardsNodeArray == null){
            return;
        }

        var seatData = cc.vv.gameNetMgr.getSeat(logicalSeatIndex);

        var holds = seatData.holds;

        //yet hold data is not prepared!
        //hold data will be prepared from game server when gamebeign or sync push

        if (holds == null) {
            return;
        }

        if (holds.length < 2) {
            return;
        }

        var seatIndexInScene = cc.vv.gamemgr.getSeatIndexInScene(logicalSeatIndex);

        var cardsNode = this._cardsNodeArray[seatIndexInScene];

        for (var i = 0; i < holds.length; ++i) {
            var cardId = holds[i];

            var sprite = cardsNode.children[i].getComponent(cc.Sprite);

            if (cardId == -1) {
                sprite.spriteFrame = cc.vv.gamemgr.getSpriteFrameOfCardBack();
            }
            else {
                sprite.spriteFrame = cc.vv.gamemgr.getSpriteFrameByCardID(cardId);
            }
        }
    },

    initAllPlayerCardsWithHoldsPai: function () {
        for (var i = 0; i < cc.vv.gameNetMgr.getValidSeatCount(); i++) {
            if (cc.vv.gameNetMgr.isFapaiedSeat(i)) {
                this.initOnePlayerCardsWithHoldsPai(i);
            }
        }
    },

    initAllCards: function () {
        for (var i = 0; i < this._cardsNodeArray.length; i++) {
            var cardsNode = this._cardsNodeArray[i];

            for (var j = 0; j < 2; ++j) {
                var sprite = cardsNode.children[j].getComponent(cc.Sprite);

                sprite.spriteFrame = null;
            }
        }
    },

    refreshCardsLogic: function () {
        this.initAllCards();

        var gameState = cc.vv.gameNetMgr.getGameState();

        if (gameState == 'liangpai') {
            this.initAllPlayerCardsWithBack();

            for (var i = 0; i < cc.vv.gameNetMgr.getValidSeatCount(); i++) {
                var seatData = cc.vv.gameNetMgr.getSeat(i);

                if (seatData.liangPai == true) {
                    this.initOnePlayerCardsWithHoldsPai(i);
                }
            }
        }
        else {
            this.initAllPlayerCardsWithHoldsPai();
        }
    },

    doFapai: function () {
        this.initAllPlayerCardsWithBack();
        this.hideAllPlayerCards();

        var dealerCard = this.node.getChildByName('dealer_card');

        dealerCard.active = true;

        var dealerCardX = dealerCard.x;
        var dealerCardY = dealerCard.y;

        var actions = [];

        var time = 0.2;
        var count = 0;

        var offsetX = 0;
        var offsetY = 0;

        var startSeatIndex = cc.vv.gameNetMgr.getZhuangSeatIndex() + 1;

        startSeatIndex %= cc.vv.gameNetMgr.getValidSeatCount();

        for (var i = 0; i < cc.vv.gameNetMgr.getValidSeatCount(); i++) {
            var seatIndex = startSeatIndex + i;

            seatIndex %= cc.vv.gameNetMgr.getValidSeatCount();

            seatIndex = cc.vv.gamemgr.getSeatIndexInScene(seatIndex);

            var cardsNode = this._cardsNodeArray[seatIndex];
            var seatNode = cardsNode.parent;

            for (var j = 0; j < cardsNode.childrenCount; j++) {
                count++;

                var cardX = cardsNode.children[j].x;
                var cardY = cardsNode.children[j].y;

                if (seatIndex == 0) {
                    //this is my_cards node
                    offsetX = cardsNode.x + cardX - dealerCardX;
                    offsetY = cardsNode.y + cardY - dealerCardY;
                }
                else {
                    offsetX = seatNode.x + cardsNode.x + cardX - dealerCardX;
                    offsetY = seatNode.y + cardsNode.y + cardY - dealerCardY;
                }

                var actionMoveTo = new cc.MoveBy(time, cc.p(offsetX, offsetY));
                var actionMoveBack = new cc.MoveBy(0, cc.p(-offsetX, -offsetY));

                actions.push(actionMoveTo);
                actions.push(actionMoveBack);

                var fnshow = function () {
                    this.active = true;
                };

                var callbackCardShow = new cc.callFunc(fnshow, cardsNode.children[j]);

                actions.push(callbackCardShow);
            }
        }

        var self = this;

        var myFirstCardNode = this._cardsNodeArray[0].children[0];

        var fnFapaiEnd = function () {
            this.active = false;

            cc.vv.gameNetMgr.gamestate = "liangpai";

            if (cc.vv.gameNetMgr.isPlayer()) {
                /* 왜 시끄러운 if 문들이 필요한가?
                 이 함수는 액션이 끝난후에 진행되기때문이다.

                 앱이 림시중지상태에 들어갔다가(사용자가 home 단추를 누를 때) 다시 restore 하면 봉사기에서
                 한꺼번에 밀렸던 message 들이 온다.
                 이때 내가 예상하였던 변수상태들이 달라진다.

                 */

                if (self._cuoPaiButton) {
                    self._cuoPaiButton.active = true;
                }

                if (self._fanPaiButton) {
                    self._fanPaiButton.active = true;
                }

                var holds = cc.vv.gameNetMgr.getMySeat().holds;

                if (holds.length > 0) {
                    myFirstCardNode.getComponent(cc.Sprite).spriteFrame = cc.vv.gamemgr.getSpriteFrameByCardID(holds[0]);
                }
            }
            else {
                self.setMessage('亮牌中...');
            }
        };

        var callbackFapaiEnd = new cc.callFunc(fnFapaiEnd, dealerCard);

        actions.push(callbackFapaiEnd);

        var sequence = cc.sequence(actions);

        dealerCard.runAction(sequence);
    },

    randomBetweenOnes: function () {
        var random = Math.random();

        return 2 * random - 1;
    },

    /*
     if onlyFirstCard is true, and then only second card will be rolled!
     */

    rollCardsWithHolds: function (logicalSeatIndex, onlySecondCard) {
        var seatData = cc.vv.gameNetMgr.getSeat(logicalSeatIndex);

        var self = this;

        var holds = seatData.holds;
        var seatIndexInScene = cc.vv.gamemgr.getSeatIndexInScene(logicalSeatIndex);
        var cardsNode = this._cardsNodeArray[seatIndexInScene];

        var card1 = cardsNode.children[0];
        var card2 = cardsNode.children[1];

        var scale = 0.28;

        if (seatIndexInScene == 0) {
            // this is my card
            scale = 0.45;
        }

        var time = 0.3;

        //shrink in x-axis
        var actionTo1 = new cc.ScaleTo(time, 0, scale);

        //again extend in x-axis
        var actionBack1 = new cc.ScaleTo(time, scale, scale);

        var fn1 = function () {
            var sprite = this.getComponent(cc.Sprite);
            self.setSpriteFrameByCardID(sprite, holds[0]);
        };

        var callback1 = new cc.callFunc(fn1, card1);

        var sequence1 = cc.sequence(actionTo1, callback1, actionBack1);

        var actionTo2 = new cc.ScaleTo(time, 0, scale);
        var actionBack2 = new cc.ScaleTo(time, scale, scale);

        var fn2 = function () {
            var sprite = this.getComponent(cc.Sprite);
            self.setSpriteFrameByCardID(sprite, holds[1]);
        };

        var callback2 = new cc.callFunc(fn2, card2);

        var sequence2 = cc.sequence(actionTo2, callback2, actionBack2);

        cc.director.getActionManager().removeAllActionsFromTarget(card1);
        cc.director.getActionManager().removeAllActionsFromTarget(card2);

        card1._scaleX = scale;
        card1._scaleY = scale;
        card2._scaleX = scale;
        card2._scaleY = scale;

        if (onlySecondCard != true) {
            card1.runAction(sequence1);
        }

        card2.runAction(sequence2);
    },

    showGameDifen: function () {
        this.node.getChildByName('difen').active = true;
    },

    refreshGameDifen: function () {
        this._gameDifenLabel.getComponent(cc.Label).string = cc.vv.gameNetMgr.getGameDifen();
    },

    hideGameDifen: function () {
        this.node.getChildByName('difen').active = false;
    },

    //게임의 상태에 따라서 button들의 상태를 갱신한다.
    refreshStartAndSitdownButtons: function () {
        //start button state
        if (cc.vv.gameNetMgr.isOwner()) {
            if (cc.vv.gameNetMgr.gameIsIdle()) {
                //경기가 아직 시작되지 않은 경우
                this._startButton.active = true;
                this._startButton.getComponent(cc.Button).interactable = cc.vv.gameNetMgr.getOnlineUserCount() >= 2;
            }
            else {
                this._startButton.active = false; //경기진행중
            }
        }
        else {
            this._startButton.active = false;
        }

        var moveToAction;
        var posY;

        //sit button state
        if (!cc.vv.gameNetMgr.hasSeat() && cc.vv.gameNetMgr.getValidSeatCount() < 6) {
            this._sitButton.active = true;

            if (this._startButton.active == false) {
                //move sit Button to center of screen
                posY = this._sitButton.getPositionY();

                moveToAction = cc.moveTo(0.5, cc.p(0, posY));
                this._sitButton.runAction(moveToAction);
            }
        }
        else {
            this._sitButton.active = false;

            if (this._startButton.active == true) {
                //move start Button to center of screen
                posY = this._startButton.getPositionY();

                moveToAction = cc.moveTo(0.5, cc.p(0, posY));
                this._startButton.runAction(moveToAction);
            }
        }
    },

    sendStartGame: function () {
        this._startButton.active = false;

        cc.vv.wc.show('正在');
        cc.vv.net.send('start_game', cc.vv.gameNetMgr.roomId);
    },

    sendSeatRequest: function () {
        cc.assert(cc.vv.gameNetMgr.seatIndex == -1, 'internal error');

        var data = {roomId: cc.vv.gameNetMgr.roomId, userName: cc.vv.userMgr.userName};

        cc.vv.net.send('request_seat', data);
    },

    //게임이 시작될 때
    onGameBegin: function (data) {
        var gameState = cc.vv.gameNetMgr.getGameState();

        if (gameState == '') {
            var onlineCount = cc.vv.gameNetMgr.getOnlineUserCount();

            if (cc.vv.gameNetMgr.isOwner()) {
                if (onlineCount < 2) {
                    // 아직 게임을 시작할수 없다.
                    this.setMessage('请等得其他玩家加入...');
                }
                else {
                    // start단추를 눌러서 경기를 시작할수 있는 상태
                    this.hideMessage();
                }
            }
            else {
                if (cc.vv.gameNetMgr.hasSeat()) {
                    if (onlineCount < 2) {
                        // 아직 게임을 시작할수 없다.
                        this.setMessage('请等得其他玩家加入...');
                    }
                    else {
                        // owner가 start단추를 누르기를 기다린다.
                        this.setMessage('请等得房主开始游戏...');
                    }
                } else {
                    this.setMessage('旁观中...');
                }
            }
        }
        else if (gameState == 'dingdifen') {
            if (cc.vv.gameNetMgr.isObserver()) {
                this.setMessage('下注中...');
            }
            else {
                if (cc.vv.gameNetMgr.isZhuang()) {
                    if (cc.vv.gameNetMgr.getGameDifen() == 0) {
                        var gameDifen = cc.vv.gameNetMgr.getShangZhuangDifen();

                        this.setMessage('为了上庄，请下注奖池基金 ' + gameDifen);
                    }
                    else {
                        this.setMessage('请等得闲家下注');
                    }
                }
                else {
                    if (cc.vv.gameNetMgr.getMyDifen() == 0) {
                        this.setMessage('请选择下注分数');
                    }
                    else {
                        this.setMessage('请等得玩家下注');
                    }
                }
            }
        }
        else if (gameState == 'fapai') {
            var fn = function () {
                var updatedGameState = cc.vv.gameNetMgr.getGameState();

                if (updatedGameState != 'fapai') {
                    this.onGameBegin(data);
                }
                else {
                    setTimeout(fn, 50);
                }
            };

            fn();
        }
        else if (gameState == 'liangpai') {
            this.initAllPlayerCardsWithBack();

            for (var i = 0; i < cc.vv.gameNetMgr.getValidSeatCount(); i++) {
                var seatData = cc.vv.gameNetMgr.getSeat(i);

                if (seatData.liangPai == true) {
                    this.initOnePlayerCardsWithHoldsPai(i);
                }
            }

            if (cc.vv.gameNetMgr.isObserver()) {
                this.setMessage('亮牌中...');
            }
            else {
                var mySeatData = cc.vv.gameNetMgr.getMySeat();

                if (mySeatData.liangPai == true) {
                    this.setMessage('请等待其他玩家亮牌');
                }
                else {
                    this.hideMessage();
                    this._cuoPaiButton.active = true;
                    this._fanPaiButton.active = true;
                }
            }
        }
        else if (gameState == 'bipai') {
            this.initAllPlayerCardsWithHoldsPai();

            var seatIndex = cc.vv.gameNetMgr.getTurn();

            var seatData = cc.vv.gameNetMgr.getSeat(seatIndex);

            cc.assert(seatData != null, 'invalid userId: ' + seatIndex);

            this.setMessage('跟' + seatData.name + '比牌中...');
        }
        else if (gameState == 'ready') {
            this.initAllPlayerCardsWithHoldsPai();

            if (cc.vv.gameNetMgr.isObserver()) {
                this.setMessage('准备中...');
            }
            else {
                var seatData = cc.vv.gameNetMgr.getMySeat();

                if (seatData.ready == true) {
                    this.setMessage('请等待其他玩家准备');
                    this._zhunBeiButton.active = false;
                }
                else {
                    this.hideMessage();
                    this._zhunBeiButton.active = true;
                }
            }
        }
        else if (gameState == 'ask_keep_zhuang') {
            this.initAllPlayerCardsWithHoldsPai();
            this.onGameAskKeepZhuang();
        }
        else {

        }

        if (cc.vv.gameNetMgr.isPlayer()) {
            if (cc.vv.gameNetMgr.gamestate != '') {

                //already xiazhu, so no need to start count down.
                if (gameState == 'dingdifen') {
                    if (cc.vv.gameNetMgr.isZhuang() && cc.vv.gameNetMgr.getGameDifen() > 0) {
                        return;
                    }
                }

                var seatData = cc.vv.gameNetMgr.getMySeat();

                if (seatData.autoOperationFireTime != -1) {
                    var remainingTime = 15;

                    cc.vv.timePointer.setRemainingTime(remainingTime);
                    cc.vv.timePointer.startCountDown();
                }
            }
        }
    },

    // game is already started!
    // my seat is exist.

    joinToGame: function () {
        var gameState = cc.vv.gameNetMgr.getGameState();

        if (gameState == 'dingdifen') {
            this.setMessage('请选择下注分数');
        }
        else if (gameState == 'liangpai') {

        }
        else if (gameState == 'bipai') {

        }
        else if (gameState == 'ready') {
            this._zhunBeiButton.active = true;
        }
        else if (gameState == 'ask_keep_zhuang') {

        }
        else {

        }
    },

    onGameSync: function (data) {
        this.onGameBegin();
    },

    onGameNum: function (data) {
        this.refreshStartAndSitdownButtons();
    },

    //않기 단추를 누른 후에 봉사기에서 자리를 주었을 때
    onSeatReady: function () {
        this._sitButton.active = false;

        cc.vv.wc.hide();

        if (cc.vv.gameNetMgr.gameIsIdle()) {
            if (cc.vv.gameNetMgr.isOwner()) {
                //move start Button to center of screen
                var posY = this._startButton.getPositionY();

                var moveToAction = cc.moveTo(0.5, cc.p(0, posY));

                this._startButton.runAction(moveToAction);

                if (cc.vv.gameNetMgr.getOnlineUserCount() >= 2) {
                    this._startButton.getComponent(cc.Button).interactable = true;
                    this.hideMessage();
                }
                else {
                    //아직 게임을 시작할수 없다.
                    this.setMessage('请等得其他玩家加入...');
                }
            }
            else {
                if (cc.vv.gameNetMgr.getOnlineUserCount() >= 2) {
                    this.setMessage('请得房主开始游戏...');
                }
                else {
                    //아직 게임을 시작할수 없다.
                    this.setMessage('请等得其他玩家加入...');
                }
            }
        }
        else {
            this.joinToGame();
        }
    },

    // when one player which take a seat leaves the room.
    onGameExitNotify: function (data) {
        this.refreshStartAndSitdownButtons();
    },

    onNewUser: function (data) {
        var onlineCount = cc.vv.gameNetMgr.getOnlineUserCount();

        if (cc.vv.gameNetMgr.gameIsIdle() && cc.vv.gameNetMgr.isOwner() && onlineCount >= 2) {
            this.hideMessage();
            this._startButton.getComponent(cc.Button).interactable = true;
        }

        if (cc.vv.gameNetMgr.gameIsIdle() && !cc.vv.gameNetMgr.isOwner() && cc.vv.gameNetMgr.isPlayer() && onlineCount >= 2) {
            // owner가 start단추를 누르기를 기다린다.
            this.setMessage('请等得房主开始游戏...');
        }

        var gameState = cc.vv.gameNetMgr.getGameState();

        if (gameState == '') {
            return;
        }

        this.refreshCardsLogic();
    },

    onUserDisconnected: function (data) {

    },

    onGameOver: function (data) {
        var seatIndex = cc.vv.gameNetMgr.getZhuangSeatIndex();

        this.goldsMoveFromScreenCenterToSeat(seatIndex);

        cc.vv.gameNetMgr.reset();
    },

    //봉사기에서 패를 나누어주었을 때
    onGameHolds: function (data) {
        this.doFapai();
    },

    //봉사기가 판돈을 대라고 통지하였을 때
    onGameDingDifen: function (data) {
        if (cc.vv.gameNetMgr.isObserver()) {
            this.setMessage('下注中...');
        }
        else {
            if (cc.vv.gameNetMgr.isZhuang()) {
                if (cc.vv.gameNetMgr.getGameDifen() == 0) {
                    var gameDifen = cc.vv.gameNetMgr.getShangZhuangDifen();

                    this.setMessage('为了上庄，请下注奖池基金 ' + gameDifen);
                }
                else {
                    this.setMessage('请等得闲家下注');
                }
            }
            else {
                this.setMessage('请选择下注分数');
            }
        }
    },

    //봉사기가 어느 사용자가 판돈을 댔다고 통지하였을 때
    onGameDingDifenNotify: function (data) {
        //판돈을 댄 사용자의 seatIndex얻기

        var realData = data.detail;

        var seatIndex = cc.vv.gameNetMgr.getSeatIndexByID(realData.userId);

        if (seatIndex == cc.vv.gameNetMgr.getZhuangSeatIndex()) {
            this.showGameDifen();
            this.refreshGameDifen();

            this.goldsMoveFromSeatToGameDifen(seatIndex);
        }

        if (seatIndex == cc.vv.gameNetMgr.getMySeatIndex()) {
            if (cc.vv.gameNetMgr.isZhuang()) {
                this.setMessage('请等待其它闲家下注');
            }
            else {
                this.setMessage('请等待其它玩家下注');
            }
        }
    },

    //봉사기가 모든 사용자들이 다 판돈을 댔다고 통지하였을 때
    onGameDingDifenFinish: function (data) {
        this.hideMessage();
    },

    onGameLiangPaiNotify: function (data) {
        var userId = data.detail;

        var logicalSeatIndex = cc.vv.gameNetMgr.getSeatIndexByID(userId);

        if (logicalSeatIndex != cc.vv.gameNetMgr.getMySeatIndex()) {
            this.rollCardsWithHolds(logicalSeatIndex);

            var seatData = cc.vv.gameNetMgr.getSeat(logicalSeatIndex);

            var cards = seatData.holds;

            var soundUrl = cc.vv.gamemgr.getSoundUrlFromCards(cards);

            cc.vv.audioMgr.playSFX(soundUrl);
        }
    },

    onGameStartBipai: function (data) {
        var seatIndex = data.detail;

        var seatData = cc.vv.gameNetMgr.getSeat(seatIndex);

        cc.assert(seatData != null, 'invalid userId: ' + seatIndex);

        this.setMessage('跟' + seatData.name + '比牌中...');
    },

    onGameBipaiResult: function (data) {
        this.refreshGameDifen();

        var fromSeatIndex, toSeatIndex = -1;
        var userId = data.detail.userId;

        var oldGameDifen = data.detail.oldGameDifen;
        var difen = cc.vv.gameNetMgr.getSeatByID(userId).difen;

        if (data.detail.isWinZhuang == true) {
            fromSeatIndex = cc.vv.gameNetMgr.getSeatIndexByID(userId);
            this.goldsMoveFromSeatToGameDifen(fromSeatIndex);
        }
        else {
            toSeatIndex = cc.vv.gameNetMgr.getSeatIndexByID(userId);

            if (oldGameDifen > difen) {
                this.goldsMoveFromScreenCenterToSeat(toSeatIndex, true);
            }
            else {
                this.goldsMoveFromScreenCenterToSeat(toSeatIndex);
            }
        }
    },

    onGameBipaiFinish: function (data) {
        var self = this;

        setTimeout(function () {
            if (self) {
                self.hideMessage();
            }
        }, 1600);
    },

    onGameRequestReady: function (data) {
        if (cc.vv.gameNetMgr.isPlayer()) {
            this._zhunBeiButton.active = true;
        }
        else {
            this.setMessage('准备中...');
            this.initAllCards();
        }
    },

    onGameAskKeepZhuang: function () {
        if (cc.vv.gameNetMgr.isObserver()) {
            this.setMessage('当前庄家选择中...');
        }
        else {
            if (cc.vv.gameNetMgr.isZhuang()) {
                this.setMessage('请选择');
            }
            else {
                this.setMessage('请等得直到当前庄家选择');
            }
        }
    },

    onGameXiazhuang: function (data) {
        // move gem pile to old zhuang
        var seatIndex = cc.vv.gameNetMgr.getZhuangSeatIndex();

        this.goldsMoveFromScreenCenterToSeat(seatIndex);

        //refresh zhuang 's score
        var zhuangSeatData = cc.vv.gameNetMgr.getZhuangSeatData();
        zhuangSeatData.score = zhuangSeatData.score + cc.vv.gameNetMgr.getGameDifen();

        cc.vv.gameNetMgr.difen = 0;

        //change zhuang
        cc.vv.gameNetMgr.oldButton = cc.vv.gameNetMgr.button;
        cc.vv.gameNetMgr.button = data.detail.button;

        this.refreshGameDifen();
        this.hideMessage();
    },

    onDissolveNotice: function (event) {
        if (cc.vv.gameNetMgr.isObserver()) {
            this.setMessage('解散中...');
        }
    },

    initEventHandlers: function () {
        cc.vv.gameNetMgr.dataEventHandler = this.node;

        var self = this;

        this.node.on('game_begin', function (data) {
            self.onGameBegin(data);
        });

        //봉사기에서 게임의 국수에 대한 정보가 올 때
        this.node.on('game_num', function (data) {
            self.onGameNum(data);
        });

        this.node.on('game_sync', function (data) {
            self.onGameSync(data);
        });

        this.node.on('seat_ready', function (data) {
            self.onSeatReady();
        });

        this.node.on('new_user', function (data) {
            self.onNewUser(data);
        });

        this.node.on('user_disconnected', function (data) {
            self.onUserDisconnected(data);
        });

        //봉사기에서 새로운 국을 시작하면서 패를 잡으라는 지령이 올 때
        this.node.on('game_holds', function (data) {
            self.onGameHolds(data);
        });

        //봉사기가 판돈을 대라고 통지하였을 때
        this.node.on('game_dingdifen', function (data) {
            self.onGameDingDifen(data);
        });

        //봉사기가 어느 사용자가 판돈을 댔다고 통지하였을 때
        this.node.on('game_dingdifen_notify', function (data) {
            self.onGameDingDifenNotify(data);
        });

        //봉사기가 모든 사용자들이 다 판돈을 댔다고 통지하였을 때
        this.node.on('game_dingdifen_finish', function (data) {
            self.onGameDingDifenFinish(data);
        });

        this.node.on('game_liangpai_notify', function (data) {
            self.onGameLiangPaiNotify(data);
        });

        this.node.on('game_start_bifai', function (data) {
            self.onGameStartBipai(data);
        });

        this.node.on('game_bipai_result', function (data) {
            self.onGameBipaiResult(data);
        });

        this.node.on('game_bipai_finish', function (data) {
            self.onGameBipaiFinish(data);
        });

        this.node.on('game_request_ready', function (data) {
            self.onGameRequestReady(data);
        });

        this.node.on('game_change_zhuang', function (data) {
            self.setMessage('奖池被掏空! 庄家被强制下庄。');
        });

        this.node.on('game_ask_keep_zhuang', function (data) {
            self.onGameAskKeepZhuang(data);
        });

        this.node.on('game_xiazhuang', function (data) {
            self.onGameXiazhuang(data);
        });

        this.node.on('game_over', function (data) {
            self.onGameOver(data);
        });

        this.node.on("dissolve_notice", function (event) {
            self.onDissolveNotice(event);
        });

        this.node.on('exit_notify', function (data) {
            self.onGameExitNotify(data);
        });

        this.node.on('game_execute_auto_operation', function (data) {
            self.onGameExecuteAutoOperation();
        });
    },

    onSitButtonClicked: function () {
        if (cc.vv.gameNetMgr.getValidSeatCount() >= 6) {
            cc.vv.alert.show('提示', "房间满了!");
            return;
        }

        cc.vv.wc.show('正在进入房间...');

        this.sendSeatRequest();
    },

    onStartButtonClicked: function () {
        this.sendStartGame();

        /*var fn = function () {
         cc.vv.net.send('test_sync');
         setTimeout(fn, 100);
         };

         fn();*/
    },

    onCuopaiButtonClicked: function () {
        cc.find('Canvas/popups/cuopai').active = true;
        cc.vv.cuopai.initCards(cc.vv.gameNetMgr.getMySeat().holds);
        cc.vv.cuopai.runInitAction();

        this._cuoPaiButton.active = false;
    },

    onAfterCuopai: function () {
        this.initOnePlayerCardsWithHoldsPai(cc.vv.gameNetMgr.getMySeatIndex());

        this._fanPaiButton.active = false;
        this._liangPaiButton.active = true;
    },

    onFanPaiButtonClicked: function () {
        this.rollCardsWithHolds(cc.vv.gameNetMgr.getMySeatIndex(), true);

        this._cuoPaiButton.active = false;
        this._fanPaiButton.active = false;

        this._liangPaiButton.active = true;
    },

    onLiangPaiButtonClicked: function () {
        //패를 공개한다.
        cc.vv.net.send('liangpai');

        this._liangPaiButton.active = false;

        this.setMessage('请等待其他玩家亮牌');

        if (cc.vv.timePointer.isStarted()) {
            cc.vv.timePointer.cancel();
        }

        var cards = cc.vv.gameNetMgr.getMySeat().holds;

        var soundUrl = cc.vv.gamemgr.getSoundUrlFromCards(cards);

        cc.vv.audioMgr.playSFX(soundUrl);
    },

    onZhunbeiButtonClicked: function () {
        cc.assert(cc.vv.gameNetMgr.isPlayer(), 'Only player can click zunbei button');

        this._zhunBeiButton.active = false;

        this.initAllCards();
        cc.vv.gameNetMgr.initAllCards();

        this.setMessage('请等待其他玩家准备');

        cc.vv.net.send('ready');

        if (cc.vv.timePointer.isStarted()) {
            cc.vv.timePointer.cancel();
        }
    },

    onInfoButtonClicked: function () {
        cc.find('Canvas/popups/info/difen').getComponent(cc.Label).string = cc.vv.gameNetMgr.getShangZhuangDifen();

        cc.find('Canvas/popups/info').active = true;
        cc.find('Canvas/popups/menu').active = false;
    },

    onMenuButtonClicked: function () {
        cc.find('Canvas/popups/menu').active = !cc.find('Canvas/popups/menu').active;

        if (cc.find('Canvas/popups/menu').active == true) {
            cc.find('Canvas/main/menu').getComponent(cc.Sprite).spriteFrame = this._upMarkSpriteFrame;
        }
        else {
            cc.find('Canvas/main/menu').getComponent(cc.Sprite).spriteFrame = this._downMarkSpriteFrame;
        }
    },

    onMenuSceneMaskClicked: function () {
        cc.find('Canvas/popups/menu').active = false;
        cc.find('Canvas/main/menu').getComponent(cc.Sprite).spriteFrame = this._downMarkSpriteFrame;
    },

    /*
     'exit' message

     when user click 'leave room' button in menu, then server send 'exit_result' message to the the user and disconnect the connection.
     At the same time, server broadcast 'exit_notify_push' message all other users in the room.
     if game is already started, then user can not leave the room.
     if user is a creator of the room, then he can not leave the room.
     The creator can only destroy(dissolve) the room.

     If you are a observer, it is always possible to leave room.
     If you are a player and game is already started, it is always impossible to leave room.
     When you are a player and game is not started, if you are owner of a room, then would be dispress room, if not, simply leave room.

     'dispress message'

     if game is idle and user is a creator of the room, then user can send 'dispress' message to the server.
     this means that the room is destroyed.

     if server receive the 'dispress' message, then server broadcasts 'dispress_push' message to the all the user.
     and then disconnect the connection.

     */
    onMenuLeaveRoomButtonClicked: function () {
        cc.find('Canvas/popups/menu').active = false;
        cc.find('Canvas/main/menu').getComponent(cc.Sprite).spriteFrame = this._downMarkSpriteFrame;

        if (cc.vv.gameNetMgr.isObserver()) {
            cc.vv.wc.show();
            cc.vv.net.send('exit');
            return;
        }

        if (!cc.vv.gameNetMgr.gameIsIdle()) {
            cc.vv.alert.show('提示', '如果游戏已经开始，则不可以退出房间');
            return;
        }

        cc.vv.wc.show();
        if (cc.vv.gameNetMgr.isOwner()) {
            cc.vv.net.send('dispress');
        }
        else {
            cc.vv.net.send('exit');
        }
    },

    onMenuGameDissolveButtonClicked: function () {
        cc.find('Canvas/popups/menu').active = false;
        cc.find('Canvas/main/menu').getComponent(cc.Sprite).spriteFrame = this._downMarkSpriteFrame;

        if (cc.vv.gameNetMgr.isObserver()) {
            cc.vv.alert.show('提示', '如果你是旁观中，则不可以!');
            return;
        }

        if (cc.vv.gameNetMgr.gameIsIdle()) {
            cc.vv.alert.show('提示', '如果游戏未开始，则不可以');
            return;
        }

        cc.vv.net.send("dissolve_request");
    },

    onMenuSettingButtonClicked: function () {
        cc.find('Canvas/popups/setting').active = true;
        cc.find('Canvas/popups/menu').active = false;
        cc.find('Canvas/main/menu').getComponent(cc.Sprite).spriteFrame = this._downMarkSpriteFrame;
    },

    prepareGolds: function () {
        var goldsNode = cc.find('Canvas/golds');

        var goldSample = goldsNode.getChildByName('gold');

        goldSample.active = false;

        this._GOLD_POS_X = goldSample.x;
        this._GOLD_POS_Y = goldSample.y;

        var count = this._GOLD_COUNT;

        for (var i = 0; i < count - 1; i++) {
            var gold = cc.instantiate(goldSample);

            goldsNode.addChild(gold);
            this._golds.push(gold);
        }
    },

    /*
     move golds from given seat background to game difen position(canvas center) and hide them but last gold
     */

    goldsMoveFromSeatToGameDifen: function (fromLogicalSeatIndex) {
        var golds = this._golds;

        var fromSeatIndex = cc.vv.gamemgr.getSeatIndexInScene(fromLogicalSeatIndex);

        var fromSeatNode = this._seatNodeArray[fromSeatIndex];

        var fromSeatBackgroundNode = fromSeatNode.getChildByName('user_info_background');

        var fromWidth = fromSeatBackgroundNode.width * fromSeatBackgroundNode.scaleX;
        var fromHeight = fromSeatBackgroundNode.height * fromSeatBackgroundNode.scaleY;

        var toWidth = 100;
        var toHeight = 100;

        var startX = fromSeatNode.x;
        var startY = fromSeatNode.y;

        var endX = this._GOLD_POS_X;
        var endY = this._GOLD_POS_Y;

        var moveTime = 0.2;

        var delayTime = 0.05;

        for (var i = 0; i < golds.length; i++) {
            var deltaFromX = this.randomBetweenOnes() * fromWidth / 4;
            var deltaFromY = this.randomBetweenOnes() * fromHeight / 4;

            var deltaToX = 0;
            var deltaToY = 0;

            if (i < golds.length - 1) {
                deltaToX = this.randomBetweenOnes() * toWidth / 4;
                deltaToY = this.randomBetweenOnes() * toHeight / 4;
            }

            var actionMoveToStart = new cc.MoveTo(0, cc.p(startX + deltaFromX, startY + deltaFromY));
            var actionMoveToEnd = new cc.MoveTo(moveTime, cc.p(endX + deltaToX, endY + deltaToY));

            var delayForStart = new cc.DelayTime(delayTime * i);

            var delayForStay = new cc.DelayTime(0.4);

            var fnHide = function () {
                this.active = false;
            };

            var hideCallback = new cc.callFunc(fnHide, golds[i]);

            var seq;

            if (i < golds.length - 1) {
                seq = new cc.Sequence(actionMoveToStart, delayForStart, actionMoveToEnd, delayForStay, hideCallback);
            }
            else {
                seq = new cc.Sequence(actionMoveToStart, delayForStart, actionMoveToEnd, delayForStay);
            }

            golds[i].active = true;

            cc.director.getActionManager().removeAllActionsFromTarget(golds[i]);

            golds[i].runAction(seq);
        }
    },

    /*
     move golds to given seat background and hide them.
     golds will move from their original position.

     if lastGoldStay is true, last gold will never be moved.
     */

    goldsMoveFromScreenCenterToSeat: function (toLogicalSeatIndex, lastGoldStay) {
        var golds = this._golds;

        var toSeatIndex = cc.vv.gamemgr.getSeatIndexInScene(toLogicalSeatIndex);

        var toSeatNode = this._seatNodeArray[toSeatIndex];

        var toSeatBackgroundNode = toSeatNode.getChildByName('user_info_background');

        var toWidth = toSeatBackgroundNode.width * toSeatBackgroundNode.scaleX;
        var toHeight = toSeatBackgroundNode.height * toSeatBackgroundNode.scaleY;

        var endX = toSeatNode.x;
        var endY = toSeatNode.y;

        var startX = this._GOLD_POS_X;
        var startY = this._GOLD_POS_Y;

        var moveTime = 0.2;

        var delayTime = 0.05;

        for (var i = 0; i < golds.length; i++) {
            if (lastGoldStay == true && i == golds.length - 1) {
                continue;
            }

            var deltaToX = this.randomBetweenOnes() * toWidth / 4;
            var deltaToY = this.randomBetweenOnes() * toHeight / 4;

            var actionMoveToStart = new cc.MoveTo(0, cc.p(startX, startY));
            var actionMoveToEnd = new cc.MoveTo(moveTime, cc.p(endX + deltaToX, endY + deltaToY));

            var delayForStart = new cc.DelayTime(delayTime * i);

            var delayForStay = new cc.DelayTime(0.4);

            var fnHide = function () {
                this.active = false;
            };

            var hideCallback = new cc.callFunc(fnHide, golds[i]);

            var seq = new cc.Sequence(delayForStart, actionMoveToStart, actionMoveToEnd, delayForStay, hideCallback);

            golds[i].active = true;

            cc.director.getActionManager().removeAllActionsFromTarget(golds[i]);

            golds[i].runAction(seq);
        }
    },

    onAutoExecuteLiangpai: function () {
        var self = this;

        if (this._cuoPaiButton.active && this._fanPaiButton.active) {
            this.onFanPaiButtonClicked();
            setTimeout(function () {
                if (self._liangPaiButton == null) {
                    return;
                }

                self._liangPaiButton.active = false;

                self.setMessage('请等待其他玩家亮牌');

                var cards = cc.vv.gameNetMgr.getMySeat().holds;

                if (cards && cards.length != 2) {
                    return;
                }

                var soundUrl = cc.vv.gamemgr.getSoundUrlFromCards(cards);

                cc.vv.audioMgr.playSFX(soundUrl);
            }, 1000);
        }
        else if (cc.vv.cuopai && cc.vv.cuopai.isActive()) {
            cc.vv.cuopai.runExitAction();
            cc.vv.cuopai.hide();
            this.onAfterCuopai();

            this._liangPaiButton.active = false;

            this.setMessage('请等待其他玩家亮牌');

            var cards = cc.vv.gameNetMgr.getMySeat().holds;

            var soundUrl = cc.vv.gamemgr.getSoundUrlFromCards(cards);

            cc.vv.audioMgr.playSFX(soundUrl);
        }
        else if (this._liangPaiButton.active) {
            this._liangPaiButton.active = false;

            this.setMessage('请等待其他玩家亮牌');

            var cards = cc.vv.gameNetMgr.getMySeat().holds;

            var soundUrl = cc.vv.gamemgr.getSoundUrlFromCards(cards);

            cc.vv.audioMgr.playSFX(soundUrl);
        }
    },

    onGameExecuteAutoOperation: function () {
        var state = cc.vv.gameNetMgr.getGameState();

        if (state == 'dingdifen') {
            cc.vv.dingdifen.hide();

            cc.info("onGameExecuteAutoOperation dingdifen");
        } else if (state == 'liangpai') {
            this.onAutoExecuteLiangpai();

            cc.info("onGameExecuteAutoOperation liangpai")
        } else if (state == 'bipai') {
        } else if (state == 'ready') {
            this._zhunBeiButton.active = false;

            this.initAllCards();
            cc.vv.gameNetMgr.initAllCards();

            this.setMessage('请等待其他玩家准备');

            cc.info("onGameExecuteAutoOperation linagpai")
        } else if (state == 'ask_keep_zhuang') {
            if (cc.vv.gameNetMgr.isZhuang()) {
                cc.find('Canvas/dingzhuang').active = false;

                cc.info("onGameExecuteAutoOperation ask_keep_zhuang")
            }
        } else {
        }
    },

    getDebugString: function () {
        var string;

        string = 'gamestate: ' + cc.vv.gameNetMgr.gamestate + "\n";
        string = string + 'numOfGames: ' + cc.vv.gameNetMgr.numOfGames + "\n";
        string = string + 'seatIndex: ' + cc.vv.gameNetMgr.seatIndex + "\n";
        string = string + 'turn: ' + cc.vv.gameNetMgr.turn + "\n";
        string = string + 'button: ' + cc.vv.gameNetMgr.button + "\n";
        string = string + 'oldButton: ' + cc.vv.gameNetMgr.oldButton + "\n";
        string = string + 'isOver: ' + cc.vv.gameNetMgr.isOver + "\n";
        string = string + 'dissoveData: ' + cc.vv.gameNetMgr.dissoveData + "\n";
        string = string + 'difen: ' + cc.vv.gameNetMgr.difen + "\n";

        for (var i = 0; i < 6; i++) {
            string = string + 'seat' + i + JSON.stringify(cc.vv.gameNetMgr.seats[i]) + '\n';
        }

        return string;
    },

    onDebugButtonClicked: function () {
        return;

        var debugNode = cc.find('Canvas/debug_info');

        debugNode.getComponent(cc.Label).string = this.getDebugString();

        debugNode.active = !debugNode.active;
    },

    onDestroy: function () {
        cc.director.getActionManager().removeAllActions();
    }
    });
