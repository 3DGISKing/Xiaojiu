
cc.Class({
    extends: cc.Component,

    properties: {
        userNameLabel:cc.Label,
        userIDLabel:cc.Label,
        userGemLabel:cc.Label,

        createRoomButton:cc.Button,
        joinGameButton:cc.Button,

        noticeLabel:cc.Label,

        headImageSprite: cc.Sprite,

        _noticeLabelSpeed:100,
        _noticeLabelStartX:0,
        _noticeLabelEndX:0,

        _availableRoomsContent: null,
        _availableRoomsItemTemp: null
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

        if(cc.vv.gameNetMgr.roomId == null)
            this.joinGameButton.active = true;
        else
            this.joinGameButton.active = false;

        this.initUserInfo();

        var roomId = cc.vv.userMgr.oldRoomId;

        // 게임을 하다가 disconnect 되여 hall 로 나오는 경우

        if( roomId != null){
            cc.vv.userMgr.oldRoomId = null;
            cc.vv.userMgr.enterRoom(roomId, function (ret) {
                if (ret.errcode != 0) {
                    cc.vv.gameNetMgr.reset();
                    cc.vv.alert.show("提示", "房间["+ roomId +"]不存在! \n 也许游戏已经退出！");
                }
            });
        }

        var imgLoader = this.headImageSprite.node.getComponent("ImageLoader");

        imgLoader.setUserID(cc.vv.userMgr.userId);

        if(!cc.vv.userMgr.notice){
            cc.vv.userMgr.notice = {
                version:null,
                msg:"数据请求中..."
            }
        }

        if(!cc.vv.userMgr.gemstip){
            cc.vv.userMgr.gemstip = {
                version:null,
                msg:"数据请求中..."
            }
        }

        this.noticeLabel.string = cc.vv.userMgr.notice.msg;
        this._noticeLabelStartX = this.noticeLabel.node.x;
        this._noticeLabelEndX = -352;

        this.addComponent("UserInfoShow");

        this._availableRoomsContent = cc.find('Canvas/main/room_table/scrollview/view/content');
        this._availableRoomsItemTemp = this._availableRoomsContent.children[0];
        this._availableRoomsContent.removeChild(this._availableRoomsItemTemp);

        // cc.vv.anysdkMgr.refreshGems();
        this.refreshInfo();
        this.refreshNotice();

        cc.vv.audioMgr.playBGM('background/hall.mp3');
    },

    initNetHandlers:function(){
        var self = this;
    },

    initUserInfo:function(){
        this.userNameLabel.string = cc.vv.userMgr.userName;
        this.userGemLabel.string = cc.vv.userMgr.gems;
        this.userIDLabel.string = "ID:" + cc.vv.userMgr.userId;
    },

    onCreateRoomButtonClicked:function () {
        /**
         *    정상적인 로직에서는 이 경우가 있을수 없다.
         *    이것은 봉사기에 이 방이 존재하지 않는다는것을 의미한다.
         *    만일 방이 존재한다면 hall 에서 그 방에 들어보낸다.
         */

        if(cc.vv.gameNetMgr.roomId != null){
            cc.warn("提示","房间已经创建!\n 必须解散当前房间才能创建新的房间");
        }

        cc.find('Canvas/popups/create_room').active = true;
    },

    onJoinGameButtonClicked:function(){
        cc.find('Canvas/popups/join_game').active = true;
    },

    onBackButtonClicked: function() {
        cc.sys.localStorage.removeItem("wx_account");
        cc.sys.localStorage.removeItem("wx_sign");

        cc.audioEngine.stopAll();
        cc.director.loadScene("login");
    },
    
    onHeadButtonClicked: function () {
        cc.vv.userinfoShow.show(cc.vv.userMgr.userName, cc.vv.userMgr.userId, this.headImageSprite, cc.vv.userMgr.sex, cc.vv.userMgr.ip);
    },

    onMenuButtonClicked: function() {
        cc.find('Canvas/popups/menu').active = ! cc.find('Canvas/popups/menu').active;
    },

    onGemAddButtonClicked: function() {
        cc.find('Canvas/popups/charge').active = true;
    },

    onShopButtonClicked: function () {
        cc.find('Canvas/popups/charge').active = true;
    },

    onYouqingmaButtonClicked: function () {
        cc.find('Canvas/popups/youqingma').active = true;

        if (cc.vv.userMgr.dealerId > 0) {
            cc.vv.alert.show("提示","您的代理商已经设定!");
        }
    },

    onYouqingmaCloseButtonClicked: function () {
        cc.find('Canvas/popups/youqingma').active = false;
    },

    onRuleButtonClicked: function() {
        cc.vv.wc.show('正在收集数据...');

        var self = this;

        var onGet = function(ret){
            cc.vv.wc.hide();

            if(ret.errcode !== 0){
                cc.warn(ret.errmsg);
                cc.vv.alert.show("提示","数据收集失败!");
            }
            else{
                cc.find('Canvas/popups/rule/scrollview/view/content').getComponent(cc.Label).string = ret.msg;
                cc.find('Canvas/popups/rule').active = true;
            }
        };

        var data = {
            account:cc.vv.userMgr.account,
            sign:cc.vv.userMgr.sign,
            type:'rule',
            version:1
        };

        cc.vv.http.sendRequest("/get_message",data,onGet.bind(this));
    },

    onRuleOkButtonClicked: function() {
        cc.find('Canvas/popups/rule').active = false;
    },

    onHistoryButtonClicked: function() {
        cc.find('Canvas/popups/history').active = true;
    },

    onShareButtonClicked: function() {
        cc.find('Canvas/popups/share').active = true;
    },

    onShareWeChat:function(){
        cc.vv.anysdkMgr.share("wechat: 二八小九","二八小九 测试版本。");
    },

    onShareOther:function(){
        cc.vv.anysdkMgr.share("other:二八小九","二八小九 测试版本。");
    },

    onShareSceneMaskClicked: function() {
        cc.find('Canvas/popups/share').active = false;
    },

    onMenuFeedbackButtonClicked: function() {
        cc.find('Canvas/popups/contact').active = true;
        cc.find('Canvas/popups/menu').active = false;
    },

    onMenuHelpButtonClicked: function() {
        cc.find('Canvas/popups/menu').active = false;
        
        cc.vv.wc.show('正在收集数据...');

        var self = this;

        var onGet = function(ret){
            cc.vv.wc.hide();

            if(ret.errcode !== 0){
                cc.warn(ret.errmsg);
                cc.vv.alert.show("提示","数据收集失败!");
            }
            else{
                cc.find('Canvas/popups/help/scrollview/view/content').getComponent(cc.Label).string = ret.msg;
                cc.find('Canvas/popups/help').active = true;
            }
        };

        var data = {
            account:cc.vv.userMgr.account,
            sign:cc.vv.userMgr.sign,
            type:'help',
            version:1
        };

        cc.vv.http.sendRequest("/get_message",data,onGet.bind(this));
    },

    onHelpOkButtonClicked: function() {
        cc.find('Canvas/popups/help').active = false;
    },

    onMenuSettingButtonClicked: function() {
        cc.find('Canvas/popups/setting').active = true;
        cc.find('Canvas/popups/menu').active = false;
    },

    onMenuExitButtonClicked: function(){
        var exitFn = function() {
            cc.game.end();
        };

        var cancelFn = function() {

        };

        cc.find('Canvas/popups/menu').active = false;
        cc.vv.alert.show("提示","是不要退出游戏?", exitFn, cancelFn);
    },

    onContactCloseButtonClicked: function () {
        cc.find('Canvas/popups/contact').active = false;
    },

    onMenuSceneMaskClicked: function() {
        cc.find('Canvas/popups/menu').active = false;
    },

    refreshInfo:function(){
        var self = this;

        var onGet = function(ret){
            if(ret.errcode !== 0){
                cc.warn(ret.errmsg);
            }
            else{
                if(ret.gems != null){
                    self.userGemLabel.string = ret.gems;
                }

                if(ret.availableRooms){
                    cc.info('avilable rooms initiating ..........................');
                    self.initAvailableRooms(ret.availableRooms);
                }
            }
        };

        var data = {
            account:cc.vv.userMgr.account,
            sign:cc.vv.userMgr.sign
        };

        cc.vv.http.sendRequest("/get_user_status",data,onGet.bind(this));
    },

    onAvailableRoomItemClicked: function (event) {
        var roomId = event.target.roomid;
        cc.vv.userMgr.enterRoom(roomId,function(ret){
            if(ret.errcode == 0){
                //this.node.active = false;
            }
            else{
                var content = "房间["+ roomId +"]不存在，请重新输入!";

                if(ret.errcode == 4){
                    content = "房间["+ roomId + "]已满!";
                }

                cc.vv.alert.show("提示",content);
                this._availableRoomsContent.removeChild(event.target);
                var availableRoomsMsgNode = cc.find('Canvas/main/room_table/room_table_message');
                if(this._availableRoomsContent.childrenCount > 0){
                    availableRoomsMsgNode.active = false;
                }
                else{
                    availableRoomsMsgNode.active = true;
                }
            }
        }.bind(this));
    },

    onAvailableRoomYaoqingClicked: function (event) {
        var roomid = event.target.roomid;
        cc.info("Available Room Invite. roomid: " + roomid);
        cc.vv.anysdkMgr.shareRoom("wechat: 二八小九", "yjdlsoftscxj://xiaojiu/?roomid=" + roomid,"二八小九。 房间号:" + roomid);
    },

    initAvailableRooms: function(data){
        cc.info('available rooms data: ' + JSON.stringify(data));
        if(!data) return;

        cc.info('available rooms table cleared. .................................');
        this.clearAvailableRooms();

        for(var i = 0; i < data.length; i++){
            var room = data[i];
            var node = this.getAvailableRoomViewItem(i);
            node.getChildByName('room_number').getComponent(cc.Label).string = room.roomid;
            node.getChildByName('difen').getComponent(cc.Label).string = room.difen;
            node.getChildByName('jushu').getComponent(cc.Label).string = room.jushu;
            node.getChildByName('player_number').getComponent(cc.Label).string = room.players;
            node.getChildByName('yaoqing_button').roomid = room.roomid;
            node.roomid = room.roomid;
        }

        var availableRoomsMsgNode = cc.find('Canvas/main/room_table/room_table_message');
        if(data.length > 0){
            availableRoomsMsgNode.active = false;
        }
        else{
            availableRoomsMsgNode.active = true;
        }
    },

    getAvailableRoomViewItem:function(index){

        var content = this._availableRoomsContent;

        if(content.childrenCount > index){
            return content.children[index];
        }

        var node = cc.instantiate(this._availableRoomsItemTemp);
        content.addChild(node);

        return node;
    },

    clearAvailableRooms: function () {
        var content = this._availableRoomsContent;
        while(content.childrenCount > 0){
            var lastOne = content.children[content.childrenCount -1];
            content.removeChild(lastOne,true);
        }
    },

    refreshNotice:function(){
        var self = this;

        var onGet = function(ret){
            if(ret.errcode !== 0){
                cc.warn(ret.errmsg);
            }
            else{
                cc.vv.userMgr.notice.version = ret.version;
                cc.vv.userMgr.notice.msg = ret.msg;
                self.noticeLabel.string = ret.msg;
            }
        };

        var data = {
            account:cc.vv.userMgr.account,
            sign:cc.vv.userMgr.sign,
            type:"notice",
            version:cc.vv.userMgr.notice.version
        };

        cc.vv.http.sendRequest("/get_message",data,onGet.bind(this));
    },

    update: function (dt) {
        if(!cc.vv)
            return;

        var x = this.noticeLabel.node.x;

        x -= dt * this._noticeLabelSpeed;

        if(x + this.noticeLabel.node.width < this._noticeLabelEndX){
            x = this._noticeLabelStartX;
        }

        this.noticeLabel.node.x = x;
        
        if(cc.vv && cc.vv.userMgr.roomId != null){
            var roomId = cc.vv.userMgr.roomId;

            cc.vv.userMgr.enterRoom(roomId, function (ret) {
                if (ret.errcode != 0) {
                    cc.vv.gameNetMgr.reset();
                    cc.vv.alert.show("提示", "房间["+ roomId +"]不存在! \n 也许游戏已经退出！");
                }
            } );

            cc.vv.userMgr.roomId = null;
        }
    }
});
