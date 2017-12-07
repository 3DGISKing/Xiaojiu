cc.Class({
    extends: cc.Component,

    properties: {
        _isCapturing:false
    },

    onLoad: function () {
    },

    init:function(){
        this.ANDROID_API = "com/yjdlsoft/scxj/WXAPI";
        this.IOS_API = "AppController";
    },
    
    login:function(){
        if(cc.sys.os == cc.sys.OS_ANDROID){ 
            jsb.reflection.callStaticMethod(this.ANDROID_API, "Login", "()V");
        }
        else if(cc.sys.os == cc.sys.OS_IOS){
            jsb.reflection.callStaticMethod(this.IOS_API, "login");
        }
        else{
            cc.warn("platform:" + cc.sys.os + " dosn't implement share.");
        }
    },

    /*
     * this function will be invoked from native platform after wechat login finished.
     * send http request to account server.
     */
    onLoginResp:function(code){
        var fn = function(ret){
            if(ret.errcode == 0){
                cc.sys.localStorage.setItem("wx_account",ret.account);
                cc.sys.localStorage.setItem("wx_sign",ret.sign);
            }

            cc.vv.userMgr.onAuth(ret);
        };

        cc.vv.http.sendRequest("/wechat_auth",{code:code,os:cc.sys.os},fn);
    },
    
    share:function(title,desc){
        if(cc.sys.os == cc.sys.OS_ANDROID){
            jsb.reflection.callStaticMethod(this.ANDROID_API, "Share", "(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;)V",cc.vv.SI.appweb,title,desc);
        }
        else if(cc.sys.os == cc.sys.OS_IOS){
            jsb.reflection.callStaticMethod(this.IOS_API, "share:shareTitle:shareDesc:",cc.vv.SI.appweb,title,desc);
        }
        else{
            cc.log("platform:" + cc.sys.os + " dosn't implement share.");
        }
    },
    
    shareResult:function(){
        if(this._isCapturing){
            return;
        }

        this._isCapturing = true;

        var size = cc.director.getWinSize();
        var fileName = "result_share.jpg";
        var fullPath = jsb.fileUtils.getWritablePath() + fileName;

        if(jsb.fileUtils.isFileExist(fullPath)){
            jsb.fileUtils.removeFile(fullPath);
        }

        var texture = new cc.RenderTexture(Math.floor(size.width), Math.floor(size.height), cc.Texture2D.PIXEL_FORMAT_RGBA8888, gl.DEPTH24_STENCIL8_OES);

        texture.setPosition(cc.p(size.width/2, size.height/2));
        texture.begin();
        cc.director.getRunningScene().visit();
        texture.end();

        var self = this;
        var tryTimes = 0;

        var fn = function(){
            if(jsb.fileUtils.isFileExist(fullPath)){
                var height = 100;
                var scale = height/size.height;
			    var width = Math.floor(size.width * scale);
                
                if(cc.sys.os == cc.sys.OS_ANDROID){
                    jsb.reflection.callStaticMethod(self.ANDROID_API, "ShareIMG", "(Ljava/lang/String;II)V",fullPath,width,height);
                }
                else if(cc.sys.os == cc.sys.OS_IOS){
                    jsb.reflection.callStaticMethod(self.IOS_API, "shareIMG:width:height:",fullPath,width,height);
                }
                else{
                    console.log("platform:" + cc.sys.os + " doesn't implement share.");
                }
                self._isCapturing = false;
            }
            else{
                tryTimes++;

                if(tryTimes > 10){
                    console.log("time out...");
                    return;
                }

                setTimeout(fn,50); 
            }
        };

        /** from cocos2dx source
         * @param filename The file name.
         * @param format The image format.
         * @param isRGBA The file is RGBA or not.
         * @param callback When the file is save finished,it will callback this function.
         * @return Returns true if the operation is successful.
         */

        texture.saveToFile(fileName, cc.ImageFormat.JPG, true, fn);
    },

    /**
     * 支付宝支付
     */
    alipay: function (order_info) {
        if (cc.sys.os == cc.sys.OS_ANDROID) {
            jsb.reflection.callStaticMethod(this.ANDROID_API, "alipay", "(Ljava/lang/String;)V", order_info);
        }
        else if (cc.sys.os == cc.sys.OS_IOS) {
            jsb.reflection.callStaticMethod(this.IOS_API, "alipay:", order_info);
        }
        else {
            cc.info("platform:" + cc.sys.os + " does n't implement pay.");
        }
    },

    /**
     * 微信支付
     */
    weixinpay: function (order_info) {
        cc.info("anySDKMgr", order_info);

        if (cc.sys.os == cc.sys.OS_ANDROID) {
            cc.info("anySDKMgr_android", order_info);
            jsb.reflection.callStaticMethod(this.ANDROID_API, "weixinpay", "(Ljava/lang/String;)V", order_info);
        }
        else if (cc.sys.os == cc.sys.OS_IOS) {
            jsb.reflection.callStaticMethod(this.IOS_API, "weixinpay:", order_info);
        }
        else {
            cc.info("platform:" + cc.sys.os + " does n't implement pay.");
        }
    },

    shareRoom: function (title, link, desc) {
        if(cc.sys.os == cc.sys.OS_ANDROID){
            jsb.reflection.callStaticMethod(this.ANDROID_API, "Share", "(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;)V",link,title,desc);
        }
        else if(cc.sys.os == cc.sys.OS_IOS){
            jsb.reflection.callStaticMethod(this.IOS_API, "share:shareTitle:shareDesc:",link,title,desc);
        }
        else{
            console.log("platform:" + cc.sys.os + " doesn't implement share.");
        }
    },

    onEnterRoomWithId: function (roomid) {
        if(cc.vv.userMgr.userId){
            cc.info("not logged in user invited. roomid: " + roomid);
            cc.vv.userMgr.enterRoom(roomid);
        }
        else{
            cc.info("logged in user invited. roomid: " + roomid);
            cc.vv.userMgr.oldRoomId = roomid;
            this.login();
        }
    },

    refreshGems:function(){
        var onGet = function(ret){
            if(ret.errcode !== 0){
                cc.warn(ret.errmsg);
            }
            else{
                if(ret.gems != null){
                    cc.info(ret);

                    var userGemLabel = cc.find('Canvas/main/gem/gem');

                    if(userGemLabel != null){
                        userGemLabel.getComponent(cc.Label).string = ret.gems;
                    }
                }
            }
        };

        var data = {
            account:cc.vv.userMgr.account,
            sign:cc.vv.userMgr.sign
        };

        cc.info("refreshGems");
        cc.vv.http.sendRequest("/get_user_status",data,onGet);
    }
});
