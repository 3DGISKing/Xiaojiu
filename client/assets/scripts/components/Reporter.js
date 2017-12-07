'use strict';

const LOG_LEVEL = 0;
const ERROR_LEVEL = 1;

var Reporter = cc.Class({
    extends: cc.Component,

    properties: {
    },

    statics: {
        _instance: null,

        instance: function() {
            if(!this._instance) {
                this._init();
            }

            return this._instance;
        },

        _init: function () {
            Reporter._instance = this;

            cc.vv.reporter = this;
        },

        /**
         *
         * @param {string} msg
         * @param {number} level
         * @private
         */
        _report: function (msg, level) {
            if(cc.vv == null){
                return;
            }

            var http = require("HTTP");

            var data = {
                userId: cc.vv.userMgr.userId,
                level: level,
                msg: msg
            };

            http.sendRequest("/report",
                data ,
                function (ret) {
                    if(ret.errcode == 0) {
                        cc.info("report success!");
                    }else {
                        cc.info("report failed!");
                    }
                },
                null,
                function () { cc.info("report error!"); },
                function () { cc.info("report timeout!"); },
                function () { cc.info("report abort!");});
        },

        reportError: function(fileName, lineNo, msg, stackStr) {
            var errorMsg = msg + " in line " + lineNo + "(" + fileName + ")";

            errorMsg += "\n";
            errorMsg += stackStr;

            this._report(errorMsg, ERROR_LEVEL);
        },

        log: function(msg) {
            this._report(msg, LOG_LEVEL);
        }
    }
    });

