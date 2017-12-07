cc.Class({
    extends: cc.Component,

    properties: {

    },

    onLoad: function () {

    },

    onEnable: function() {
        var dealerId = cc.vv.userMgr.dealerId;

        if (dealerId > 0){
            this.node.getChildByName('dealer_id').getComponent(cc.EditBox).string = dealerId;
            this.node.getChildByName('bind').getComponent(cc.Button).interactable = false;
        }
    },

    onBindButtonClicked: function() {
        if (cc.vv.userMgr.dealerId > 0) {
            cc.vv.alert.show("提示","您的代理商已经设定!");
            return;
        }

        var dealerId = this.node.getChildByName('dealer_id').getComponent(cc.EditBox).string;

        if (dealerId == '') {
            cc.vv.alert.show("提示","请输入有效的号码!");
            return;
        }

        dealerId = parseInt(dealerId);

        if (dealerId == cc.vv.userMgr.userId) {
            cc.vv.alert.show("提示", "你输入的相等你的!");
            return;
        }

        var callback = function(ret){
            cc.vv.wc.hide();

            if(ret.errcode !== 0){
                if (ret.errcode == 1) {
                    cc.vv.alert.show("提示","帐户检查失败!");
                }
                else if (ret.errcode == 2)
                {
                    cc.vv.alert.show("提示", 'Id: ' + dealerId + " 不存在!");
                }
                else if (ret.errcode == 3)
                {
                    cc.vv.alert.show("提示", '获取用户宝石失败!');
                }
            }
            else{
                cc.vv.userMgr.dealerId = dealerId;
                cc.vv.userMgr.gems += 8;

                cc.find('Canvas/main/gem/gem').getComponent(cc.Label).string = cc.vv.userMgr.gems;

                cc.vv.alert.show("提示","绑定邀请码成功!");
            }
        };

        var data = {
            dealerId: dealerId,
            userId: cc.vv.userMgr.userId,
            account:cc.vv.userMgr.account,
            sign:cc.vv.userMgr.sign
        };

        cc.vv.wc.show("正在链接服务器...");

        cc.vv.http.sendRequest("/set_dealer_id", data, callback.bind(this));
    }
});
