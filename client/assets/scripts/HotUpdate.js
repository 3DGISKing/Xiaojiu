cc.Class({
    extends: cc.Component,

    properties: {
        manifestUrl     : cc.RawAsset,
        upgradeDlg      : cc.Node,
        lblStatus       : cc.Label,

        _strStatus      : null,

        _storagePath    : '',

        _progressBarNode:null,
        _progressBar:null,
        _progress:0.0,
        _retryButtonNode:null,
    },

    onLoad: function () {
        cc.log('HotUpdate: onLoad1');

        this.upgradeDlg.active = false;

        if (!cc.sys.isNative) {
            return;
        }

        cc.log('HotUpdate: onLoad2');

        cc.vv.hotUpdate = this;

        this._progressBarNode = cc.find('Canvas/update/progressBar');
        this._progressBar = this._progressBarNode.getComponent(cc.ProgressBar);

        this._retryButtonNode = cc.find('Canvas/update/retry');
        this._retryButtonNode.active = false;

        this.initConfig();

        cc.log('HotUpdate: onLoad3');
    },

    initConfig: function() {
        cc.log('HotUpdate: initConfig1');

        this._storagePath = ((jsb.fileUtils ? jsb.fileUtils.getWritablePath() : '/') + 'scxj-remote-asset');

        cc.log('HotUpdate: '+'Remote asset 保存路径: ' + this._storagePath);

        // Setup your own version compare handler, versionA and B is versions in string
        // if the return value greater than 0, versionA is greater than B,
        // if the return value equals 0, versionA equals to B,
        // if the return value smaller than 0, versionA is smaller than B.

        var versionCompareHandle = function (versionA, versionB) {
            cc.log('HotUpdate: '+"JS Custom Version Compare: version A is " + versionA + ', version B is ' + versionB);

            var vA = versionA.split('.');
            var vB = versionB.split('.');

            for (var i = 0; i < vA.length; ++i) {
                var a = parseInt(vA[i]);
                var b = parseInt(vB[i] || 0);

                if (a === b) {
                    continue;
                }
                else {
                    return a - b;
                }
            }

            if (vB.length > vA.length) {
                return -1;
            }
            else {
                return 0;
            }
        };

        // Init with empty manifest url for testing custom manifest
        this._am = new jsb.AssetsManager(this.manifestUrl, this._storagePath, versionCompareHandle);

        if (! cc.sys.ENABLE_GC_FOR_NATIVE_OBJECTS) {
            this._am.retain();
        }

        // Setup the verification callback, but we don't have md5 check function yet, so only print some message
        // Return true if the verification passed, otherwise return false
        this._am.setVerifyCallback(function (path, asset) {
            // When asset is compressed, we don't need to check its md5, because zip file have been deleted.
            var compressed = asset.compressed;

            // Retrieve the correct md5 value.
            var expectedMD5 = asset.md5;

            // asset.path is relative path and path is absolute.
            var relativePath = asset.path;

            // The size of asset file, but this value could be absent.
            var size = asset.size;

            if (compressed) {
                cc.log('HotUpdate: ' + 'Verification passed : ' + relativePath);
                return true;
            }
            else {
                cc.log('HotUpdate: ' + 'Verification passed : ' + relativePath + ' (' + expectedMD5 + ')');
                return true;
            }
        });

        cc.log('HotUpdate: ' + 'Hot update is ready, please check or directly update.');

        if (cc.sys.os === cc.sys.OS_ANDROID) {
            // Some Android device may slow down the download process when concurrent tasks is too much.
            // The value may not be accurate, please do more test and find what's most suitable for your game.
            this._am.setMaxConcurrentTask(2);
            cc.log('HotUpdate: ' + 'Max concurrent tasks count have been limited to 2');
        }

        cc.log('HotUpdate: ' + '手动触发更新检查');
    },


    // this function is invoked from loadingLogic.js
    checkUpdate: function () {
        cc.log("HotUpdate checkUpdate");
        cc.log('HotUpdate: '+'检查更新入口', this._am.getState());
        cc.log('HotUpdate: '+'jsb.AssetsManager 信息', JSON.stringify(jsb.AssetsManager));
        cc.log('HotUpdate: '+'本地配置URL', this.manifestUrl);

        /*
        if (this._am.getState() === jsb.AssetsManager.State.UNINITED) {
            this._am.loadLocalManifest(this.manifestUrl);
        }
        */

        if (! this._am.getLocalManifest() || ! this._am.getLocalManifest().isLoaded()) {
            var onOk = function () {
                cc.vv.loading.startPreloading();
            };

            cc.vv.alert.show('提示', "加载本地配置文件失败", onOk);
            return;
        }

        this._checkListener = new jsb.EventListenerAssetsManager(this._am, this.checkCb.bind(this));
        cc.eventManager.addListener(this._checkListener, 1);

        this._am.checkUpdate();

        cc.vv.wc.show("版本检测中...");
    },

    checkCb: function (event) {
        cc.log("HotUpdate checkCb");

        cc.vv.wc.hide();

        var self = this;
        var hasNewVersion = false;

        var message = "";

        switch (event.getEventCode())
        {
            case jsb.EventAssetsManager.ERROR_NO_LOCAL_MANIFEST:
                message = "【版本检测】未找到本地配置文件。";
                break;
            case jsb.EventAssetsManager.ERROR_DOWNLOAD_MANIFEST:
            case jsb.EventAssetsManager.ERROR_PARSE_MANIFEST:
                message ="【版本检测】配置文件下载失败。";
                break;
            case jsb.EventAssetsManager.ALREADY_UP_TO_DATE:
                cc.log('HotUpdate: '+"【版本检测】已经是最新版本啦。");
                break;
            case jsb.EventAssetsManager.NEW_VERSION_FOUND:
                hasNewVersion = true;
                cc.log('HotUpdate: '+'【版本检测】检测到新版本，请自行更新。。。');
                break;
            default:
                return;
        }
        
        cc.eventManager.removeListener(this._checkListener);
        this._checkListener = null;

        cc.log("HotUpdate checkCb hasNewVersion=" + hasNewVersion);

        if (hasNewVersion) {
            this.upgradeDlg.active = true;
            this._strStatus = '检测到新版本，正在更新...';
            this._progressBarNode.active = true;

            setTimeout(function() {
                self.hotUpdate();
             }, 500);
        }
        else {
            if(message == "") {
                cc.vv.loading.startPreloading();
            }
            else {
                var onOk = function () {
                    cc.vv.loading.startPreloading();
                };

                cc.vv.alert.show('提示', message, onOk);
            }
        }
    },

    hotUpdate: function () {
        cc.log("HotUpdate hotUpdate");

        if (this._am) {
            cc.log("HotUpdate hotUpdate1");
            this._strStatus = "正在更新...";
            this._updateListener = new jsb.EventListenerAssetsManager(this._am, this.updateCb.bind(this));
            cc.eventManager.addListener(this._updateListener, 1);

            /*
            if (this._am.getState() === jsb.AssetsManager.State.UNINITED) {
                this._am.loadLocalManifest(this.manifestUrl);
            }
            */

            this._am.update();
        }
    },

    updateCb: function (event) {
        cc.log("HotUpdate updateCb");

        var needRestart = false;
        var failed = false;

        switch (event.getEventCode())
        {
            case jsb.EventAssetsManager.ERROR_NO_LOCAL_MANIFEST:
                this._strStatus = '【版本更新】未找到本地配置文件。跳过热更新';
                this._retryButtonNode.active = true;
                this._progressBarNode.active = false;
                failed = true;
                break;
            case jsb.EventAssetsManager.UPDATE_PROGRESSION:
                cc.log('HotUpdate: '+'更新Byte进度', event.getPercent());
                cc.log('HotUpdate: '+'更新File进度', event.getPercentByFile());

				if (isNaN(event.getPercent()) == false) {
					this._strStatus = '【版本更新】正在更新 ' + parseInt(event.getPercent() * 100) + '%';
					this._progress = event.getPercent();

					var msg = event.getMessage();

					if (msg) {
						cc.log(event.getPercent()/100 + '% : ' + msg);
					}
				}
                break;
            case jsb.EventAssetsManager.ERROR_DOWNLOAD_MANIFEST:
            case jsb.EventAssetsManager.ERROR_PARSE_MANIFEST:
                this._strStatus = '【版本更新】下载配置文件失败。';
                this._retryButtonNode.active = true;
                this._progressBarNode.active = false;
                failed = true;
                break;
            case jsb.EventAssetsManager.ALREADY_UP_TO_DATE:
                this._strStatus = '【版本更新】已经是最新版本。';
                this._progressBarNode.active = false;
                needRestart = true;
                break;
            case jsb.EventAssetsManager.UPDATE_FINISHED:
                this._strStatus = '更新完毕, 正在重启...';
                needRestart = true;
                break;
            case jsb.EventAssetsManager.UPDATE_FAILED:
                this._strStatus = '【版本更新】更新失败 ' + event.getMessage();
                this._retryButtonNode.active = true;
                this._progressBarNode.active = false;
                break;
            case jsb.EventAssetsManager.ERROR_UPDATING:
                this._strStatus = '【版本更新】资源更新失败: ' + event.getAssetId() + ', ' + event.getMessage();
                this._retryButtonNode.active = true;
                this._progressBarNode.active = false;
                break;
            case jsb.EventAssetsManager.ERROR_DECOMPRESS:
                cc.log(event.getMessage());
                break;
            default:
                break;
        }

        cc.log('HotUpdate: '  + this._strStatus);

        if (failed) {
            cc.eventManager.removeListener(this._updateListener);
            this._updateListener = null;
            cc.log('HotUpdate: '+'更新失败了....');
        }        

        if (needRestart) {
            cc.eventManager.removeListener(this._updateListener);
            this._updateListener = null;

            // Prepend the manifest's search path
            var searchPaths = jsb.fileUtils.getSearchPaths();
            var newPaths = this._am.getLocalManifest().getSearchPaths();

            cc.log('HotUpdate: '+'新的路径', JSON.stringify(newPaths));
            cc.log('HotUpdate: '+'查找路径', JSON.stringify(searchPaths));

            Array.prototype.unshift(searchPaths, newPaths);

            // This value will be retrieved and appended to the default search path during game startup,
            // please refer to samples/js-tests/main.js for detailed usage.
            // !!! Re-add the search paths in main.js is very important, otherwise, new scripts won't take effect.
            cc.sys.localStorage.setItem('HotUpdateSearchPaths', JSON.stringify(searchPaths));
            jsb.fileUtils.setSearchPaths(searchPaths);

            setTimeout(function() {
                cc.audioEngine.stopAll();
                cc.game.restart();
            }, 500);
        }
    },

    retry: function () {
        this._retryButtonNode.active = false;
        this._progressBarNode.active = true;

        this._strStatus = '重试失败的资产...';
        this._am.downloadFailedAssets();
    },

    update: function(dt) {
        if (this._strStatus) {
            cc.log('HotUpdate: update');
            this.lblStatus.string = this._strStatus;
        }

        if (isNaN(this._progress)== false && this._progress >= 0  && this._progressBarNode)
        {
            this._progressBarNode.active = true;
            this._progressBar.progress = this._progress;
        }
    },

    onDestroy: function () {
        cc.log("HotUpdate onDestroy");

        if (this._updateListener) {
            cc.eventManager.removeListener(this._updateListener);
            this._updateListener = null;
        }

        if (this._am && !cc.sys.ENABLE_GC_FOR_NATIVE_OBJECTS) {
            this._am.release();
        }
    }
});
