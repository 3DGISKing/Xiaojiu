cc.Class({
    extends: cc.Component,

    properties: {
        bgmVolume:1.0,
        sfxVolume:1.0,
        
        bgmAudioID:-1
    },

    init: function () {
        var temp = cc.sys.localStorage.getItem("bgmVolume");

        if(temp != null){
            this.bgmVolume = parseFloat(temp);

            if(this.bgmVolume == 0){
                this.bgmVolume = 1;
            }
        }
        
        temp = cc.sys.localStorage.getItem("sfxVolume");

        if(temp != null){
            this.sfxVolume = parseFloat(temp);

            if(this.sfxVolume == 0){
                this.sfxVolume = 1;
            }
        }
        
        cc.game.on(cc.game.EVENT_HIDE, function () {
            cc.audioEngine.pauseAll();
        });

        cc.game.on(cc.game.EVENT_SHOW, function () {
            cc.audioEngine.resumeAll();
        });
    },

    getUrl:function(url){
        return cc.url.raw("resources/sounds/" + url);
    },
    
    playBGM: function(url){
        var audioUrl = this.getUrl(url);

        cc.log(audioUrl);

        if(this.bgmAudioID >= 0){
            cc.audioEngine.stop(this.bgmAudioID);
        }

        this.bgmAudioID = cc.audioEngine.play(audioUrl,true,this.bgmVolume);
    },
    
    playSFX: function(url){
        var audioUrl = this.getUrl(url);

        if(this.sfxVolume > 0){
            var audioId = cc.audioEngine.play(audioUrl,false,this.sfxVolume);    
        }
    },
    
    setSFXVolume:function(v){
        if(this.sfxVolume != v){
            cc.sys.localStorage.setItem("sfxVolume",v);
            this.sfxVolume = v;
        }
    },
    
    setBGMVolume:function(v,force){
        if(this.bgmAudioID >= 0){
            if(v > 0){
                cc.audioEngine.resume(this.bgmAudioID);
            }
            else{
                cc.audioEngine.pause(this.bgmAudioID);
            }
            //cc.audioEngine.setVolume(this.bgmAudioID,this.bgmVolume);
        }

        if(this.bgmVolume != v || force){
            cc.sys.localStorage.setItem("bgmVolume",v);
            this.bgmVolume = v;
            cc.audioEngine.setVolume(this.bgmAudioID,v);
        }
    },
    
    pauseAll:function(){
        cc.audioEngine.pauseAll();
    },
    
    resumeAll:function(){
        cc.audioEngine.resumeAll();
    }
});
