cc.Class({
    extends: cc.Component,

    properties: {
        _sprIcon:null,
        _zhuang:null,
        _de: null,
        _tian: null,
        _ready:null,
        _offline:null,
        _lblName:null,
        _lblScore:null,
        _scoreBg:null,
        _nddayingjia:null,
        _voicemsg:null,
        _difenLabel:null,
        _dollarSign:null,

        _chatBubble:null,
        _emoji:null,
        _lastChatTime:-1,

        //animation
        _headHighlight:null,
        _seatHighlight:null,
        _seatHighlight2:null,
        _fight:null,
        _emit:null,

        _userName:"",
        _score:0,
        _isOffline:false,
        _isReady:false,
        _isZhuang:false,
        _isDe:false,
        _isTian:false,
        _userId:null,
        _difen:-1,

        _chatBubble:null,
        _emoji:null,
        _lastChatTime:-1,


    },

    // use this for initialization
    onLoad: function () {
        this._sprIcon = this.node.getChildByName("icon").getComponent("ImageLoader");
        this._lblName = this.node.getChildByName('name').getComponent(cc.Label);
        this._lblScore = this.node.getChildByName("score").getComponent(cc.Label);

        if(this._sprIcon && this._sprIcon.getComponent(cc.Button)){
            cc.vv.utils.addClickEvent(this._sprIcon,this.node,"Seat","onIconClicked");
        }

        this._offline = this.node.getChildByName("offline_sign");
        this._ready = this.node.getChildByName("ready");
        this._scoreBg = this.node.getChildByName("Z_money_frame");
        this._zhuang = this.node.getChildByName("zhuang");
        this._de = this.node.getChildByName("de");
        this._tian = this.node.getChildByName("tian");

        this._difenLabel = this.node.getChildByName("difen");
        this._dollarSign = this.node.getChildByName("dollar");

        //animation
        this._headHighlight = this.node.getChildByName("head_highlight");
        this._seatHighlight = this.node.getChildByName("seat_highlight");
        this._seatHighlight2 = this.node.getChildByName("seat_hightlight2");
        this._fight = this.node.getChildByName("fight");
        this._emit = this.node.getChildByName("emit");

        this._seatHighlight2.active = false;

        cc.assert(this._zhuang != null, 'internal error');

        this.refresh();
         
        if(this._sprIcon && this._userId){
            this._sprIcon.setUserID(this._userId);
        }

        this._chatBubble = this.node.getChildByName("ChatBubble");

        if(this._chatBubble != null){
            this._chatBubble.active = false;
        }

        this._emoji = this.node.getChildByName("emoji");

        if(this._emoji != null){
            this._emoji.active = false;
        }

        this._voicemsg = this.node.getChildByName("voicemsg");

        if(this._voicemsg){
            this._voicemsg.active = false;
        }
    },
    
    onIconClicked:function(){
        var iconSprite = this._sprIcon.node.getComponent(cc.Sprite);

        if(this._userId != null && this._userId > 0){
            var seat = cc.vv.gameNetMgr.getSeatByID(this._userId);
            var sex = 0;

            if(cc.vv.baseInfoMap){
                var info = cc.vv.baseInfoMap[this._userId];

                if(info){
                    sex = info.sex;
                }                
            }

            cc.vv.userinfoShow.show(seat.name,seat.userId,iconSprite,sex,seat.ip);
        }
    },

    refresh:function(){
        if(this._lblName != null){
            this._lblName.string = this._userName;
        }

        if(this._lblScore != null){
            this._lblScore.string = this._score;
        }

        if(this._nddayingjia != null){
            this._nddayingjia.active = this._dayingjia == true;
        }

        if(this._offline){
            this._offline.active = this._isOffline && this._userName != "";
        }

        if(this._zhuang){
            this._zhuang.active = this._isZhuang;
        }

        if(this._de){
            this._de.active = this._isDe;
        }

        if(this._tian){
            this._tian.active = this._isTian;
        }

        if(this._difenLabel){
            this._difenLabel.getComponent(cc.Label).string = this._difen;
        }

        this.node.active = this._userId != null && this._userId > 0;
    },

    setInfo: function(name,score,dayingjia){
        this._userName = name;
        this._score = score;

        if(this._score == null){
            this._score = 0;
        }

        this._dayingjia = dayingjia;

        if(this._scoreBg != null){
            this._scoreBg.active = this._score != null;
        }

        if(this._lblScore != null){
            this._lblScore.node.active = this._score != null;
        }

        this.refresh();
    },


    setID:function(id){
        var idNode = this.node.getChildByName("id");

        if(idNode){
            var lbl = idNode.getComponent(cc.Label);
            lbl.string = "ID:" + id;
        }

        this._userId = id;

        if(this._sprIcon){
            this._sprIcon.setUserID(id);
        }

        this.refresh();
    },
    
    setReady:function(isReady){
        this._isReady = isReady;

        if(this._ready){

        }
    },

    setZhuang: function(isZhuang) {
        this._isZhuang = isZhuang;

        if(this._zhuang){
            this._zhuang.active = this._isZhuang;
        }

        if (this._seatHighlight){
            this._seatHighlight.active = this._isZhuang;
        }
    },

    setDe: function(isDe) {
        this._isDe = isDe;

        if(this._de){
            this._de.active = this._isDe;
        }
    },

    setTian: function(isTian) {
        this._isTian = isTian;

        if(this._tian){
            this._tian.active = this._isTian;
        }
    },

    getZhuangNode: function () {
        if(this._zhuang == null){
            this._zhuang = this.node.getChildByName("zhuang");
        }
        return this._zhuang;
    },

    setOffline:function(isOffline){
        this._isOffline = isOffline;
        if(this._offline){
            this._offline.active = this._isOffline && this._userName != "";
        }
    },

    setDifen:function(difen) {
        this._difen = difen;

        if (this._difenLabel) {
            if (this._difen >= 0) {
                this._difenLabel.active = true;
                this._dollarSign.active = true;
                this._difenLabel.getComponent(cc.Label).string = this._difen;
            }
            else{
                this._difenLabel.active = false;
                this._dollarSign.active = false;
            }
        }
    },

    setScore:function(score) {
        this.score = score;

        if (this._lblScore) {
            this._lblScore.getComponent(cc.Label).string = this.score;
        }
    },

    highLightReady: function highLightReady() {
        if (this._ready == null) {
            return;
        }

        this._ready.active = true;

        var time = 0.5;
        var timeForDelay = 1.5;
        var scale = 0.2;

        var scaleTo = new cc.ScaleTo(time, scale);
        var delayTime = new cc.DelayTime(timeForDelay);

        var fn = function () {
            this.active = false;
            this.scale = 1.0;
        };

        var callback = new cc.callFunc(fn, this._ready);

        var seq = new cc.Sequence(scaleTo, delayTime, callback);

        this._ready.runAction(seq);
    },

    highLightZhuang:function() {
        this._seatHighlight.active = true;

        var animation1 = this._seatHighlight.getComponent(cc.Animation);
        animation1.play();

        var animationTime1 = 1000;

        var self = this;

        setTimeout(function () {
            if (self == null){
                return;
            }

            if (animation1 == null) {
                return;
            }

            if(self._seatHighlight == null) {
                return;
            }

            self._seatHighlight.active = false;
            animation1.stop();

            self._seatHighlight2.active = true;
            var animation2 = self._seatHighlight2.getComponent(cc.Animation);

            animation2.play();

            var animationTime2 = 1000;

            setTimeout(function () {
                if(self._seatHighlight == null) {
                    return;
                }

                self._seatHighlight.active = true;
                self._seatHighlight2.active = false;
            }, animationTime2);
        }, animationTime1);
    },

    highLightWin: function () {
        this._emit.active = true;

        var animation1 = this._emit.getComponent(cc.Animation);
        var animation2 = this._fight.getComponent(cc.Animation);

        animation1.play();

        var self = this;

        setTimeout(function () {
            if(self._emit == null) {
                return;
            }

            self._emit.active = false;
            self._fight.active = true;

            animation2.play();

            setTimeout(function () {
                if(self._emit == null) {
                    return;
                }

                self._emit.active = false;
                self._fight.active = false;
            }, 1000);
        }, 1000);
    },

    chat:function(content){
        if(this._chatBubble == null || this._emoji == null){
            return;
        }

        this._emoji.active = false;
        this._chatBubble.active = true;
        this._chatBubble.getComponent(cc.Label).string = content;
        this._chatBubble.getChildByName("New Label").getComponent(cc.Label).string = content;
        this._lastChatTime = 3;
    },

    emoji:function(emoji){
        if(this._emoji == null || this._emoji == null){
            return;
        }

        this._chatBubble.active = false;
        this._emoji.active = true;

        this._emoji.getComponent(cc.Animation).play(emoji);
        this._lastChatTime = 3;
    },

    voiceMsg: function (show) {
        cc.info(this._voicemsg);

        if(this._voicemsg){
            this._voicemsg.active = show;
        }
    },

    update: function (dt) {
        if(this._lastChatTime > 0){
            this._lastChatTime -= dt;
            if(this._lastChatTime < 0){
                this._chatBubble.active = false;
                this._emoji.active = false;
                this._emoji.getComponent(cc.Animation).stop();
            }
        }
    }
});
