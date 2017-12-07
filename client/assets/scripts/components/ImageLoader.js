function loadImage(url,code,callback){
    cc.loader.load({url: url, type: 'jpg'},function (err,tex) {
        if (tex == null) {
            //download failed or invalid image url
            return;
        }

        var spriteFrame = new cc.SpriteFrame(tex, cc.Rect(0, 0, tex.width, tex.height));
        callback(code,spriteFrame);
    });
}

function getBaseInfo(userid, callback){
    if(cc.vv.baseInfoMap == null){
        cc.vv.baseInfoMap = {};
    }
    
    if(cc.vv.baseInfoMap[userid] != null){
        callback(userid, cc.vv.baseInfoMap[userid]);
    }
    else{
        var emptyFn = function () {

        };

        cc.vv.http.sendRequest('/base_info', {userid:userid}, function(ret){
            var url = null;

            if(ret.headimgurl){
               url = ret.headimgurl;
            }

            var info = {
                name:ret.name,
                sex:ret.sex,
                url:url
            };

            cc.vv.baseInfoMap[userid] = info;
            callback(userid, info);
            
        }, cc.vv.http.master_url, emptyFn, emptyFn, emptyFn);
    }  
}

cc.Class({
    extends: cc.Component,
    properties: {
        defaultSpriteFrame: cc.SpriteFrame
    },

    onLoad: function () {
        this.setupSpriteFrame();
    },
    
    setUserID:function(userid){
        if(cc.sys.isNative == false){
            return;
        }

        var spr = this.getComponent(cc.Sprite);

        if(spr){
            spr.spriteFrame = this.defaultSpriteFrame;
        }

        if(!userid){
           return;
        }

        var self = this;

        getBaseInfo(userid, function(code, info){
           if(info && info.url){
               if(cc.vv.headSpriteFrameHash == null){
                   cc.vv.headSpriteFrameHash = {};
               }

                if (cc.vv.headSpriteFrameHash[info.url] != null ) {
                    self._spriteFrame = cc.vv.headSpriteFrameHash[info.url];
                    self.setupSpriteFrame();
                    return;
                }

                loadImage(info.url, userid,function (err,spriteFrame) {
                    self._spriteFrame = spriteFrame;
                    self.setupSpriteFrame();

                    cc.vv.headSpriteFrameHash[info.url] = spriteFrame;
                });   
            } 
        });
    },
    
    setupSpriteFrame:function(){
        if(this._spriteFrame && this.node){
            var spr = this.getComponent(cc.Sprite);

            if(spr){
                spr.spriteFrame = this._spriteFrame;    
            }
        }
    }
});
