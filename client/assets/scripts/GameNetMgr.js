cc.Class({
    extends: cc.Component,

    properties: {
        dataEventHandler:null,

        /* 현재 들어간 방(게임이 시작될수도 있고 안되였을수도 있다) 의 번호
           봉사기와 소케트련결이 확립된후 "room_data_ready"통보가 올 때 값이 설정된다.

           언제 다시 null 로 되는가?
           게임이 시작되지 않은 어떤 방에 들어갔다가 다시 나올때 봉사기가 "exit_result" 통보를 보낼때
           방이 해산될때 dispress 통보
           게임이 끝나서 소케트련결이 차단될 때


        */

        roomId: null,
        numOfGames:0,
        seatIndex:-1,
        seats:null,
        turn:-1,
        firstBipaiSeatIndex: -1,
        lastBipaiSeatIndex: -1,
        button:-1,  //선단의 seatIndex
        oldButton: -1,
        gamestate:'',
        isOver:false,
        dissoveData:null,
        difen:0
    },
    
    reset:function(){
        this.turn = -1;
		this.difen = 0; // 게임의 판돈
        this.button = -1;
        this.gamestate = "";

        if( this.seats == null) {
            return;
        }

        for(var i = 0; i < this.seats.length; ++i){
            this.seats[i].holds = [];
            this.seats[i].ready = false;
            this.seats[i].difen = -1; //판돈
        }
    },
    
    dispatchEvent: function(event, data){
        if(this.dataEventHandler){
            this.dataEventHandler.emit(event,data);
        }    
    },
    
    getSeatIndexByID:function(userId){
        for(var i = 0; i < this.seats.length; ++i){
            var s = this.seats[i];
            if(s.userId == userId){
                return i;
            }
        }

        return -1;
    },

    getGameState: function() {
        return this.gamestate;
    },

    gameIsIdle: function() {
      return this.numOfGames == 0;
    },

    //방을 창조한 사람인가?
    isOwner:function(){
        return cc.vv.userMgr.userId == this.conf.creator;
    },

    isObserver: function() {
        return this.seatIndex == -1;
    },

    isPlayer: function() {
        return this.seatIndex != -1;
    },

    isCreator: function(seatIndex) {
        var userId = this.seats[seatIndex].userId;

        return userId == this.conf.creator;
    },

    //선단인가?
    isZhuang:function(){
        return this.seatIndex == this.button;
    },

    //지금 나의 차례인가?
    isMyTurn:function(){
        return this.seatIndex == this.turn;
    },

    isAllPlayerLiangPai:function () {
        for (var i = 0; i < this.getValidSeatCount(); i++) {
            var seatData = this.seats[i];

            if (seatData.liangPai == false){
                return false;
            }
        }

        return true;
    },

    //자리가 있는가?
    hasSeat: function() {
        return this.seatIndex >= 0;
    },

    //선단의 자리
    getZhuangSeatIndex: function() {
        return this.button;
    },

    getZhuangName: function(){
       cc.assert(this.button >=0, 'internal error');

       return this.seats[this.button].name;
    },

    getZhuangSeatData: function(){
        cc.assert(this.button >=0, 'internal error');

        return this.seats[this.button];
    },


    getSeatByID:function(userId){
        var seatIndex = this.getSeatIndexByID(userId);
        return this.seats[seatIndex];
    },

    //나의 자료
    getMySeat:function(){
        return this.seats[this.seatIndex];
    },

    getMySeatIndex:function(){
        return this.seatIndex;
    },

    getSeat: function(seatIndex) {
       return this.seats[seatIndex]
    },

    getSeats: function() {
        return this.seats;
    },

    getTurn: function() {
        return this.turn;
    },

    getGameNum: function() {
        return this.numOfGames;
    },
    
    //현재 방에 들어온 사용자의 수
    getOnlineUserCount: function () {
        var count = 0;

        for(var i = 0; i < this.seats.length; ++i) {
            var seat = this.seats[i];

            if (seat.online)
                count++;
        }

        return count;
    },

    isValidSeat:function(seatIndex) {
        var seat = this.seats[seatIndex];

        return seat.userId >0
    },

    isFapaiedSeat: function (seatIndex) {
        var seat = this.seats[seatIndex];

        return seat.holds.length == 2;
    },

    getValidSeatCount: function () {
        var count = 0;

        for(var i = 0; i < this.seats.length; ++i) {
            var seat = this.seats[i];

            if (seat.userId != null && seat.userId > 0) {
                count++;
            }
        }

        return count;
    },

    // 1: 1人1庄 2: 1人2庄
    getJushuType: function() {
        return this.conf.jushuType;
    },

    // 1: 积分制 2: 比例制
    getDifenType: function () {
       return this.conf.difenType;
    },

    getGameDifen: function() {
        return this.difen;
    },

    getShangZhuangDifen: function() {
        return this.conf.shangzhuangDifen;
    },

    isJifenZhi: function() {
       return this.conf.difenType == 1;
    },

    //게임의 상태가 판돈을 결정하는 상태인가를 반영한다.
    isDingDifenState: function(){
        return this.gamestate == 'dingdifen';
    },

    getMyDifen: function() {
        cc.assert(this.seatIndex != -1);

        return this.seats[this.seatIndex].difen;
    },

    initAllCards: function () {
        for (var i = 0; i < this.seats.length; i++) {
            this.seats[i].holds = [];
        }
    },

    setMyDifen: function(difen) {
      cc.assert(this.seatIndex != -1);

      this.seats[this.seatIndex].difen = difen;
    },

    initHandlers:function(){
        var self = this;

        cc.vv.net.addHandler("game_sync_push",function(data){
            self.gamestate = data.state;
            self.turn = data.turn;
            self.firstBipaiSeatIndex = data.firstBipaiSeatIndex;
            self.lastBipaiSeatIndex = data.lastBipaiSeatIndex;
            self.oldButton = self.button;
            self.button = data.button;
            self.difen = data.difen;

            for(var i = 0; i < self.seats.length; ++i){
                var seat = self.seats[i];

                var sd = data.seats[i];

                seat.holds = sd.holds;
                seat.difen = sd.difen;
                seat.score = sd.score;
                seat.liangPai = sd.liangPai;
                seat.bipai = sd.bipai;
                seat.ready = sd.ready;
                seat.autoOperationFireTime = sd.autoOperationFireTime;
            }
        });

        cc.vv.net.addHandler("disconnect",function(data){
            if(self.roomId == null){
                cc.director.loadScene("hall");
            }
            else{
                // when game is not exited, connection is disconnected.
                if(self.isOver == false){
                    cc.vv.userMgr.oldRoomId = self.roomId;
                    self.dispatchEvent("disconnect");
                }
                else{
                    self.roomId = null;
                }
            }
        });

        cc.vv.net.addHandler("user_disconnected_push",function(data){
            var userId = data.userId;
            var seat = self.getSeatByID(userId);

            if (seat == null) {
                cc.info('one observer state changed. userId: ' + userId);
            }
            else {
                seat.online = false;
            }

            self.dispatchEvent('user_disconnected',data);
        });

        //게임봉사기로부터 방에 대한 자료가 준비되였다고 통지가 왔을 때
        cc.vv.net.addHandler("room_data_ready",function(data){
            if(data.errcode === 0){
                var data = data.data;

                self.roomId = data.roomId;
                self.conf = data.conf;
                self.numOfGames = data.numOfGames;
                self.seats = data.seats;
                self.seatIndex = self.getSeatIndexByID(cc.vv.userMgr.userId);
                self.isOver = false;

                for (var i = 0; i < self.seats.length; i++) {
                    self.seats[i].holds = [];
                }
            }
            else{
                cc.warn(data.errmsg);
            }
        });

        cc.vv.net.addHandler("enter_room_failed",function(data) {
            cc.vv.wc.hide();
            cc.vv.alert.show("", data.errmsg);
        });

        //게임봉사기로부터 방에 들어갈 준비가 완료되였다고 통지가 왔을 때
        cc.vv.net.addHandler("enter_room_ready",function(data){
            cc.director.loadScene("game");
        });

        // 게임봉사기로부터 새로운 player가 방에 들어와 않을 때
        cc.vv.net.addHandler("new_user_comes_push", function(data){
            var seatIndex = data.seatIndex;

            if(self.seats[seatIndex].userId > 0){
                //원래 않았던 user가 다시 들어오는 경우

                cc.assert(data.userId == self.seats[seatIndex].userId, 'internal error');

                self.seats[seatIndex].online = true;
                self.seats[seatIndex].ready =  true;

                self.dispatchEvent('user_connected', data);
            }
            else{
                //새로운 user가 방에 들어와 않는 경우

                self.seats[seatIndex].userId = data.userId;
                self.seats[seatIndex].name = data.name;
                self.seats[seatIndex].ip = data.ip;

                self.seats[seatIndex].online = true;
                self.seats[seatIndex].ready = true;

                self.dispatchEvent('new_user', self.seats[seatIndex]);
            }
        });

        // 게임봉사기로부터 나를 위한 자리가 준비되였다고 통지가 왔을 때
        cc.vv.net.addHandler("seat_ready_push",function(data){
            self.seatIndex = data;
            var seatData = self.seats[self.seatIndex];

            seatData.userId = cc.vv.userMgr.userId;
            seatData.name = cc.vv.userMgr.userName;
            seatData.ip = cc.vv.userMgr.ip;
            seatData.online = true;

            self.dispatchEvent("seat_ready");
        });

        cc.vv.net.addHandler("insufficient_gem",function(data){
            cc.vv.wc.hide();
            cc.vv.alert.show("提示","房卡不足，不能坐下!");
        });

        cc.vv.net.addHandler("failed_get_gem",function(data){
            cc.vv.wc.hide();
            cc.vv.alert.show("提示","无法获取房卡!");
        });

        // 게임봉사기로부터 방이 꽉 차서 새로운 자리를 마련할수 없다고 통지가 왔을 때
        cc.vv.net.addHandler("room_full_push",function(data){
            self.dispatchEvent("room_full");
        });

        cc.vv.net.addHandler("game_begin_push",function(data){
            self.oldButton = self.button;
            self.button = data;
            self.turn = self.button + 1 ;
            self.turn = self.turn % self.getValidSeatCount();

            self.dispatchEvent('game_begin');
        });

        cc.vv.net.addHandler("game_num_push",function(data){
            self.numOfGames = data;
            self.dispatchEvent('game_num',data);
        });

        //봉사기로부터 판돈을 대라고 지령이 올 때
        cc.vv.net.addHandler("game_dingdifen_push",function(data){
            self.gamestate = 'dingdifen';
            self.dispatchEvent('game_dingdifen');
        });

        cc.vv.net.addHandler("game_dingdifen_notify_push",function(data){
            var seatIndex = self.getSeatIndexByID(data.userId);

            self.seats[seatIndex].difen = data.difen;
            self.seats[seatIndex].score = data.score;

            if (seatIndex == self.getZhuangSeatIndex()) {
                self.difen = data.difen;
            }

            self.dispatchEvent('game_dingdifen_notify',data);
        });

        cc.vv.net.addHandler("game_dingdifen_finish_push",function(data){
            self.dispatchEvent('game_dingdifen_finish',data);
        });

        //봉사기에서 패를 나누어줄 때
        cc.vv.net.addHandler("game_holds_push",function(data){
            self.gamestate = "fapai";

            for (var i = 0; i < self.getValidSeatCount(); i++) {
                self.seats[i].holds = [-1, -1];
            }

            if (self.isPlayer() ) {
                var seat = self.seats[self.seatIndex];

                seat.holds = data;

                for(var i = 0; i < self.seats.length; ++i){
                    var s = self.seats[i];

                    s.ready = false;
                }
            }

            self.dispatchEvent('game_holds');
        });

        cc.vv.net.addHandler("game_liangpai_notify_push",function(data){
            var userId = data.userId;

            var seat = self.getSeatByID(userId);

            seat.holds = data.holds;
            seat.liangPai = true;

            self.dispatchEvent('game_liangpai_notify', userId);
        });

        cc.vv.net.addHandler("game_start_bifai_push",function(data){
            self.gamestate = 'bipai';

            self.turn = data;

            self.dispatchEvent('game_start_bifai', data);
        });

        cc.vv.net.addHandler("game_bipai_result_push",function(data){
            self.difen = data.gameDifen;

            var seatData = self.getSeatByID(data.userId);

            seatData.score = data.score;

            self.dispatchEvent('game_bipai_result', data);
        });

        //모든 사용자들에 대해 패비교가 끝났을 때
        cc.vv.net.addHandler("game_bipai_finish_push",function(data){
            for(var i = 0; i < self.seats.length; i++) {
                self.seats[i].difen = -1;
                self.seats[i].ready = false;
            }

            self.dispatchEvent('game_bipai_finish');
        });

        cc.vv.net.addHandler("game_request_ready_push",function(data){
            self.gamestate = 'ready';
            self.firstBipaiSeatIndex = -1;
            self.lastBipaiSeatIndex = -1;

            self.dispatchEvent('game_request_ready');
        });

        //판이 말랐을 때
        cc.vv.net.addHandler("game_change_zhuang_push",function(data){
            self.oldButton = self.button;
            self.button = data.button;
            self.difen = data.difen;
            self.turn = data.turn;

            self.dispatchEvent('game_change_zhuang', data);
        });

        cc.vv.net.addHandler("game_ask_keep_zhuang_push",function(data){
            self.gamestate = 'ask_keep_zhuang';
            self.firstBipaiSeatIndex = -1;
            self.lastBipaiSeatIndex = -1;
            self.dispatchEvent('game_ask_keep_zhuang');
        });

        cc.vv.net.addHandler("game_xiazhuang_push",function(data){
            self.dispatchEvent('game_xiazhuang', data);
        });

        cc.vv.net.addHandler("user_ready_push",function(data){
            var userId = data.userId;
            var seat = self.getSeatByID(userId);

            seat.ready = data.ready;
            self.dispatchEvent('user_ready',seat);
        });

        /**
         *  when user click 'leave room' in menu, then client send 'exit' message to the server.
         *  then server send 'exit_result' to the client and disconnect the connection.
         */
        cc.vv.net.addHandler("exit_result",function(data){
            self.roomId = null;
            self.turn = -1;
            self.difen = 0;
            self.seats = null;
            self.button = -1;
            self.oldButton = -1;
            self.gamestate = '';
            self.numOfGames = 0;
            self.seatIndex = -1;
        });

        cc.vv.net.addHandler("exit_notify_push",function(data){
            var userId = data;

            var seat = self.getSeatByID(userId);

            if (seat == null){
                cc.info('observer leave room. userId: ' + userId);
                return;
            }

            cc.assert(seat != null, 'userId: ' + userId);

            var seatIndex = seat.seatIndex;

            var seats = self.seats;

            cc.assert(seats[seatIndex].userId == userId);

            //remove seat;
            seats.splice(seatIndex, 1);

            //add new empty one seat

            seats.push({
                userId:0,
                ip:'',
                score:0,
                name:'',
                online:false,
                ready:false,
                seatIndex: -1,
                difen: -1
            });

            //reassign seatIndex for all seats.
            for(var i = 0; i < 6; ++i) {
                seats[i].seatIndex = i;
            }

            //if my seat is after exiting seat, update my seatIndex
            if (self.seatIndex != -1 && self.seatIndex > seatIndex ) {
                self.seatIndex = self.seatIndex - 1;
            }

            self.dispatchEvent("exit_notify", data);
        });

        /**
         * if game is idle and user is a creator of the room, then user can send 'dispress' message to the server.
         * this means that the room is destroyed.
         *
         * if server receive the 'dispress' message, then server broadcasts 'dispress_push' message to the all the user.
         * and then disconnect the connection.
         */

        cc.vv.net.addHandler("dispress_push",function(data){
            cc.vv.gameNetMgr.roomId = null;
        });

        /*
         * when the game is normally exited, then server broadcasts the 'game_over_push' message with game result.
         */

        cc.vv.net.addHandler("game_over_push",function(data){
            var results = data.results;

            for(var i = 0; i <  self.seats.length; ++i){
                self.seats[i].score = results.length == 0? 0:results[i].score;
            }

            self.isOver = true;

            self.dispatchEvent('game_over',results);
        });
        
        cc.vv.net.addHandler("chat_push",function(data){
            self.dispatchEvent("chat_push",data);    
        });
        
        cc.vv.net.addHandler("quick_chat_push",function(data){
            self.dispatchEvent("quick_chat_push",data);
        });
        
        cc.vv.net.addHandler("emoji_push",function(data){
            self.dispatchEvent("emoji_push",data);
        });
        
        cc.vv.net.addHandler("dissolve_notice_push",function(data){
            self.dissoveData = data;
            self.dispatchEvent("dissolve_notice",data);
        });
        
        cc.vv.net.addHandler("dissolve_cancel_push",function(data){
            self.dissoveData = null;
            self.dispatchEvent("dissolve_cancel",data);
        });
        
        cc.vv.net.addHandler("voice_msg_push",function(data){
            self.dispatchEvent("voice_msg",data);
        });

        cc.vv.net.addHandler("game_auto_operation_fire_time_push",function(data){
            if(self.gamestate == 'bipai') {
                return;
            }

            //already xiazhu, so no need to start count down.
            if(self.gamestate == 'dingdifen') {
                if (self.isZhuang() && self.difen > 0) {
                    return;
                }
            }

            //if you are not zhuang, then no need to count down.
            if(self.gamestate == 'ask_keep_zhuang') {
                if (self.isZhuang() == false ) {
                    return;
                }
            }

            self.dispatchEvent("game_auto_operation_fire_time", data);
        });

        cc.vv.net.addHandler("game_liangpai_started_push",function(data){
            self.gamestate = 'liangpai';
        });

        cc.vv.net.addHandler("game_execute_auto_operation_push",function(data){
            self.dispatchEvent("game_execute_auto_operation",data);
        });

        cc.vv.net.addHandler("game_bipai_seat_index_push",function(data){
            self.firstBipaiSeatIndex = data.firstBipaiSeatIndex;
            self.lastBipaiSeatIndex = data.lastBipaiSeatIndex;

            self.dispatchEvent("game_bipai_seat_index", data);
        });
    },
    
    //게임봉사기와의 web socket 련결을 시도하고 성공여부에 따라 해당한 처리를 진행한다.
    connectGameServer:function(data){
        cc.vv.net.ip = data.ip + ":" + data.port;
        cc.info('Trying to connect game server: ' + cc.vv.net.ip);

        //련결이 성공한 경우의 처리부
        var onConnectOK = function(){

            var sd = {
                token:data.token,
                roomid:data.roomid,
                time:data.time,
                sign:data.sign
            };

            //련결이 성공했으므로 방에 들어가겠다고 요청
            cc.vv.net.send("request_enter_room",sd);
        };

        //련결이 실패한 경우의 처리부
        var onConnectFailed = function(){
            cc.warn('Failed to connect to game server!');
            cc.vv.wc.hide();
        };

        //련결을 시도하는동안의 대면부현시
        cc.vv.wc.show("正在进入房间: " + data.roomid);

        //련결을 시도한다.
        cc.vv.net.connect(onConnectOK,onConnectFailed);
    }
});
