cc.Class({
    extends: cc.Component,

    properties: {
        _yirenyizhuangCheckBox:null
    },

    onLoad: function () {
        this._yirenyizhuangRadioButton = cc.find('Canvas/popups/create_room/jushu/yirenyizhuang_radio_button').getComponent('RadioButton');

        this.enableJifenzhiTab();
    },

    enableJifenzhiTab:function () {
        cc.find('Canvas/popups/create_room/jifenzhi_tab_enabled').active = true;
        cc.find('Canvas/popups/create_room/jifenzhi_tab_disabled').active = false;

        cc.find('Canvas/popups/create_room/bilizhi_tab_enabled').active = false;
        cc.find('Canvas/popups/create_room/bilizhi_tab_disabled').active = true;

        cc.find('Canvas/popups/create_room/jifenzhi_difen').active = true;
        cc.find('Canvas/popups/create_room/bilizhi_difen').active = false;
    },

    enableBilizhiTab:function () {
        cc.find('Canvas/popups/create_room/jifenzhi_tab_enabled').active = false;
        cc.find('Canvas/popups/create_room/jifenzhi_tab_disabled').active = true;

        cc.find('Canvas/popups/create_room/bilizhi_tab_enabled').active = true;
        cc.find('Canvas/popups/create_room/bilizhi_tab_disabled').active = false;

        cc.find('Canvas/popups/create_room/jifenzhi_difen').active = false;
        cc.find('Canvas/popups/create_room/bilizhi_difen').active = true;
    },

    refreshFangfei:function() {
        if(this._yirenyizhuangRadioButton.getChecked()){
            cc.find('Canvas/popups/create_room/yirenyizhuangfangfei').active = true;
            cc.find('Canvas/popups/create_room/yirenerzhuangfangfei').active = false;
        }
        else {
            cc.find('Canvas/popups/create_room/yirenyizhuangfangfei').active = false;
            cc.find('Canvas/popups/create_room/yirenerzhuangfangfei').active = true;
        }
    },

    onJifenzhiTabClicked:function () {
        this.enableJifenzhiTab();
    },

    onBilizhiTabClicked:function () {
        this.enableBilizhiTab();
    },

    onCloseButtonClicked:function(){
        this.node.active = false;
    },

    onOKButtonClicked:function(){
        this.node.active = false;
        this.createRoom();
    },

    createRoom:function(){
        var shangzhuangDifenRadioButtonArray = [];

        var temp = this.node.getChildByName('shangzhuangdifen');

        var radioButton = null;

        for (var i = 0; i < temp.getChildrenCount(); i++) {
            radioButton = temp.children[i].getComponent('RadioButton');

            if(radioButton != null) {
                shangzhuangDifenRadioButtonArray.push(radioButton);
            }
        }

        cc.assert( shangzhuangDifenRadioButtonArray.length == 3, 'internal error');

        var shangzhuangDifen = 0;

        if (shangzhuangDifenRadioButtonArray[0].getChecked()) {
            shangzhuangDifen = 120;
        }
        else if (shangzhuangDifenRadioButtonArray[1].getChecked()) {
            shangzhuangDifen = 240;
        }
        else if (shangzhuangDifenRadioButtonArray[2].getChecked()) {
            shangzhuangDifen = 480;
        }
        else {
            throw new Error('internal error');
        }

        var jifenzhiTabEnabledNode = this.node.getChildByName('jifenzhi_tab_enabled');

        var jifenzhiTabActive = jifenzhiTabEnabledNode.active;

        var jushuType = -1;

        var yirenyizhuangRadioButton = cc.find('Canvas/popups/create_room/jushu/yirenyizhuang_radio_button').getComponent('RadioButton');
        var yirenerzhuangRadioButton = cc.find('Canvas/popups/create_room/jushu/yirenerzhuang_radio_button').getComponent('RadioButton');

        if( yirenyizhuangRadioButton.getChecked()) {
            jushuType = 1; //1人1庄
        }
        else {
            jushuType = 2; //1人2庄
        }

        var fangfeiType = -1;
        var fangfei = 0;

        if (jushuType == 1) {
            var yirenYizhuangFangfeiRadioButtonArrayArray = [];

            temp = this.node.getChildByName('yirenyizhuangfangfei');

            for( i = 0; i < temp.childrenCount; ++i){
                radioButton = temp.children[i].getComponent("RadioButton");

                if(radioButton != null){
                    yirenYizhuangFangfeiRadioButtonArrayArray.push(radioButton);
                }
            }

            cc.assert(yirenYizhuangFangfeiRadioButtonArrayArray.length == 2, 'internal error');

           if (yirenYizhuangFangfeiRadioButtonArrayArray[0].getChecked()) {
               fangfeiType = 1; //局主支付
               fangfei = 8;
           }
           else if (yirenYizhuangFangfeiRadioButtonArrayArray[1].getChecked()) {
               fangfeiType = 2; //支付(每人
               fangfei = 2;
           }
           else {
               throw new Error('internal error');
           }
        }
        else if (jushuType == 2) {
            var yirenErzhuangFangfeiRadioButtonArrayArray = [];

            temp = this.node.getChildByName('yirenerzhuangfangfei');

            for( i = 0; i < temp.childrenCount; ++i){
                radioButton = temp.children[i].getComponent("RadioButton");

                if(radioButton != null){
                    yirenErzhuangFangfeiRadioButtonArrayArray.push(radioButton);
                }
            }

            cc.assert(yirenErzhuangFangfeiRadioButtonArrayArray.length == 2, 'internal error');

            if (yirenErzhuangFangfeiRadioButtonArrayArray[0].getChecked()) {
                fangfeiType = 1; //局主支付
                fangfei = 15;
            }
            else if (yirenErzhuangFangfeiRadioButtonArrayArray[1].getChecked()) {
                fangfeiType = 2; //支付(每人
                fangfei = 4;
            }
            else {
                throw new Error('internal error');
            }
        }
        else {
            throw new Error('internal error');
        }

        var tuoguanCheckBox = cc.find('Canvas/popups/create_room/youxiketuoguan/check_box').getComponent('CheckBox');

        var tuoguan = tuoguanCheckBox.getChecked();

        var difenType = -1;

        if (jifenzhiTabActive) {
            difenType = 1; // 积分制
        }
        else {
            difenType = 2; // 比例制
        }

        var conf = {
            difenType: difenType,               // 1: 积分制 2: 比例制
            shangzhuangDifen: shangzhuangDifen, //단위 分
            jushuType:jushuType,                // 1: 1人1庄 2: 1人2庄
            fangfeiType: fangfeiType,           // 1: 局主支付 2: 每人支付
            fangfei: fangfei,                   //단위 分
            tuoguan: tuoguan                    //boolean
        };

        var data = {
            account: cc.vv.userMgr.account,
            sign: cc.vv.userMgr.sign,
            conf: JSON.stringify(conf)
        };

        var onCreate = function(ret){
            if(ret.errcode !== 0){
                cc.vv.wc.hide();

                if(ret.errcode == 2222){//방카드가 부족하여 방창조가 실패하는 경우
                    cc.vv.alert.show("提示","房卡不足，创建房间失败!");
                }
                else{ //기타 원인으로 방창조가 실패하는 경우
                    if (ret.errcode == 101) {
                        cc.vv.alert.show("提示","创建房间失败. 无法连接游戏服务器!");
                    }
                    else {
                        cc.vv.alert.show("提示","创建房间失败,错误码:" + ret.errcode);
                    }
                }
            }
            else{//방창조 성공
                cc.vv.gameNetMgr.connectGameServer(ret);
            }
        };

        var errorHandler = function () {
            cc.vv.wc.hide();
            cc.vv.alert.show('提示', '服务器连接失败! 错误代码: 1');
        };

        var timeoutHandler = function () {
            cc.vv.wc.hide();
            cc.vv.alert.show('提示', '服务器连接失败! 错误代码: 2');
        };

        var abortHandler = function () {
            cc.vv.wc.hide();
            cc.vv.alert.show('提示', '服务器连接失败! 错误代码: 3');
        };

        cc.vv.wc.show("正在创建房间...");
        cc.vv.http.sendRequest("/create_private_room", data, onCreate, null, errorHandler, timeoutHandler, abortHandler);
    }
});
