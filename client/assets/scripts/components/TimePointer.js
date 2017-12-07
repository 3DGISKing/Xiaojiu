cc.Class({
    extends: cc.Component,

    properties: {
        _time: -1,
        _timeNode: null,
        _timeLabel: null,
    },

    onLoad: function () {
        cc.vv.timePointer = this;

        this._timeNode =  cc.find('Canvas/time');
        this._timeLabel = cc.find('Canvas/time/time').getComponent(cc.Label);

        this._timeNode.active = false;

        var self = this;

        this.node.on('game_auto_operation_fire_time',function(data){
            self.setRemainingTime(data.detail.remainingTime);
            self.startCountDown();
        });

        this.node.on('game_execute_auto_operation',function(data){
            self._timeNode.active = false;
        });

        cc.vv.timePointer = this;
    },

    setRemainingTime: function(time) {
        this._remainingTime = time;
    },

    startCountDown: function () {
        this._timeNode.active = true;
    },

    cancel: function () {
        this._timeNode.active = false;
    },

    hide: function () {
        this._timeNode.active = false;
    },

    isStarted: function() {
        return this._timeNode.active == true;
    },

    update: function (dt) {
        if (this._timeNode.active == false) {
            return;
        }

        if (this._remainingTime > 0) {
            this._remainingTime -= dt;
            this._timeLabel.string = Math.ceil(this._remainingTime);
        }
        else{
            this._timeNode.active = false;
        }
    }
});
