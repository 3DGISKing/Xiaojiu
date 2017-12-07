cc.Class({
    extends: cc.Component,

    properties: {
        _card1:null,
        _card2:null,

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

       // cc.vv.cuopai = this;
    },

    isActive :function () {
        return this.node.active;
    },

    hide: function () {
        this.node.active = false;
    },

    runExitAction: function () {
        var moveToTime = 0.3;
        var delayTime = 0.3;
        var downTime = 0.5;

        var y = -34;
        var card1x = -99;
        var card2x = 168;

        var actionMoveTo1 =  new cc.MoveTo(moveToTime, cc.p(card1x, y));
        var delay1 = new cc.DelayTime(delayTime);
        var actionMoveDown1 =  new cc.MoveBy(downTime, cc.p(0, this._origCard1Y -y  ));

        var seq1 = new cc.Sequence(actionMoveTo1, delay1, actionMoveDown1);

        cc.director.getActionManager().removeAllActionsFromTarget(this._card1);
        this._card1.runAction(seq1);

        var actionMoveTo2 =  new cc.MoveTo(moveToTime, cc.p(card2x, y));
        var delay2 = new cc.DelayTime(delayTime);
        var actionMoveDown2 =  new cc.MoveBy(downTime, cc.p(0 , this._origCard2Y - y ));

        var seq2 = new cc.Sequence(actionMoveTo2, delay2, actionMoveDown2);

        cc.director.getActionManager().removeAllActionsFromTarget(this._card2);
        this._card2.runAction(seq2);
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

        var moveToTime = 0.3;
        var delayTime = 0.3;
        var downTime = 0.5;

        var totalTime = moveToTime + delayTime + downTime;

        this.runExitAction();

        var self = this;

        setTimeout(function () {
            if(self.node){
                self.node.active = false;
            }

            if(cc.vv.game) {
                cc.vv.game.onAfterCuopai();
            }
        }, totalTime * 1000);
    },

    initCards: function (holds) {
        this._card1.getComponent(cc.Sprite).spriteFrame = cc.vv.gamemgr.getSpriteFrameByCardID(holds[0]);
        this._card2.getComponent(cc.Sprite).spriteFrame = cc.vv.gamemgr.getSpriteFrameByCardID(holds[1]);
    },

    runInitAction: function () {
        var time = 0.5;

        var actionMoveTo10 =  new cc.MoveTo(0, cc.p(this._origCard1X, this._origCard1Y));
        var actionMoveTo11 =  new cc.MoveTo(time, cc.p(0, 0));

        var seq1 = new cc.Sequence(actionMoveTo10, actionMoveTo11);

        cc.director.getActionManager().removeAllActionsFromTarget(this._card1);
        this._card1.runAction(seq1);

        var actionMoveTo20 =  new cc.MoveTo(0, cc.p(this._origCard2X, this._origCard2Y));
        var actionMoveTo21 =  new cc.MoveTo(time, cc.p(0, 0));

        var self = this;

        var fn = function () {
            self._card2.on(cc.Node.EventType.TOUCH_MOVE, self.onCard2TouchMove, self);
            self._card2.on(cc.Node.EventType.TOUCH_END, self.onCard2TouchEnd, self);
            self._card2.on(cc.Node.EventType.TOUCH_CANCEL, self.onCard2TouchEnd, self);
        };

        var callback = new cc.callFunc(fn, this);

        var seq2 = new cc.Sequence(actionMoveTo20, actionMoveTo21, callback);

        cc.director.getActionManager().removeAllActionsFromTarget(this._card2);
        this._card2.runAction(seq2);
    }
});
