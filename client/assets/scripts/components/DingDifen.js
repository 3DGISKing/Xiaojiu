cc.Class({
    extends: cc.Component,

    properties: {
        _dingDifenNode: null,
        _xiaZhuButton:null,
        _jifenzhiNode:null,
        _bilizhiNode:null
    },

    // use this for initialization
    onLoad: function () {
        this._dingDifenNode = this.node.getChildByName('dingdifen');
        this._xiaZhuButton = this._dingDifenNode.getChildByName('xiazhu');
        this._jifenzhiNode = this._dingDifenNode.getChildByName('jifenzhi');
        this._bilizhiNode = this._dingDifenNode.getChildByName('bilizhi');

        cc.vv.utils.addClickEvent(this._xiaZhuButton, this.node, 'DingDifen', 'onXiazhuButtonClicked');

        cc.vv.utils.addClickEvent(cc.find('Canvas/dingdifen/jifenzhi/20fen'), this.node, 'DingDifen', 'on20DifenButtonClicked');
        cc.vv.utils.addClickEvent(cc.find('Canvas/dingdifen/jifenzhi/40fen'), this.node, 'DingDifen', 'on40DifenButtonClicked');
        cc.vv.utils.addClickEvent(cc.find('Canvas/dingdifen/jifenzhi/60fen'), this.node, 'DingDifen', 'on60DifenButtonClicked');
        cc.vv.utils.addClickEvent(cc.find('Canvas/dingdifen/jifenzhi/80fen'), this.node, 'DingDifen', 'on80DifenButtonClicked');
        cc.vv.utils.addClickEvent(cc.find('Canvas/dingdifen/jifenzhi/100fen'), this.node, 'DingDifen', 'on100DifenButtonClicked');

        cc.vv.utils.addClickEvent(cc.find('Canvas/dingdifen/bilizhi/20fen_in_bilizhi'), this.node, 'DingDifen', 'on20BilizhiDifenButtonClicked');
        cc.vv.utils.addClickEvent(cc.find('Canvas/dingdifen/bilizhi/10_percent'), this.node, 'DingDifen', 'on10PercentButtonClicked');
        cc.vv.utils.addClickEvent(cc.find('Canvas/dingdifen/bilizhi/30_percent'), this.node, 'DingDifen', 'on30PercentButtonClicked');
        cc.vv.utils.addClickEvent(cc.find('Canvas/dingdifen/bilizhi/50_percent'), this.node, 'DingDifen', 'on50PercentButtonClicked');
        cc.vv.utils.addClickEvent(cc.find('Canvas/dingdifen/bilizhi/100_percent'), this.node, 'DingDifen', 'on100PercentButtonClicked');

        this.initView();
        this.initEventHandlers();

        cc.vv.dingdifen = this;
    },

    initView: function () {
        if (cc.vv.gameNetMgr.isObserver()) {
            this._dingDifenNode.active = false;
        }
        else {
            if (cc.vv.gameNetMgr.isDingDifenState() ) {
                this.showDingDifenChoiceForSync();
            }
            else {
                this._dingDifenNode.active = false;
            }
        }
    },

    //봉사기가 판돈을 대라고 통지하였을 때
    onGameDingDifen:function (data) {
        if (cc.vv.gameNetMgr.isObserver())
            return;

        this.showDingDifenChoice();
    },

    //봉사기가 모든 사용자들이 다 판돈을 댔다고 통지하였을 때
    onGameDingDifenFinish:function (data) {
        this._dingDifenNode.active = false;
    },

    initEventHandlers: function () {
        var self = this;

        //봉사기가 판돈을 대라고 통지하였을 때
        this.node.on('game_dingdifen', function (data) {
             self.onGameDingDifen(data);
        });

        //봉사기가 모든 사용자들이 다 판돈을 댔다고 통지하였을 때
        this.node.on('game_dingdifen_finish', function (data) {
            self.onGameDingDifenFinish(data);
        });

        // 게임봉사기로부터 나를 위한 자리가 준비되였다고 통지가 왔을 때
        this.node.on('seat_ready', function (data) {
            if (cc.vv.gameNetMgr.isDingDifenState()) {
                self.showDingDifenChoice();
            }
        });

        this.node.on('game_sync',function(data){
            if (cc.vv.gameNetMgr.isPlayer()) {
                if (cc.vv.gameNetMgr.isDingDifenState()) {
                    self.showDingDifenChoiceForSync();
                }
            }
        });
    },

    showDingDifenChoiceForSync: function (){
        this._dingDifenNode.active = true;

        if (cc.vv.gameNetMgr.isZhuang()) {
            this._jifenzhiNode.active = false;
            this._bilizhiNode.active = false;

            if (cc.vv.gameNetMgr.getGameDifen() == 0) {
                this._xiaZhuButton.active = true;
            }
            else {
                this._xiaZhuButton.active = false;
            }
        }
        else {
            var seatData = cc.vv.gameNetMgr.getMySeat();

            var difen = seatData.difen;

            if (difen == 0 || difen == -1) {
                if (cc.vv.gameNetMgr.isJifenZhi() ) {
                    this._jifenzhiNode.active = true;
                    this._bilizhiNode.active = false;
                }
                else {
                    this._jifenzhiNode.active = false;
                    this._bilizhiNode.active = true;
                }
            }
            else {
                this._jifenzhiNode.active = false;
                this._bilizhiNode.active = false;
            }

            this._xiaZhuButton.active = false;
        }
    },

    showDingDifenChoice: function (){
        this._dingDifenNode.active = true;

        if (cc.vv.gameNetMgr.isZhuang()) {
            this._jifenzhiNode.active = false;
            this._bilizhiNode.active = false;

            if (cc.vv.gameNetMgr.getGameDifen() == 0) {
                this._xiaZhuButton.active = true;
            }
            else {
                this._xiaZhuButton.active = false;
            }
        }
        else {
            if (cc.vv.gameNetMgr.isJifenZhi() ) {
                this._jifenzhiNode.active = true;
                this._bilizhiNode.active = false;
            }
            else {
                this._jifenzhiNode.active = false;
                this._bilizhiNode.active = true;
            }

            this._xiaZhuButton.active = false;
      }
    },

    onXiazhuButtonClicked: function () {
        cc.assert(cc.vv.gameNetMgr.isZhuang() == true, 'interanl error');

        var difen = cc.vv.gameNetMgr.getShangZhuangDifen();

        cc.vv.gameNetMgr.difen = difen;

        cc.vv.net.send('dingdifen', difen);

        this._xiaZhuButton.active = false;

        if (cc.vv.timePointer.isStarted()) {
            cc.vv.timePointer.cancel();
        }
    },

    on20DifenButtonClicked:function(){
        this.sendDifen(20);

        cc.find('Canvas/dingdifen/jifenzhi').active = false;

        if (cc.vv.timePointer.isStarted()) {
            cc.vv.timePointer.cancel();
        }
    },

    on40DifenButtonClicked:function(){
        this.sendDifen(40);

        cc.find('Canvas/dingdifen/jifenzhi').active = false;

        if (cc.vv.timePointer.isStarted()) {
            cc.vv.timePointer.cancel();
        }
    },

    on60DifenButtonClicked:function(){
        this.sendDifen(60);

        cc.find('Canvas/dingdifen/jifenzhi').active = false;

        if (cc.vv.timePointer.isStarted()) {
            cc.vv.timePointer.cancel();
        }
    },

    on80DifenButtonClicked:function(){
        this.sendDifen(80);

        cc.find('Canvas/dingdifen/jifenzhi').active = false;

        if (cc.vv.timePointer.isStarted()) {
            cc.vv.timePointer.cancel();
        }
    },

    on100DifenButtonClicked:function(){
        this.sendDifen(100);

        cc.find('Canvas/dingdifen/jifenzhi').active = false;

        if (cc.vv.timePointer.isStarted()) {
            cc.vv.timePointer.cancel();
        }
    },

    on20BilizhiDifenButtonClicked: function () {
        this.sendDifen(20);

        cc.find('Canvas/dingdifen/bilizhi').active = false;

        if (cc.vv.timePointer.isStarted()) {
            cc.vv.timePointer.cancel();
        }
    },

    on10PercentButtonClicked: function(){
        var difen = cc.vv.gameNetMgr.getGameDifen();

        if(difen == 0) {
            cc.vv.alert.show('提示', '庄家下注之后请下注!');
            return;
        }

        difen *= 0.1;

        this.sendDifen(difen);

        cc.find('Canvas/dingdifen/bilizhi').active = false;

        if (cc.vv.timePointer.isStarted()) {
            cc.vv.timePointer.cancel();
        }
    },

    on30PercentButtonClicked: function(){
        var difen = cc.vv.gameNetMgr.getGameDifen();

        if(difen == 0) {
            cc.vv.alert.show('提示', '庄家下注之后请下注!');
            return;
        }

        difen *= 0.3;

        this.sendDifen(difen);

        cc.find('Canvas/dingdifen/bilizhi').active = false;

        if (cc.vv.timePointer.isStarted()) {
            cc.vv.timePointer.cancel();
        }
    },

    on50PercentButtonClicked: function(){
        var difen = cc.vv.gameNetMgr.getGameDifen();

        if(difen == 0) {
            cc.vv.alert.show('提示', '庄家下注之后请下注!');
            return;
        }

        difen *= 0.5;

        this.sendDifen(difen);

        cc.find('Canvas/dingdifen/bilizhi').active = false;

        var random = Math.random();

        var soundUrl;

        if (random > 0.5) {
            soundUrl =  'danci/chiyiban.mp3';
        }
        else {
            soundUrl =  'danci/kaoyiban.mp3';
        }

        cc.vv.audioMgr.playSFX(soundUrl);

        if (cc.vv.timePointer.isStarted()) {
            cc.vv.timePointer.cancel();
        }
    },

    on100PercentButtonClicked: function(){
        var difen = cc.vv.gameNetMgr.getGameDifen();

        if(difen == 0) {
            cc.vv.alert.show('提示', '庄家下注之后请下注!');
            return;
        }

        this.sendDifen(difen);

        cc.find('Canvas/dingdifen/bilizhi').active = false;

        var random = Math.random();

        var soundUrl;

        if (random > 0.5) {
            soundUrl =  'danci/chile.mp3';
        }
        else {
            soundUrl =  'danci/kaole.mp3';
        }

        cc.vv.audioMgr.playSFX(soundUrl);

        if (cc.vv.timePointer.isStarted()) {
            cc.vv.timePointer.cancel();
        }
    },

    sendDifen: function(difen) {
        cc.assert(cc.vv.gameNetMgr.isZhuang() == false, 'interanl error');

        cc.vv.gameNetMgr.setMyDifen(difen);

        cc.vv.net.send('dingdifen', difen);
    },

    hide: function () {
        this._dingDifenNode.active = false;
    }
});

