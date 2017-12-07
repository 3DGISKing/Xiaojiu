if(window.io == null){
    window.io = require("socket-io");
}
 
var Global = cc.Class({
    extends: cc.Component,

    statics: {
        ip:"",
        sio:null,
        isPinging:false,
        fnDisconnect:null,
        handlers:{},

        addHandler:function(event,fn){
            if(this.handlers[event]){
                cc.warn("event:" + event + "' handler has already been registered.");
                return;
            }

            var handler = function(data){
                if(event != "disconnect" && typeof(data) == "string"){
                    data = JSON.parse(data);
                }

                if (data != null) {
                    cc.info('Game server has sent "' + event + '" to me. The data which game server has sent is following.');
                    cc.info(data);
                }
                else {
                    cc.info('Game server has sent "' + event + '" to me with no data.');
                }

                fn(data);
            };
            
            this.handlers[event] = handler;
        },

        connect:function(fnConnect,fnError) {
            var self = this;
           
            var opts = {
                'reconnection':false,
                'force new connection': true,
                'transports':['websocket', 'polling']
            };

            this.sio = window.io.connect(this.ip,opts);

            this.sio.on('reconnect',function(){
                cc.info('reconnection');
            });

            this.sio.on('connect',function(data){
                cc.info('Connection with game server established!');

                self.sio.connected = true;
                fnConnect(data);
            });
            
            this.sio.on('disconnect',function(data){
                cc.warn("Connection with game server disconnected!");

                self.sio.connected = false;
                self.close();
            });
            
            this.sio.on('connect_failed',function (){
                cc.warn('connect_failed');
            });
            
            for(var key in this.handlers){
                var value = this.handlers[key];

                if(typeof(value) == "function"){
                    if(key == 'disconnect'){
                        this.fnDisconnect = value;
                    }
                    else{
                        //cc.log("register: function " + key);
                        this.sio.on(key,value);                        
                    }
                }
            }
            
            this.startHearbeat();
        },
        
        startHearbeat:function(){
            this.sio.on('game_pong',function(){
                var logDisable = cc.args['ppLogDisable'];

                logDisable = true;

                if (logDisable == null){
                    cc.info('Game server has sent "game_pong" to me with no data.');
                }

                self.lastRecieveTime = Date.now(); 
            });

            this.lastRecieveTime = Date.now();

            var self = this;

            if(!self.isPinging){
                cc.info('Start ping to game server');
                self.isPinging = true;

                setInterval(function(){
                    var logDisable = cc.args['ppLogDisable'];

                    logDisable = true;

                    if (logDisable == null){
                        cc.info('Testing whether web socket with game server is valid...');
                    }

                    if(self.sio){
                        if (logDisable == null){
                            cc.info('Testing connection with game server...');
                        }

                        if(Date.now() - self.lastRecieveTime > 10000){
                            cc.warn('long response pong from game server!');
                            self.close();
                        }
                        else{
                            self.ping();
                        }                        
                    }

                    if (logDisable == null){
                        cc.info('Web socket with game server does not exist.');
                    }
                },5000);
            }   
        },

        send:function(event,data){
            var logDisable = cc.args['ppLogDisable'];

            logDisable = true;

            if (data != null) {
                if(event != 'game_ping' || (event == 'game_ping' && logDisable == null)) {
                    cc.info('I have sent "' + event + '" to game server. The data which I am sending is following.');
                    cc.info(data);
                }
            }
            else {
                if (event != 'game_ping' || (event == 'game_ping' && logDisable == null)) {
                    cc.info('I have sent "' + event + '" to game server with no data.');
                }
            }

            if(this.sio && this.sio.connected){
                if(data != null && (typeof(data) == "object")){
                    data = JSON.stringify(data);

                }

                this.sio.emit(event,data);                
            }
        },
        
        ping:function(){
            this.send('game_ping');
        },
        
        close:function(){
            if(this.sio && this.sio.connected){
                this.sio.connected = false;
                this.sio.disconnect();
                this.sio = null;

                cc.info('disconnect web socket with game server!');
            }

            if(this.fnDisconnect){
                this.fnDisconnect();
                this.fnDisconnect = null;
            }
        },
        
        test:function(fnResult){
            var xhr = null;

            var fn = function(ret){
                fnResult(ret.isonline);
                xhr = null;
            };
            
            var arr = this.ip.split(':');

            var data = {
                account:cc.vv.userMgr.account,
                sign:cc.vv.userMgr.sign,
                ip:arr[0],
                port:arr[1]
            };

            var emptyFn = function () {

            };

            xhr = cc.vv.http.sendRequest("/is_server_online",data,fn, null, emptyFn, emptyFn, emptyFn);

            setTimeout(function(){
                if(xhr){
                    xhr.abort();
                    fnResult(false);                    
                }
            },1500);
        }
    }
});