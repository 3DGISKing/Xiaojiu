cc.Class({
    extends: cc.Component,

    properties: {
        _btnYXOpen:null,
        _btnYXClose:null,
        _btnYYOpen:null,
        _btnYYClose:null,

        _progressBarWidth:0
    },

    onLoad: function () {
        if(cc.vv == null){
            return;
        }
                
        this._btnYXOpen = this.node.getChildByName("yinxiao").getChildByName("yinxiao_on");
        this._btnYXClose = this.node.getChildByName("yinxiao").getChildByName("yinxiao_off");
        
        this._btnYYOpen = this.node.getChildByName("yinle").getChildByName("yinle_on");
        this._btnYYClose = this.node.getChildByName("yinle").getChildByName("yinle_off");

        if(this.node.getChildByName("ok")) {
            this.initButtonHandler(this.node.getChildByName("ok"));
        }

        if(this.node.getChildByName("change_account")) {
            this.initButtonHandler(this.node.getChildByName("change_account"));
        }

        if(this.node.getChildByName("close")) {
            this.initButtonHandler(this.node.getChildByName("close"));
        }

        this.initButtonHandler(this._btnYXOpen);
        this.initButtonHandler(this._btnYXClose);
        this.initButtonHandler(this._btnYYOpen);
        this.initButtonHandler(this._btnYYClose);
        
        var slider = this.node.getChildByName("yinxiao").getChildByName("progress");
        cc.vv.utils.addSlideEvent(slider,this.node,"Settings","onSlided");
        
        slider = this.node.getChildByName("yinle").getChildByName("progress");
        cc.vv.utils.addSlideEvent(slider,this.node,"Settings","onSlided");

        this._progressBarWidth = slider.width;
        
        this.refreshVolume();
    },
    
    onSlided:function(slider){
        if(slider.node.parent.name == "yinxiao"){
            cc.vv.audioMgr.setSFXVolume(slider.progress);
        }
        else if(slider.node.parent.name == "yinle"){
            cc.vv.audioMgr.setBGMVolume(slider.progress);
        }
        this.refreshVolume();
    },
    
    initButtonHandler:function(btn){
        cc.vv.utils.addClickEvent(btn,this.node,"Settings","onBtnClicked");    
    },
    
    refreshVolume:function(){
        this._btnYXClose.active = cc.vv.audioMgr.sfxVolume > 0;
        this._btnYXOpen.active = !this._btnYXClose.active;
        
        var yx = this.node.getChildByName("yinxiao");
        var width = this._progressBarWidth * cc.vv.audioMgr.sfxVolume;
        var progress = yx.getChildByName("progress");

        progress.getComponent(cc.Slider).progress = cc.vv.audioMgr.sfxVolume;
        progress.getChildByName("progress").width = width;  

        this._btnYYClose.active = cc.vv.audioMgr.bgmVolume > 0;
        this._btnYYOpen.active = !this._btnYYClose.active;
        var yy = this.node.getChildByName("yinle");

        width = this._progressBarWidth * cc.vv.audioMgr.bgmVolume;
        progress = yy.getChildByName("progress");
        progress.getComponent(cc.Slider).progress = cc.vv.audioMgr.bgmVolume; 
        
        progress.getChildByName("progress").width = width;
    },
    
    onBtnClicked:function(event){
        if(event.target.name == "ok"){
            this.node.active = false;
        }
        if(event.target.name == "close"){
            this.node.active = false;
        }
        else if(event.target.name == "change_account"){
            cc.sys.localStorage.removeItem("wx_account");
            cc.sys.localStorage.removeItem("wx_sign");
            cc.director.loadScene("login");
        }
        else if(event.target.name == "yinxiao_on"){
            cc.vv.audioMgr.setSFXVolume(1.0);
            this.refreshVolume(); 
        }
        else if(event.target.name == "yinxiao_off"){
            cc.vv.audioMgr.setSFXVolume(0);
            this.refreshVolume();
        }
        else if(event.target.name == "yinle_on"){
            cc.vv.audioMgr.setBGMVolume(1);
            this.refreshVolume();
        }
        else if(event.target.name == "yinle_off"){
            cc.vv.audioMgr.setBGMVolume(0);
            this.refreshVolume();
        }
    }
});
