
cc.Class({
    extends: cc.Component,

    properties: {
        _checkedSpriteNode: null,
        _alert: null
    },

    onLoad: function () {
        if(!cc.sys.isNative && cc.sys.isMobile){
            var cvs = this.node.getComponent(cc.Canvas);
            cvs.fitHeight = true;
            cvs.fitWidth = true;
        }

        if(!cc.vv){
            cc.director.loadScene("loading");
            return;
        }

        cc.vv.http.url = cc.vv.http.master_url;

        cc.vv.net.addHandler('push_need_create_role',function(){
            cc.info("onLoad:push_need_create_role");
            cc.director.loadScene("createrole");
        });

        this._checkedSpriteNode = cc.find('Canvas/yonghuxieyi/checkbox/checked');

        this._checkedSpriteNode.active = true;

        this._alert = cc.find('Canvas/alert');
        this._alert.active = false;
    },

    start:function(){
        var account =  cc.sys.localStorage.getItem("wx_account");
        var sign = cc.sys.localStorage.getItem("wx_sign");

        if(account != null && sign != null){
            var ret = {
                errcode:0,
                account:account,
                sign:sign
            };

            cc.vv.userMgr.onAuth(ret);
        }
    },

    onLoginButtonClicked:function(){
        if (!this.checkYonghuXieyi())
            return;

        cc.vv.wc.show("正在登录...");

        if(!cc.sys.isNative || cc.sys.os == cc.sys.OS_WINDOWS)
            cc.vv.userMgr.guestAuth();
        else
            cc.vv.anysdkMgr.login();
    },

    onCheckBoxClicked:function() {
        this._checkedSpriteNode.active = ! this._checkedSpriteNode.active;
    },

    checkYonghuXieyi: function() {
        if (this._checkedSpriteNode.active)
            return true;
        else
            this._alert.active = true;
            return false;
    },

    onBtnAlertOkClicked: function () {
        this._alert.active = false;
    },

    onYonghuXieyiClicked: function() {
        cc.find('Canvas/popups/yonghuxieyi').active = true;
    },

    onYonghuXieyiCloseButtonClicked: function() {
        cc.find('Canvas/popups/yonghuxieyi').active = false;
    }
});
