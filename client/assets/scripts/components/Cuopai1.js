cc.Class({
    extends: cc.Component,

    properties: {
        _card1:null,
        _card2:null,
        _holds: [],

        _origCard1X: -1,
        _origCard1Y: -1,
        _origCard2X: -1,
        _origCard2Y: -1
    },

    onLoad: function () {
        this._card1 = cc.find('/Canvas/popups/cuopai/card1');
        this._card2 = cc.find('/Canvas/popups/cuopai/card2');

        this._origCard1X = this._card1.x;
        this._origCard1Y = this._card1.y;

        this._origCard2X = this._card2.x;
        this._origCard2Y = this._card2.y;

        cc.vv.cuopai = this;
    },

    isActive :function () {
        if(this.node == null) {
            return false;
        }

        return this.node.active;
    },

    hide: function () {
        this.node.active = false;
    },

    onCard2TouchMove: function(event) {
        var delta = event.getDelta();

        this._card2.x += delta.x;
        this._card2.y += delta.y;
    },

    onCard2TouchEnd: function () {
        this._card2.off(cc.Node.EventType.TOUCH_MOVE, this.onCard2TouchMove, this);
        this._card2.off(cc.Node.EventType.TOUCH_END, this.onCard2TouchEnd, this);
        this._card2.off(cc.Node.EventType.TOUCH_CANCEL, this.onCard2TouchEnd, this);

        this._card1.getComponent(cc.Sprite).spriteFrame = cc.vv.gamemgr.getSpriteFrameByCardID(this._holds[1]);
        this._card2.active = false;

        var time = 0.9;

        var self = this;

        setTimeout(function () {
            if(self.node){
                self.node.active = false;
            }

            if(cc.vv.game) {
                cc.vv.game.onAfterCuopai();
            }
        }, time * 1000);
    },

    initCards: function (holds) {
        this._holds = holds;

        //only init card1 behind card2

        this._card2.active = true;
        this._card1.getComponent(cc.Sprite).spriteFrame = cc.vv.gamemgr.getSpriteFrameOfCardBackgroundByCardID(holds[1]);
        this._card2.getComponent(cc.Sprite).spriteFrame = cc.vv.gamemgr.getSpriteFrameOfCardBack();
    },

    runInitAction: function () {
        this._card2.x = this._origCard1X;
        this._card2.y = this._origCard1Y;

        this._card2.on(cc.Node.EventType.TOUCH_MOVE, this.onCard2TouchMove, this);
        this._card2.on(cc.Node.EventType.TOUCH_END, this.onCard2TouchEnd, this);
        this._card2.on(cc.Node.EventType.TOUCH_CANCEL, this.onCard2TouchEnd, this);
    },

    runExitAction: function () {

    }
});
