'use strict';

cc.Class({
    extends: cc.Component,

    properties: {
        _reconnectNode:null,
        _tipLabel:null,
        _lastPing:0
    },

    onLoad: function () {
        this._reconnectNode = cc.find("Canvas/reconnect");
        this._tipLabel = cc.find("Canvas/reconnect/tip").getComponent(cc.Label);
        var self = this;
        
        var fnTestServerOn = function(){
            cc.vv.net.test(function(ret){
               if(ret){
                    cc.director.loadScene('hall');                
               }
               else{
                   setTimeout(fnTestServerOn,3000);
               }
            });
        };
        
        var fn = function(data){
            self.node.off('disconnect',fn);
            self._reconnectNode.active = true;
            fnTestServerOn();
        };

        this.node.on('disconnect',fn);
    },

    update: function (dt) {
        if(this._reconnectNode.active){
            var t = Math.floor(Date.now() / 1000) % 4;

            this._tipLabel.string = "与服务器断开连接，正在尝试重连";

            for(var i = 0; i < t; ++ i){
                this._tipLabel.string += '.';
            }
        }
    }
});
