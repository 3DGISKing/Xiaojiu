
cc.Class({
    extends: cc.Component,

    statics:{
        sessionId : 0,
        userId : 0,
        master_url: null,
        url: null,

        sendRequest : function(path, data, handler, Url, errorHandler, timeoutHandler, abortHandler){
            if(Url == null)
                Url = this.url;

            var str = "?";

            for(var k in data){
                if(str != "?"){
                    str += "&";
                }
                str += k + "=" + data[k];
            }

            var requestURL = Url + path + encodeURI(str);

            var xhr = cc.loader.getXMLHttpRequest();

            xhr.timeout = 5000;

            cc.info("Http Request: " + requestURL);

            xhr.open("GET", requestURL, true);

            if (cc.sys.isNative){
                xhr.setRequestHeader("Accept-Encoding","gzip,deflate","text/html;charset=UTF-8");
            }

            xhr.onreadystatechange = function() {
                if(xhr.readyState === 4 && (xhr.status >= 200 && xhr.status < 300)){
                    cc.info("Http Response length:"+ xhr.responseText.length + " response: " + xhr.responseText + " request: " + requestURL);

                    var ret = JSON.parse(xhr.responseText);

                    if(handler !== null){
                        handler(ret);
                    }

                }
            };

            if (timeoutHandler == null) {
                xhr.ontimeout = function () {
                    cc.vv.wc.hide();
                    cc.vv.alert.show('提示', 'Http 连接时间到!');
                };
            } else {
                xhr.ontimeout = timeoutHandler;
            }

            if (errorHandler == null) {
                xhr.onerror = function () {
                    cc.vv.wc.hide();
                    cc.vv.alert.show('提示', 'Http 连接错误!');
                };
            } else {
                xhr.onerror = errorHandler;
            }

            if (abortHandler == null) {
                xhr.onabort = function () {
                    cc.vv.wc.hide();
                    cc.vv.alert.show('提示', 'Http 连接退出!');
                };
            } else {
                xhr.onabort = abortHandler;
            }

            xhr.send();

            return xhr;
        },

        setURL: function (url) {
            this.master_url = url;
            this.url = url;
        }
    }
});