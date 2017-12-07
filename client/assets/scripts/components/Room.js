cc.Class({
    extends: cc.Component,

    properties: {
        _mySeat:null,
        _seats:[],
        _voiceMsgQueue: []
    },

    onLoad: function () {
        this._mySeat = this.node.getChildByName('my_seat').getComponent('Seat');

        this._seats.push(this._mySeat);

        var otherSeatsNode = this.node.getChildByName('other_seats');

        for(var i = 0; i < otherSeatsNode.children.length; ++i){
            this._seats.push(otherSeatsNode.children[i].getComponent('Seat'));
        }

        this.initView();
    },

    initView: function () {
        this.refreshSeats();

        var totalSeatCount = cc.vv.gameNetMgr.getValidSeatCount();

        for(var i = 0; i < totalSeatCount; ++i){
            var seatData = cc.vv.gameNetMgr.getSeat(i);

            if (seatData.online == true) {
                var seatIndexInScene = cc.vv.gamemgr.getSeatIndexInScene(seatData.seatIndex);

                this._seats[seatIndexInScene].highLightReady();
            }
        }

        this.initEventHandlers();
        this.initRoomInfo();
    },

    initSeats: function () {
        for(var i = 0; i < this._seats.length; ++i){
            this._seats[i].setInfo('');
            this._seats[i].setReady(false);
            this._seats[i].setOffline(true);
            this._seats[i].setID(null);
            this._seats[i].setDifen(-1);
            this._seats[i].setZhuang(false);
            this._seats[i].setDe(false);
            this._seats[i].setTian(false);
        }
    },

    // 전체 자리를 초기화하고 갱신한다.
    //zhuang 부호 action을 실행한다.

    refreshSeats: function () {
        this.initSeats();

        var seats = cc.vv.gameNetMgr.seats;

        var totalSeatCount = cc.vv.gameNetMgr.getValidSeatCount();

        for (var i = 0; i < totalSeatCount; ++i) {
            this.refreshSingleSeat(seats[i]);
        }

        this.doZhuangSignMoveAction();
    },

    doZhuangSignMoveAction: function () {
        var currentZhuangSeatIndex = cc.vv.gameNetMgr.getZhuangSeatIndex();
        var oldZhuangSeatIndex = cc.vv.gameNetMgr.oldButton;

        var time = 1;

        if(currentZhuangSeatIndex >= 0 && oldZhuangSeatIndex >= 0 && currentZhuangSeatIndex != oldZhuangSeatIndex){
            var currentZhuangSeat = this._seats[cc.vv.gamemgr.getSeatIndexInScene(currentZhuangSeatIndex)];

            currentZhuangSeat.setZhuang(false);

            var oldZhuangSeat = this._seats[cc.vv.gamemgr.getSeatIndexInScene(oldZhuangSeatIndex)];

            var currentZhuangSignNode = currentZhuangSeat.getZhuangNode();
            var oldZhuangSignNode = oldZhuangSeat.getZhuangNode();

            var zhuangSignTemp = cc.find('Canvas/zhuang_temp');

            var startPos = oldZhuangSignNode.getParent().convertToWorldSpace(oldZhuangSignNode.getPosition());
            var endPos = currentZhuangSignNode.getParent().convertToWorldSpace(currentZhuangSignNode.getPosition());

            var actionBackToOld =  new cc.MoveTo(0, cc.p(startPos.x - 640, startPos.y - 360));
            var actionMoveToZhuang =  new cc.MoveTo(time, cc.p(endPos.x - 640, endPos.y - 360));

            var endActionCallback = new cc.callFunc(function(){
                currentZhuangSeat.setZhuang(true);
                currentZhuangSeat.highLightZhuang();
                zhuangSignTemp.active = false;
            });

            var seq = new cc.Sequence(actionBackToOld, actionMoveToZhuang, endActionCallback);

            oldZhuangSeat.setZhuang(false);
            zhuangSignTemp.active = true;
            zhuangSignTemp.runAction(seq);
        }
        else if(currentZhuangSeatIndex >= 0 && oldZhuangSeatIndex == -1 && currentZhuangSeatIndex != oldZhuangSeatIndex){
            var currentZhuangSeat = this._seats[cc.vv.gamemgr.getSeatIndexInScene(currentZhuangSeatIndex)];

            currentZhuangSeat.setZhuang(false);

            var currentZhuangSignNode = currentZhuangSeat.getZhuangNode();

            var zhuangSingTmp = cc.find('Canvas/zhuang_temp');

            var startPos = cc.p(0, 0);
            var endPos = currentZhuangSignNode.getParent().convertToWorldSpace(currentZhuangSignNode.getPosition());

            var actionToStart =  new cc.MoveTo(0, startPos);
            var actionMoveToZhuang =  new cc.MoveTo(time, cc.p(endPos.x - 640, endPos.y - 360));

            var endActionCallback = new cc.callFunc(function(){
                currentZhuangSeat.setZhuang(true);
                currentZhuangSeat.highLightZhuang();
                zhuangSingTmp.active = false;
            });

            var seq = new cc.Sequence(actionToStart, actionMoveToZhuang, endActionCallback);

            zhuangSingTmp.active = true;
            zhuangSingTmp.runAction(seq);
        }
        else {

        }

        cc.vv.gameNetMgr.oldButton = currentZhuangSeatIndex;
    },

    refreshSingleSeat:function(seat){
        var index = cc.vv.gamemgr.getSeatIndexInScene(seat.seatIndex);

        var isOffline = !seat.online;
        var isZhuang = seat.seatIndex == cc.vv.gameNetMgr.getZhuangSeatIndex();

        this._seats[index].setInfo(seat.name,seat.score);
        this._seats[index].setReady(seat.ready);
        this._seats[index].setOffline(isOffline);
        this._seats[index].setID(seat.userId);
        this._seats[index].setDifen(seat.difen);
        this._seats[index].setZhuang(isZhuang);

        if(cc.vv.gameNetMgr.gamestate == "bipai") {
            this._seats[index].setTian(seat.seatIndex == cc.vv.gameNetMgr.firstBipaiSeatIndex);
            this._seats[index].setDe(seat.seatIndex == cc.vv.gameNetMgr.lastBipaiSeatIndex);
        }
        else {
            this._seats[index].setDe(false);
            this._seats[index].setTian(false);
        }
    },

    initRoomInfo: function() {
        cc.find('Canvas/room_info/room_number').getComponent(cc.Label).string = cc.vv.gameNetMgr.roomId;

        // 1: 积分制 2: 比例制

        var difenType = cc.vv.gameNetMgr.getDifenType();

        if (difenType == 1) {
            cc.find('Canvas/room_info/difen').getComponent(cc.Label).string = '20, 40, 60, 80, 100分';
        }
        else if (difenType == 2) {
            cc.find('Canvas/room_info/difen').getComponent(cc.Label).string = '20分, 10, 30, 50, 100%';
        }
        else {
            throw new Error('');
        }

        this.refreshGameNumberInfo();
    },

    refreshGameNumberInfo: function() {
        if(cc.vv.gameNetMgr.gamestate == "") {
            cc.find('Canvas/room_info/jushu').getComponent(cc.Label).string = '';
            return;
        }

        if (cc.vv.gameNetMgr.getZhuangSeatIndex()  != -1) {
            var zhuangName = cc.vv.gameNetMgr.getZhuangName();
            cc.find('Canvas/room_info/jushu').getComponent(cc.Label).string = zhuangName + '庄/' + cc.vv.gameNetMgr.getGameNum() + '局';
        }
        else {
            cc.find('Canvas/room_info/jushu').getComponent(cc.Label).string = '';
        }
    },

    //set message string and show it.
    setMessage: function(msg) {
        cc.find('Canvas/message/message').getComponent(cc.Label).string = msg;
        cc.find('Canvas/message').active = true;
    },

    hideMessage: function() {
        cc.find('Canvas/message').active = false;
    },

    onInviteFriendClicked: function(){
        var roomid = cc.vv.userMgr.roomId;

        if(!roomid){
            roomid = cc.vv.gameNetMgr.roomId;
        }

        cc.info("Room Invite. roomid: " + roomid);
        cc.vv.anysdkMgr.shareRoom("wechat: 二八小九", "yjdlsoftscxj://xiaojiu/?roomid=" + roomid,"二八小九。 房间号:" + roomid);
    },

    initEventHandlers: function(){
        var self = this;

        this.node.on('seat_ready',function(data){
            self.onSeatReady();
        });

        this.node.on('room_full',function(data){
            self.onRoomFull();
        });

        this.node.on('new_user',function(data){
            self.onNewUser(data);
        });

        this.node.on('user_ready',function(data){
            self.onUserReady(data);
        });

        this.node.on('game_begin',function(data){
            self.onGameBegin(data);
        });

        //봉사기에서 게임의 국수에 대한 정보가 올 때
        this.node.on('game_num', function (data) {
            self.onGameNum(data);
        });

        //봉사기가 어느 사용자가 판돈을 댔다고 통지하였을 때
        this.node.on('game_dingdifen_notify', function (data) {
            self.onGameDingDifenNotify(data);
        });

        //게임의 국수가 변하였을 때
        this.node.on('game_num', function (data) {
            self.onGameNum(data);
        });

        this.node.on('user_connected',function(data){
            self.onUserConnected(data);
        });

        this.node.on('user_disconnected',function(data){
            self.onUserDisconnected(data);
        });

        this.node.on('game_bipai_result',function(data){
            self.onGameBipaiResult(data);
        });

        this.node.on('game_bipai_finish',function(data){
            self.onGameBipaiFinish(data);
        });

        this.node.on('game_change_zhuang',function(data){
            self.onGameChangeZhuang(data);
        });

        this.node.on('game_xiazhuang',function(data){
            self.onGameXiazhuang(data);
        });

        this.node.on('exit_notify',function(data){
            self.onGameExitNotify(data);
        });

        this.node.on('quick_chat_push',function(data){
            self.onQuickChat(data);
        });

        this.node.on('emoji_push',function(data){
            self.onEmoji(data);
        });

        this.node.on('voice_msg',function(data){
            var data = data.detail;

            self._voiceMsgQueue.push(data);
            self.playVoice();
        });

        this.node.on('game_last_bifai_seat_index', function (data) {
            self.onGameLastSeatIndex(data);
        });

        this.node.on('game_request_ready', function (data) {
            self.refreshSeats();
        });

        this.node.on('game_ask_keep_zhuang', function (data) {
            self.refreshSeats();
        });
    },

    //않기 단추를 누른 후에 봉사기에서 자리를 주었을 때
    //자리배치가 달라진다.

    onSeatReady: function () {
        this.refreshSeats();

        var seatIndex = cc.vv.gameNetMgr.getMySeatIndex();

        var seatIndexInScene = cc.vv.gamemgr.getSeatIndexInScene(seatIndex);

        this._seats[seatIndexInScene].highLightReady();
    },

    onRoomFull: function () {
        cc.vv.wc.hide();

        cc.vv.alert.show('提示',"房间满了!");
    },

    onNewUser:function (data) {
        var seatIndex = data.detail.seatIndex;

        this.refreshSeats();

        var seatIndexInScene = cc.vv.gamemgr.getSeatIndexInScene(seatIndex);

        this._seats[seatIndexInScene].highLightReady();
    },

    //봉사기에서 어떤 사용자가 준비하였다고 통보가 왔을 때
    //자리배치는 달라지지 않는다.
    //해당한 위치에서 ready animation 을 실행시킨다.
    //이 action은 scale변화이다.

    onUserReady:function (data) {
        var userId = data.detail.userId;

        var seatIndex = cc.vv.gameNetMgr.getSeatIndexByID(userId);

        var seatIndexInScene = cc.vv.gamemgr.getSeatIndexInScene(seatIndex);

        this._seats[seatIndexInScene].highLightReady();
    },

    //봉사기가 어느 사용자가 판돈을 댔다고 통지하였을 때
    onGameDingDifenNotify:function (data) {
        //판돈을 댄 사용자의 seatIndex얻기

        var realData = data.detail;

        var seatIndex = cc.vv.gameNetMgr.getSeatIndexByID(realData.userId);

        var seatIndexInScene = cc.vv.gamemgr.getSeatIndexInScene(seatIndex);
        var difen = realData.difen;
        var score = realData.score;

        cc.info('A user in ' + seatIndex + "' seat have determined the difen!");

        this._seats[seatIndexInScene].setDifen(difen);
        this._seats[seatIndexInScene].setScore(score);
    },

    onGameBegin:function (data) {
        cc.vv.wc.hide();
        var zhuangName = cc.vv.gameNetMgr.getZhuangName();

        this.setMessage(zhuangName + ' 成为庄家');

        this.refreshSingleSeat(cc.vv.gameNetMgr.getZhuangSeatData());

        var logicalSeatIndex = cc.vv.gameNetMgr.getZhuangSeatIndex();
        var seatIndex = cc.vv.gamemgr.getSeatIndexInScene(logicalSeatIndex);

        this._seats[seatIndex].highLightZhuang();

        this.doZhuangSignMoveAction();
    },

    onGameNum:function (data) {
        this.refreshGameNumberInfo();
    },

    //원래 않았던 user가 offline되였다가 다시 들어오는 경우
    onUserConnected: function (data) {
        var userId = data.detail.userId;

        var seat = cc.vv.gameNetMgr.getSeatByID(userId);

        cc.assert(seat != null, 'seat could not be null. userId: ' + userId);

        var index = cc.vv.gamemgr.getSeatIndexInScene(seat.seatIndex);

        this._seats[index].setOffline(false);
    },

    //원래 않았던 user가 disconnect되는 경우
    onUserDisconnected: function (data) {
        var userId = data.detail.userId;

        var seat = cc.vv.gameNetMgr.getSeatByID(userId);

        if(seat == null) {
            return;
        }

        var index = cc.vv.gamemgr.getSeatIndexInScene(seat.seatIndex);

        this._seats[index].setOffline(true);
    },

    onGameBipaiResult: function (data) {
        var isWinZhuang = data.detail.isWinZhuang;

        var userId = data.detail.userId;

        var seatIndex = null;

        if (isWinZhuang) {
            seatIndex = cc.vv.gameNetMgr.getZhuangSeatIndex();
        }
        else {
            seatIndex = cc.vv.gameNetMgr.getSeatIndexByID(userId);
        }

        this.refreshSeats();

        seatIndex = cc.vv.gamemgr.getSeatIndexInScene(seatIndex);

        this._seats[seatIndex].highLightWin();
    },

    onGameBipaiFinish: function(data) {
        this.refreshSeats();
    },

    onGameChangeZhuang: function () {
        this.refreshSeats();
    },

    onGameXiazhuang:function (data) {
        this.refreshSeats();
        this.refreshGameNumberInfo();
    },

    // when one player which take a seat leaves the room.
    onGameExitNotify:function (data) {
        this.refreshSeats();
    },

    onQuickChat:function(data) {
        var data = data.detail;

        var logicalSeatIndex = cc.vv.gameNetMgr.getSeatIndexByID(data.sender);
        var localIdx = cc.vv.gamemgr.getSeatIndexInScene(logicalSeatIndex);

        var index = data.content;
        var info = cc.vv.chat.getQuickChatInfo(index);

        if(this._seats[localIdx] == null) {
            return;
        }

        this._seats[localIdx].chat(info.content);

        //someone send to me chat message
        if (cc.vv.gameNetMgr.getMySeatIndex() != logicalSeatIndex) {
            var soundUrl = 'duanju/' + (info.index + 1) + '.mp3';

            cc.vv.audioMgr.playSFX(soundUrl);
        }
    },

    onEmoji:function (data) {
        var data = data.detail;

        var logicalSeatIndex = cc.vv.gameNetMgr.getSeatIndexByID(data.sender);
        var localIdx = cc.vv.gamemgr.getSeatIndexInScene(logicalSeatIndex);

        this._seats[localIdx].emoji(data.content);
    },

    onPlayerOver:function(){
        cc.vv.audioMgr.resumeAll();
        cc.log("onPlayCallback:" + this._playingSeat);

        var localIndex = this._playingSeat;

        this._playingSeat = null;
        this._seats[localIndex].voiceMsg(false);
    },

    onDestroy:function(){
        cc.vv.voiceMgr.stop();
    },

    playVoice: function () {
        if(this._playingSeat == null && this._voiceMsgQueue.length){
            cc.info("playVoice");

            var data = this._voiceMsgQueue.shift();
            var idx = cc.vv.gameNetMgr.getSeatIndexByID(data.sender);

            var localIndex = cc.vv.gamemgr.getSeatIndexInScene(idx);

            this._playingSeat = localIndex;
            this._seats[localIndex].voiceMsg(true);

            var msgInfo = JSON.parse(data.content);

            var msgfile = "voicemsg.amr";

            cc.log(msgInfo.msg.length);
            cc.vv.voiceMgr.writeVoice(msgfile,msgInfo.msg);
            cc.vv.voiceMgr.play(msgfile);
            this._lastPlayTime = Date.now() + msgInfo.time;
        }
    },

    update: function (dt) {
        var minutes = Math.floor(Date.now()/1000/60);

        if(this._lastMinute != minutes){
            this._lastMinute = minutes;

            var date = new Date();
            var h = date.getHours();
            h = h < 10? "0"+h:h;

            var m = date.getMinutes();
            m = m < 10? "0" + m:m;

            if (this._timeLabel) 
                this._timeLabel.string = "" + h + ":" + m;
        }

        if(this._lastPlayTime != null){
            if(Date.now() > this._lastPlayTime + 200){
                this.onPlayerOver();
                this._lastPlayTime = null;
            }
        }
        else{
            this.playVoice();
        }
    },

    onGameLastSeatIndex: function (data) {
        if(cc.vv.gameNetMgr.getValidSeatCount() <= 2){
            return;
        }

        var firstBipaiSeatIndex = data.detail.firstBipaiSeatIndex;
        var lastBipaiSeatIndex = data.detail.lastBipaiSeatIndex;

        var index = cc.vv.gamemgr.getSeatIndexInScene(firstBipaiSeatIndex);

        this._seats[index].setDe(true);

        index = cc.vv.gamemgr.getSeatIndexInScene(lastBipaiSeatIndex);

        this._seats[index].setTian(true);
    }
});
