cc.Class({
    extends: cc.Component,

    properties: {
        _chargeHistoryContent: null,
        _chargeHistoryItemSample:null
    },

    onLoad: function () {
        this._chargeHistoryContent = cc.find('Canvas/popups/charge/record/view/content');
        this._chargeHistoryItemSample = cc.find('Canvas/popups/charge/record/view/content/item');

        this._chargeHistoryContent.removeChild(this._chargeHistoryItemSample);

        this.enableChargeTab();
    },

    enableChargeTab:function () {
        cc.find('Canvas/popups/charge/charge_enabled').active = true;
        cc.find('Canvas/popups/charge/charge_disabled').active = false;

        cc.find('Canvas/popups/charge/record_enabled').active = false;
        cc.find('Canvas/popups/charge/record_disabled').active = true;

        cc.find('Canvas/popups/charge/charge').active = true;
        cc.find('Canvas/popups/charge/record').active = false;

        cc.find('Canvas/popups/charge/charge_enabled').setLocalZOrder(1);
        cc.find('Canvas/popups/charge/record_disabled').setLocalZOrder(0);
    },

    enableRecordTab:function () {
        cc.find('Canvas/popups/charge/charge_enabled').active = false;
        cc.find('Canvas/popups/charge/charge_disabled').active = true;

        cc.find('Canvas/popups/charge/record_enabled').active = true;
        cc.find('Canvas/popups/charge/record_disabled').active = false;

        cc.find('Canvas/popups/charge/charge').active = false;
        cc.find('Canvas/popups/charge/record').active = true;

        cc.find('Canvas/popups/charge/record_enabled').setLocalZOrder(1);
        cc.find('Canvas/popups/charge/charge_disabled').setLocalZOrder(0);
    },

    initChargeHistory:function(){
        var self = this;

        cc.vv.userMgr.getChargeHistoryList(function(data){
            data.sort(function(a,b){
                return a.created_at < b.created_at;
            });

            self.doInitChargeHistory(data);
        });
    },

    doInitChargeHistory: function(data) {
        for(var i = 0; i < data.length; ++i) {
            var node = this.getChargeHistoryItem(i);

            node.getChildByName('no').getComponent(cc.Label).string = data[i].id;

            //充值数量에는 보석개수
            node.getChildByName('charge_amount').getComponent(cc.Label).string = data[i].total_amount;

            //金额에는 실지 지불한 돈액수
            //우리의 경우에 充值数量과 金额는 같다.
            //5원에 보석 5개, 10원에 보석 10개를 사므로

            node.getChildByName('price').getComponent(cc.Label).string = data[i].total_amount;

            if (cc.vv.userMgr.dealerId) {
                node.getChildByName('youqingma').getComponent(cc.Label).string = cc.vv.userMgr.dealerId;
            }
            else
            {
                node.getChildByName('youqingma').getComponent(cc.Label).string = '';
            }

            var chinsesStatus = data[i].status;

            if (data[i].status == 'success') {
                chinsesStatus = '已购买'
            }
            else if (data[i].status == 'waiting') {
                chinsesStatus = '处理中'
            }

            node.getChildByName('status').getComponent(cc.Label).string = chinsesStatus;
            node.getChildByName('time').getComponent(cc.Label).string = this.dateFormat(parseInt(data[i].created_at));
        }
    },

    dateFormat:function(time){
        var date = new Date(time);

        var year = date.getFullYear();
        var month = date.getMonth() + 1;

        month = month >= 10? month : ("0"+month);

        var day = date.getDate();

        day = day >= 10? day : ("0"+day);

        var h = date.getHours();

        h = h >= 10? h : ("0"+h);

        var m = date.getMinutes();

        m = m >= 10? m : ("0"+m);

        var s = date.getSeconds();

        s = s >= 10? s : ("0"+s);

        return  year + "/" + month + "/" + day + " " + h + ":" + m + ":" + s;
    },

    getChargeHistoryItem:function(index){
        var content = this._chargeHistoryContent;

        if(content.childrenCount > index){
            return content.children[index];
        }

        var node = cc.instantiate(this._chargeHistoryItemSample);

        content.addChild(node);

        return node;
    },

    getChargeAmount: function(chargeButtonName){
        if (chargeButtonName == '6') {
            return 6;
        }
        else if (chargeButtonName == '18') {
             return 18;
        }
        else if (chargeButtonName == '30') {
            return 30;
        }
        else if (chargeButtonName == '45') {
            return 45;
        }
        else {
            return 0;
        }
    },

    doBuy: function(event) {
        var data = {
            account:cc.vv.userMgr.account,
            sign:cc.vv.userMgr.sign,
            token:cc.vv.userMgr.token,
            targetItem: event.target.name
        };

        var self = this;

        cc.vv.wc.show("正在链接服务器...");

        if(cc.sys.isNative == false) {
            //only for test

            var chargeAmount = self.getChargeAmount(event.target.name);

            data = {
                userId:cc.vv.userMgr.userId,
                amount: chargeAmount
            };

            cc.vv.http.sendRequest("/guest_dealer_logic", data, function(ret) {
                cc.vv.wc.hide();
                cc.vv.alert.show("提示","这是测试!");
            });

            return;
        }

        var timeoutHandler = function () {
            cc.vv.wc.hide();
            cc.vv.alert.show('提示', '很抱歉, 请重试!');
        };

        cc.vv.http.sendRequest("/api/buy_goods", data, function(ret) {
            cc.vv.wc.hide();

            var order_info = JSON.stringify(ret);
            cc.info(order_info);

            if (ret.errcode == 0) {
               cc.vv.anysdkMgr.weixinpay(order_info);
            }
            else if (ret.errcode == 1) {
                cc.vv.alert.show("提示","未能获得用户数据!");
            }
            else if(ret.errcode == 2) {
                cc.vv.alert.show("提示","未能获得产品的信息!");
            }
            else {
                cc.vv.alert.show("提示","失败!");
            }
        }, null, null, timeoutHandler);
    },

    onChargeButtonClicked: function() {
        this.enableChargeTab();
    },
    
    onRecordButtonClicked: function() {
        this.enableRecordTab();
        this.initChargeHistory();
    },

    onCloseButtonClicked: function() {
        this.node.active = false;
    }
});
