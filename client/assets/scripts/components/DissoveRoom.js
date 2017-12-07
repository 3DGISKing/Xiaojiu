cc.Class({
    extends: cc.Component,

    properties: {
        _endTime:-1,
        _playerNodeArray: [],
        _progressBar:null,
        _timeLabelNode:null,
        _remainingTime: 0 // in second
    },

    onLoad: function () {
        var layout_playersNode = cc.find('Canvas/popups/dissolve_room/layout_players');

        for (var i =0; i <  layout_playersNode.children.length; i++){
            this._playerNodeArray.push(layout_playersNode.children[i]);
        }

        for (i = 0;i < cc.vv.gameNetMgr.seats.length; i++) {
            if (i >= cc.vv.gameNetMgr.getValidSeatCount()) {
                this._playerNodeArray[i].active = false;
            }
            else
            {
                this._playerNodeArray[i].active = true;
                this.setPlayerInfo(i);
            }
        }

        this._progressBar = cc.find('Canvas/popups/dissolve_room/progressBar').getComponent(cc.ProgressBar);

        this._timeLabelNode = cc.find('Canvas/popups/dissolve_room/remaining_time');

        this.initEventHandler();
    },

    setPlayerInfo: function(seatIndex) {
        var seatData = cc.vv.gameNetMgr.getSeat(seatIndex);

        var userName = seatData.name;

        var playerNode = this._playerNodeArray[seatIndex];

        playerNode.getChildByName('name').getComponent(cc.Label).string = userName;
        playerNode.getChildByName('profile_image').getComponent('ImageLoader').setUserID(seatData.userId);
        playerNode.getChildByName('offline_sign').active = seatData.online == false;
    },

    setAgreeState:function(seatIndex, isAgree) {
        var playerNode = this._playerNodeArray[seatIndex];

        if (isAgree == true) {
            playerNode.getChildByName('label_agree').active = true;
            playerNode.getChildByName('label_queue').active = false;
        }
        else
        {
            playerNode.getChildByName('label_agree').active = false;
            playerNode.getChildByName('label_queue').active = true;
        }
    },

    initEventHandler: function () {
        var self = this;

        this.node.on("dissolve_notice",function(event){
            self.onDissolveNotice(event);
        });

        this.node.on("dissolve_cancel",function(event){
            self.onDissoveCancel();
        });

        this.node.on("game_over",function(event){
            self.onGameOver();
        });
    },

    onDissolveNotice:function(event) {
        if(cc.vv.gameNetMgr.isObserver()) {
            return;
        }

        this._progressBar.progress = 1;

        var data = event.detail;

        this._remainingTime = data.time;
        this._endTime = Date.now()/1000 + data.time;

        var states = data.states;

        for (var i = 0; i < cc.vv.gameNetMgr.getValidSeatCount(); i++) {
            this.setAgreeState(i, states[i]);
        }

        cc.find('Canvas/popups/dissolve_room').active = true;
    },

    onDissoveCancel:function() {
        cc.find('Canvas/popups/dissolve_room').active = false;
    },

    onGameOver:function() {
        cc.find('Canvas/popups/dissolve_room').active = false;
    },

    onAgreeButtonClicked: function() {
        cc.vv.net.send("dissolve_agree");
    },

    onDisagreeButtonClicked: function() {
        cc.vv.net.send("dissolve_reject");
    },

    update: function (dt) {
        if(this._endTime > 0){
            var lastTime = this._endTime - Date.now() / 1000;

            if(lastTime < 0){
                this._endTime = -1;
            }

            var m = Math.floor(lastTime / 60);
            var s = Math.ceil(lastTime - m*60);

            var str = "";

            if(m > 0){
                str += m + "分";
            }

            this._timeLabelNode.getComponent(cc.Label).string = '(' + str + s + ')';

            this._progressBar.progress -= dt / this._remainingTime;
        }
    }
});



