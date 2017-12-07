cc.Class({
    extends: cc.Component,

    properties: {
        _userinfo:null
    },

    onLoad: function () {
        if(cc.vv == null){
            return;
        }
        
        this._userinfo = cc.find("Canvas/userinfo");
        this._userinfo.active = false;

        cc.vv.utils.addClickEvent(this._userinfo, this.node, "UserInfoShow", "onClicked");
        
        cc.vv.userinfoShow = this;
    },
    
    show:function(name, userId, iconSprite, sex, ip){
        if(userId != null && userId > 0){
            this._userinfo.active = true;
            this._userinfo.getChildByName("head_icon").getComponent(cc.Sprite).spriteFrame = iconSprite.spriteFrame;
            cc.find("Canvas/userinfo/name_mask/name").getComponent(cc.Label).string = name;

            if (ip == null) {
                this._userinfo.getChildByName("ip").getComponent(cc.Label).string = "IP: " + '未知';
            }
            else {
                this._userinfo.getChildByName("ip").getComponent(cc.Label).string = "IP: " + ip.replace("::ffff:","");
            }

            this._userinfo.getChildByName("id").getComponent(cc.Label).string = "ID: " + userId;
            
            var sex_female = this._userinfo.getChildByName("sex_man");
            sex_female.active = false;
            
            var sex_male = this._userinfo.getChildByName("sex_woman");
            sex_male.active = false;

            var sex_unknown = this._userinfo.getChildByName("sex_unknown");
            sex_unknown.active = false;
            
            if(sex == 1){
                sex_male.active = true;
            }   
            else if(sex == 2){
                sex_female.active = true;
            }
            else{
                cc.warn('invalid sex: ' + sex);
                sex_unknown.active = true;
            }
        }
    },
    
    onClicked:function(){
        this._userinfo.active = false;
    }
});
