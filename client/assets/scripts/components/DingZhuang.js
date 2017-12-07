cc.Class({
    extends: cc.Component,

    properties: {
    },

    onLoad: function () {
        cc.find('Canvas/dingzhuang').active = false;

        cc.vv.utils.addClickEvent(cc.find('Canvas/dingzhuang/baozhuang'), this.node, 'DingZhuang', 'onBaoZhuangButtonClicked');
        cc.vv.utils.addClickEvent(cc.find('Canvas/dingzhuang/xiazhuang'), this.node, 'DingZhuang', 'onXiaZhuangButtonClicked');

        this.initView();
        this.initEventHandlers();

        cc.vv.dingzhuang = this;
    },

    initView: function () {
        if (cc.vv.gameNetMgr.isObserver()) {
            cc.find('Canvas/dingzhuang').active = false;
        }
        else {
            if (cc.vv.gameNetMgr.gamestate  == 'ask_keep_zhuang') {
                if (cc.vv.gameNetMgr.isZhuang()) {
                    cc.find('Canvas/dingzhuang').active = true;
                }
            }
            else {
                cc.find('Canvas/dingzhuang').active = false;
            }
        }
    },

    onGameAskKeepZhuang: function() {
        if (cc.vv.gameNetMgr.isZhuang()) {
            cc.find('Canvas/dingzhuang').active = true;
        }
    },

    initEventHandlers: function () {
        var self = this;

        this.node.on('game_ask_keep_zhuang', function (data) {
            self.onGameAskKeepZhuang(data);
        });

        this.node.on('game_sync', function (data) {
            if (cc.vv.gameNetMgr.getGameState() == 'ask_keep_zhuang') {
                if (cc.vv.gameNetMgr.isZhuang()) {
                    cc.find('Canvas/dingzhuang').active = true;
                }
            }
        });
    },

    onBaoZhuangButtonClicked: function () {
        cc.find('Canvas/dingzhuang').active = false;

        cc.vv.net.send('baozhuang');

        if (cc.vv.timePointer.isStarted()) {
            cc.vv.timePointer.hide();
        }
    },

    onXiaZhuangButtonClicked: function(){
        cc.find('Canvas/dingzhuang').active = false;

        cc.vv.net.send('xiazhuang');

        if (cc.vv.timePointer.isStarted()) {
            cc.vv.timePointer.hide();
        }
    }
});



