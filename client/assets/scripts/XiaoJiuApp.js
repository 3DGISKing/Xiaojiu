cc.Class({
    extends: cc.Component,

    properties: {
        version: '20161227',

        //serverIp: '192.168.1.34',
        serverIp: '39.108.213.109',
        serverPort: 9000
    },


    getVersionInfoString: function () {
        return this.version;
    },

    getServerURL: function () {
        return 'http://' + this.serverIp + ':' + this.serverPort;
    }

});
