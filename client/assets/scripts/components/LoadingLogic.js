cc.Class({
    extends: cc.Component,

    properties: {
        messageLabelNode:cc.Label,
        _stateStr:'',
        _progress:0.0,
        _splash:null,
        _isLoading:false,
        _progressBarNode: null,
        _progressBar: null,
        _loadedUuidIndex:0,
        _uuidArray: []
    },

    onLoad: function () {
        if(!cc.sys.isNative && cc.sys.isMobile){
            var cvs = this.node.getComponent(cc.Canvas);
            cvs.fitHeight = true;
            cvs.fitWidth = true;
        }

        this._progressBarNode = cc.find('Canvas/progressBar');

        this._progressBar = this._progressBarNode.getComponent(cc.ProgressBar);
        this._progressBarNode.active = false;

        cc.args = this.urlParse();
        
        this.initMgr();

        this._splash = cc.find("Canvas/splash");
        this._splash.active = true;
        
        cc.vv.loading = this;

        for (var prop in cc.loader._resources._pathToUuid) {
            var entry = cc.loader._resources._pathToUuid[prop];

            if (entry[0] && entry[0]['uuid'] && entry[0]['type']){
                var uuid = cc.loader._resources._pathToUuid[prop][0]['uuid'];

                var typeName = cc.loader._resources._pathToUuid[prop][0]['type']['name']

                //in native platform typeName is Texture2D
                //but in browser desktop cc_Texture2D

                if (uuid) {
                    if (typeName == 'cc_Texture2D' || typeName == 'Texture2D') {
                        this._uuidArray.push(uuid);
                    }
                }
            }
            else {
                //cc.log(prop);
            }
        }
    },

    urlParse:function(){
        var params = {};

        if(window.location == null){
            return params;
        }

        var name, value;
        var str=window.location.href; //取得整个地址栏
        var num=str.indexOf("?");

        str = str.substr(num+1); //取得所有参数   stringvar.substr(start [, length ]

        var arr = str.split("&"); //各个参数放到数组里

        for(var i = 0; i < arr.length; i++){
            num=arr[i].indexOf("=");

            if(num > 0){
                name = arr[i].substring(0,num);
                value = arr[i].substr(num+1);
                params[name]=value;
            }
        }

        return params;
    },

    initMgr: function () {
        cc.vv = {};

        var App = require("XiaoJiuApp");
        cc.vv.app = new App();

        cc.vv.http = require("HTTP");
        
        cc.vv.http.setURL(cc.vv.app.getServerURL());
        
        cc.vv.net = require("Net");
        
        var AudioMgr = require("AudioMgr");
        cc.vv.audioMgr = new AudioMgr();
        cc.vv.audioMgr.init();
        
        var UserMgr = require("UserMgr");
        cc.vv.userMgr = new UserMgr();
        
        var GameNetMgr = require("GameNetMgr");
        cc.vv.gameNetMgr = new GameNetMgr();
        cc.vv.gameNetMgr.initHandlers();
        
        var Utils = require("Utils");
        cc.vv.utils = new Utils();
        
        var AnysdkMgr = require("AnysdkMgr");
        cc.vv.anysdkMgr = new AnysdkMgr();
        cc.vv.anysdkMgr.init();

        var VoiceMgr = require("VoiceMgr");
        cc.vv.voiceMgr = new VoiceMgr();
        cc.vv.voiceMgr.init();

        cc.vv.reporter = require("Reporter");
    },

    start: function () {
        var self = this;
        var SHOW_TIME = 3000;
        var FADE_TIME = 500;

        if(cc.sys.os != cc.sys.OS_IOS || !cc.sys.isNative){
            self._splash.active = true;
            var t = Date.now();

            var fn = function(){
                var dt = Date.now() - t;

                if(dt < SHOW_TIME){
                    setTimeout(fn, 33);
                }
                else {
                    var op = (1 - ((dt - SHOW_TIME) / FADE_TIME)) * 255;

                    if(op < 0){
                        self._splash.opacity = 0;
                        self.checkVersion();
                    }
                    else{
                        self._splash.opacity = op;
                        setTimeout(fn, 33);
                    }
                }
            };

            setTimeout(fn, 33);
        }
        else{
            this._splash.active = false;
            this.checkVersion();
        }
    },

    checkVersion:function(){
        var self = this;

        var onGetVersion = function(ret){
            self._stateStr = '';

            if(ret.version == null){
                cc.warn("failed to get version.");
            }
            else{
                /*
                 * ret structure
                 * version: '20161217'
                 * hall:    'serverIp:9001'
                 * appweb:  http://fir.im/scxj
                 */

                cc.vv.SI = ret;

                if(ret.version != cc.vv.app.getVersionInfoString()){
                    cc.find("Canvas/alert").active = true;
                }
                else{
                     self._stateStr = '';

                     if(!cc.sys.isNative) {
                        self.startPreloading();
                     }
                     else
                     {
                         cc.vv.hotUpdate.checkUpdate();
                     }
                }
            }
        };

        var onOk = function () {
            self.checkVersion();
        };

        var onCancel = function () {
            cc.game.end();
        };

        var errorHandler = function () {
            self._stateStr = '';
            self.messageLabelNode.string = '';
            cc.vv.alert.show('提示', '服务器连接失败! 错误代码: 1.\n 你想重试吗？', onOk, onCancel );
        };

        var timeoutHandler = function () {
            self._stateStr = '';
            self.messageLabelNode.string = '';
            cc.vv.alert.show('提示', '服务器连接失败! 错误代码: 2\n 你想重试吗？', onOk, onCancel);
        };

        var abortHandler = function () {
            self._stateStr = '';
            self.messageLabelNode.string = '';
            cc.vv.alert.show('提示', '服务器连接失败! 错误代码: 3\n 你想重试吗？', onOk, onCancel);
        };

        self._stateStr = "正在连接服务器";

        cc.vv.http.sendRequest("/get_serverinfo", null, onGetVersion, null, errorHandler, timeoutHandler, abortHandler);
    },

    startPreloading:function(){
        this._progressBarNode.active = true;
        this._isLoading = true;
    },

    update: function (dt) {
        if(this._stateStr.length != 0){
            this.messageLabelNode.string = this._stateStr + ' ';

            var dotCount = 8;
            var refreshTime = 500;//ms

            var t = Math.floor(Date.now() / refreshTime) % dotCount;

            for(var i = 0; i < t; ++ i){
                this.messageLabelNode.string += '.';
            }
        }
        else {
            this.messageLabelNode.string = '';
        }

        if(this._isLoading){
            var progressDelta = 1.0 / this._uuidArray.length;

            if (this._loadedUuidIndex >= this._uuidArray.length -1 ) {
                 if (cc.director._loadingScene != 'login') {
                     cc.director.loadScene("login");
                 }
            }
            else {
                var res = {
                    type: 'uuid',
                    uuid: this._uuidArray[this._loadedUuidIndex]
                };

                var self = this;

                cc.loader.load(res, function (err, tex) {
                    self._progress += progressDelta;
                    self._loadedUuidIndex++;
                });
            }

            this._progressBar.progress = this._progress;
        }
    }
});
