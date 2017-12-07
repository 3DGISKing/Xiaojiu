cc.Class({
    extends: cc.Component,
    properties: {
        account:null,
	    userId:null,
		userName:null,
		lv:0,             // dealer level
		gems:0,
		sign:0,
        ip:"",
        sex:0,

        /*
        Id of room which had taken a seat. This value is stored in database.
        If game was normally exited, roomId of user will be null.
        */

        roomId:null,
        oldRoomId:null
    },
    
    guestAuth:function(){
        var account = cc.args["account"];

        if(account == null){
            account = cc.sys.localStorage.getItem("account");
        }
        
        if(account == null){
            account = Date.now();
            cc.sys.localStorage.setItem("account",account);
        }

        var onError = function () {
            cc.vv.wc.hide();
            cc.vv.alert.show("提示","登录失败!");
        };
        
        cc.vv.http.sendRequest("/guest",{account:account}, this.onAuth, null, onError);
    },

    // guest 요청응답함수
    onAuth:function(ret){
        var self = cc.vv.userMgr;

        cc.vv.wc.hide();

        if(ret.errcode !== 0){
            cc.warn(ret.errmsg);
            cc.vv.alert.show("提示","登录失败!");
        }
        else{
            self.account = ret.account;
            self.sign = ret.sign;

            //이제부터는 hall server에 http요청을 보낸다.
            cc.vv.http.url = "http://" + cc.vv.SI.hall;
            self.login();
        }   
    },

    /*
     * send Http Request to hall server.
     * data: {account: account, sign: sign}
     *
     * requirement: this.account and thi.sign is already set.
     */
    login:function(){
        var self = this;

        var onLogin = function(ret){
            if(ret.errcode !== 0){
                cc.warn(ret.errmsg);
                cc.vv.alert.show("提示","登录失败!");
            }
            else{
                if(!ret.userid){
                    // there exists account information but failed to get userId.

                    if(!cc.sys.isNative || cc.sys.os == cc.sys.OS_WINDOWS){
                        cc.director.loadScene("createrole");    
                    }
                    else 
                    {
                        //send http request to account server.
                        cc.vv.http.setURL(cc.vv.app.getServerURL());
                        cc.vv.anysdkMgr.login();                        
                    }
                }
                else{
                    cc.info(ret);

                    self.account = ret.account;
        			self.userId = ret.userid;
        			self.userName = ret.name;
        			self.lv = ret.lv;
        			self.gems = ret.gems;
                    self.roomId = ret.roomid;
                    self.dealerId = ret.dealerId;

                    if (ret.sex == null) {
                        //default is man
                        self.sex = 1;
                    }
                    else {
                        self.sex = ret.sex;
                    }

                    self.ip = ret.ip;

        			cc.director.loadScene("hall");
                }
            }
        };

        var onError = function () {
            cc.vv.wc.hide();
            cc.vv.alert.show("提示","登录失败!");
        };

        cc.vv.http.sendRequest("/login",{account:this.account,sign:this.sign}, onLogin, null, onError);
    },
    
    create:function(name){
        var self = this;

        var onCreate = function(ret){
            if(ret.errcode !== 0){
                cc.warn(ret.errmsg);
            }
            else{
                self.login();
            }
        };
        
        var data = {
            account:this.account,
            sign:this.sign,
            name:name
        };

        cc.vv.http.sendRequest("/create_user",data,onCreate);    
    },

    //방에 들어가려고 시도한다.
    enterRoom:function(roomId, callback){
        var self = this;

        //응답이 있을 때의 처리부
        var onEnter = function(ret){
            if(ret.errcode !== 0){  //오유가 있으면
                if(ret.errcode == -1){
                    cc.vv.wc.hide();

                    cc.vv.alert.show('提示', '房间：' + roomId + '不存在！');
                }
                else{
                    cc.vv.wc.hide();

                    if(callback != null) {
                        callback(ret);
                    }
                }
            }
            else{
                if(callback != null) {
                    callback(ret);
                }    

                //오유가 없으면 방에 들어가기 위한 정보(ip와 포구번호)를 가지고 게임봉사기와 접속한다.
                cc.vv.gameNetMgr.connectGameServer(ret);
            }
        };
        
        var data = {
            account:cc.vv.userMgr.account,
            sign:cc.vv.userMgr.sign,
            roomid:roomId
        };

        var onOk = function () {
            self.enterRoom(roomId, callback);
        };

        var onCancel = function () {

        };

        var errorHandler = function () {
            cc.vv.wc.hide();
            cc.vv.alert.show('提示', '服务器连接失败! 错误代码: 1.\n 你想重试吗？', onOk, onCancel);
        };

        var timeoutHandler = function () {
            cc.vv.wc.hide();
            cc.vv.alert.show('提示', '服务器连接失败! 错误代码: 2. \n 你想重试吗？', onOk, onCancel);
        };

        var abortHandler = function () {
            cc.vv.wc.hide();
            cc.vv.alert.show('提示', '服务器连接失败! 错误代码: 3.\n 你想重试吗？', onOk, onCancel);
        };

        cc.vv.wc.show("正在进入房间: " + roomId);

        //방에 들어가기 위한 요청을 보낸다.
        cc.vv.http.sendRequest("/enter_private_room", data, onEnter, null, errorHandler, timeoutHandler, abortHandler);
    },

    getHistoryList:function(callback){
        var self = this;

        var onGet = function(ret){
            if(ret.errcode !== 0){
                cc.warn(ret.errmsg);
            }
            else{
                cc.log(ret.history);
                if(callback != null){
                    callback(ret.history);
                }
            }
        };

        var data = {
            account:cc.vv.userMgr.account,
            sign:cc.vv.userMgr.sign
        };

        cc.vv.http.sendRequest("/get_history_list",data,onGet);
    },

    getChargeHistoryList:function(callback){
        var self = this;

        var onGet = function(ret){
            cc.vv.wc.hide();

            if(ret.errcode !== 0){
                if(ret.errcode == 1){
                    cc.vv.alert.show('提示', '不存在数据!');
                }
                else {
                    cc.warn(ret.errmsg);
                }
            }
            else{
                cc.log(ret.history);

                if(callback != null){
                    callback(ret.data);
                }
            }
        };

        var data = {
            account:cc.vv.userMgr.account,
            sign:cc.vv.userMgr.sign
        };

        cc.vv.wc.show('正在收集数据...');

        cc.vv.http.sendRequest("/get_charge_history_list", data, onGet);
    },

    getGamesOfRoom:function(uuid,callback){
        var self = this;

        var onGet = function(ret){
            if(ret.errcode !== 0){
                cc.warn(ret.errmsg);
            }
            else{
                cc.log(ret.data);
                callback(ret.data);
            }
        };
        
        var data = {
            account:cc.vv.userMgr.account,
            sign:cc.vv.userMgr.sign,
            uuid:uuid
        };

        cc.vv.http.sendRequest("/get_games_of_room",data,onGet);
    },
    
    getDetailOfGame:function(uuid,index,callback){
        var self = this;

        var onGet = function(ret){
            if(ret.errcode !== 0){
                cc.warn(ret.errmsg);
            }
            else{
                cc.log(ret.data);
                callback(ret.data);
            }       
        };
        
        var data = {
            account:cc.vv.userMgr.account,
            sign:cc.vv.userMgr.sign,
            uuid:uuid,
            index:index
        };

        cc.vv.http.sendRequest("/get_detail_of_game",data,onGet);
    }
});
