cc.Class({
    extends: cc.Component,
    properties: {
        target:cc.Node,
        _isShow:false,
        lblContent:cc.Label,
    },

    // use this for initialization
    onLoad: function () {
        if(cc.vv == null){
            return null;
        }

        cc.vv.wc = this;
        this.node.active = this._isShow;
    },

    // called every frame, uncomment this function to activate update callback
    update: function (dt) {
        this.target.rotation = this.target.rotation - dt * 180;
    },

    show:function(content){
        this._isShow = true;

        if(this.node){
            this.node.active = this._isShow;
        }

        if(this.lblContent){
            if(content == null){
                content = "";
            }

            this.lblContent.string = content;

            if(content != ''){
                this.target.x = -150;
                this.lblContent.node.x = -90;
            }
            else
            {
                this.target.x = 0;
                this.lblContent.node.active = false;
            }
        }
        else {
            if (this.target) {
                this.target.x = 0;
            }
        }
    },

    hide:function(){
        this._isShow = false;

        if(this.node){
            this.node.active = this._isShow;
        }
    }
});
