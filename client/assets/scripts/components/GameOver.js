cc.Class({
    extends: cc.Component,

    properties: {
        _gameOverNode: null
    },

    onLoad: function () {
        this._gameOverNode = cc.find("popups/game_over",this.node);
        this._gameOverNode.active = false;

        var self = this;

        this.node.on('game_over', function(data){
            self.setInfo();
            self._gameOverNode.active = true;
        });
    },

    setInfo: function(){
        var headerNode = this._gameOverNode.getChildByName("header");

        headerNode.getChildByName("room_number").getComponent(cc.Label).string = cc.vv.gameNetMgr.roomId;
        headerNode.getChildByName("jushu").getComponent(cc.Label).string = cc.vv.gameNetMgr.numOfGames;
        headerNode.getChildByName("fenshu").getComponent(cc.Label).string = cc.vv.gameNetMgr.getShangZhuangDifen();
        headerNode.getChildByName("date_time").getComponent(cc.Label).string = this.dateFormat(Date.now());

        var seats = cc.vv.gameNetMgr.seats;

        var scoreArray = [];

        for(var i = 0; i < seats.length; i++) {
            if(seats[i].userId <=0) {
                continue;
            }

            scoreArray.push(seats[i].score);
        }

        var scoreMax = Math.max.apply(null, scoreArray);
        var scoreMin = Math.min.apply(null, scoreArray);

        var playerNode = null;

        for( i = 0; i < seats.length; i++){
            var seat = seats[i];

            playerNode = cc.find("player" + i, this._gameOverNode);

            if (i  < cc.vv.gameNetMgr.getValidSeatCount()) {
                playerNode.active = true;
            }
            else
            {
                playerNode.active = false;
                continue;
            }

            playerNode.getChildByName("name").getComponent(cc.Label).string = seat.name;
            playerNode.getChildByName("id").getComponent(cc.Label).string = "ID: " + seat.userId;
            playerNode.getChildByName("icon").getComponent('ImageLoader').setUserID(seat.userId);

            var scoreValueNode = playerNode.getChildByName("score");

            scoreValueNode.color = seat.score > 0 ? cc.hexToColor("#FF3333") : cc.hexToColor("#33AA33");

            if (seat.score > 0) {
                scoreValueNode.getComponent(cc.Label).string = '+' + seat.score;
            }
            else {
                scoreValueNode.getComponent(cc.Label).string = seat.score;
            }

            playerNode.getChildByName("fangzhu_mark").active = cc.vv.gameNetMgr.isCreator(i);

            playerNode.getChildByName("dayingjia_mark").active = seat.score == scoreMax;
            playerNode.getChildByName("tuhao_mark").active = seat.score == scoreMin;
        }
    },

    onBtnBackToHallClicked: function(){
        cc.vv.gameNetMgr.roomId = null;
        cc.director.loadScene('hall');
    },

    onBtnWechatShareClicked: function(){
        if(cc.sys.isNative == false){
            return;
        }

        cc.vv.anysdkMgr.shareResult();
    },

    dateFormat:function(time){
        var date = new Date(time);
        var year = date.getFullYear();
        var month = date.getMonth() + 1;

        month = month >= 10? month : ("0"+month);

        var day = date.getDate();

        day = day >= 10? day : ("0"+day);

        var h = date.getHours();

        h = h >= 10? h : ("0"+h);

        var m = date.getMinutes();

        m = m >= 10? m : ("0"+m);

        var s = date.getSeconds();

        s = s >= 10? s : ("0"+s);

        return year + "/" + month + "/" + day + " " + h + ":" + m + ":" + s;
    }
});
