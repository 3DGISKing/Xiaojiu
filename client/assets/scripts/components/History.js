cc.Class({
    extends: cc.Component,

    properties: {
        recordItemPrefab:{
            default:null,
            type:cc.Prefab
        },
        _history:null,
        _viewlist:null,
        _content:null,
        _viewitemTemp:null,
        _historyData:null,
        _curRoomInfo:null,
        _emptyTip:null,
        _playerItemTemp:null,

        // details
        _historyDetails: null,
        _detailsContent: null,
        _detailsItemTemp: null,
        cardAtlas: cc.SpriteAtlas,
        _MAX_CARD_ID: 40,
        _MIN_CARD_ID: 1
    },

    onLoad: function () {
        this._history = cc.find("popups/history",this.node);
        this._history.active = false;

        this._emptyTip = this._history.getChildByName("emptyTip");
        this._emptyTip.active = false;

        this._viewlist = this._history.getChildByName("records");
        this._content = cc.find("view/content",this._viewlist);

        this._viewitemTemp = this._content.children[0];
        this._content.removeChild(this._viewitemTemp);

        var playerContent = cc.find("players/view/content", this._viewitemTemp);
        this._playerItemTemp = playerContent.children[0];

        var node = cc.find("Canvas/popups/history/close");
        this.addClickEvent(node,this.node,"History","onBtnBackClicked");

        // details
        this._historyDetails = cc.find("popups/history_details", this.node);
        this._detailsContent = cc.find("details/view/content", this._historyDetails);
        this._detailsItemTemp = this._detailsContent.children[0];
    },

    addClickEvent:function(node,target,component,handler){
        var eventHandler = new cc.Component.EventHandler();
        eventHandler.target = target;
        eventHandler.component = component;
        eventHandler.handler = handler;

        var clickEvents = node.getComponent(cc.Button).clickEvents;
        clickEvents.push(eventHandler);
    },

    onBtnBackClicked:function(){
        if(this._curRoomInfo == null){
            this._historyData = null;
            this._history.active = false;
        }
        else{
            this.initRoomHistoryList(this._historyData);
        }
    },

    onBtnHistoryClicked:function(){
        cc.vv.wc.show('正在收集数据...');

        var self = this;

        cc.vv.userMgr.getHistoryList(function(data){
            cc.vv.wc.hide();

            if (data == null) {
                cc.vv.alert.show('提示','不存在数据！');
                return;
            }

            data.sort(function(a, b){
                return a.time < b.time;
            });

            self._history.active = true;

            self._historyData = data;

            for(var i = 0; i < data.length; ++i){
                for(var j = 0; j < data[i].seats.length; ++j){
                    var seat = data[i].seats[j];

                    if (cc.sys.isNative) {
                        seat.name = new Buffer(seat.name,'base64').toString();
                    }
                }
            }

            self.initRoomHistoryList(data);
        });
    },

    dateFormat:function(time){
        var date = new Date(time);

        var year = date.getFullYear();
        var month = date.getMonth() + 1;

        month = month >= 10? month : ("0"+month);

        var day = date.getDate();

        day = day >= 10? day : ("0"+day);

        var h = date.getHours();

        h = h >= 10? h : ("0"+h);

        var m = date.getMinutes();

        m = m >= 10? m : ("0"+m);

        var s = date.getSeconds();

        s = s >= 10? s : ("0"+s);

        return year + "/" + month + "/" + day + " " + h + ":" + m + ":" + s;
    },

    initRoomHistoryList:function(data){
        for(var i = 0; i < data.length; ++i){
            var node = this.getViewItem(i);

            node.idx = i;

            var headerNode = node.getChildByName("roomHeader");

            headerNode.getChildByName("room_number").getComponent(cc.Label).string = data[i].id;
            headerNode.getChildByName("date_time").getComponent(cc.Label).string = this.dateFormat(data[i].time * 1000);
            headerNode.getChildByName("jushu").getComponent(cc.Label).string = data[i].details.length;

            headerNode.getChildByName("fenshu").active = false;
            headerNode.getChildByName("fenshulabel").active = false;

            var detailsBtn = headerNode.getChildByName('detail');
            detailsBtn.details = data[i].details;

            var playerContent = cc.find("players/view/content", node);

            for(var j = 0; j < data[i].seats.length; ++j){
                var s = data[i].seats[j];
                var playerItem = this.getPlayerViewItem(j, playerContent);

                if(s.userId <= 0) {
                    playerItem.active = false;
                    continue;
                }

                playerItem.getChildByName("icon").getComponent('ImageLoader').setUserID(s.userId);
                playerItem.getChildByName("name").getComponent(cc.Label).string = s.name;
                playerItem.getChildByName("id").getComponent(cc.Label).string = s.userId;
                playerItem.getChildByName("score").getComponent(cc.Label).string = s.score;
                playerItem.getChildByName("fangzhu_mark").active = false;
                playerItem.getChildByName("tuhao_mark").active = false;
                playerItem.getChildByName("dayingjia_mark").active = false;
            }
        }

        this._emptyTip.active = data.length == 0;
        this.shrinkContent(data.length);
        this._curRoomInfo = null;
    },

    onDetailsBtnClicked: function(event){
        var details = event.target.details;

        if (details == null) {
            cc.vv.alert.show('提示','不存在数据！');
            return;
        }

        if(details && details.length > 0) {
            var j;
            var player;

            for(j = 0; j < 6; j++){
                var playerNamePath = "player_name" + (j + 1);
                var playerNameNode = this._historyDetails.getChildByName(playerNamePath);

                if(j >= details[details.length -1 ].players.length){
                    playerNameNode.active = false;
                }
                else{
                    player = details[details.length - 1].players[j];

                    if (cc.sys.isNative) {
                        playerNameNode.getComponent(cc.Label).string = new Buffer(player.name,'base64').toString();
                    }
                    else {
                        playerNameNode.getComponent(cc.Label).string = player.name;
                    }
                }
            }

            this._historyDetails.active = true;

            for (var i = 0; i < details.length; i++) {
                var round = details[i];
                var node = this.getDetailsItem(i);
                var expandBtn = cc.find('row_header/expand', node);

                expandBtn.rotation = 0;

                expandBtn.rowNode = node;

                if (i % 2 == 1) {
                    node.getChildByName('row_header').getComponent(cc.Sprite).srcBlendFactor = 774;
                }

                cc.find("row_header/round_label", node).getComponent(cc.Label).string = "第" + round.round + "局";// + round.id + ")";
                node.getChildByName("row_body").active = false;

                for(j = 0; j < 6; j++){
                    var roundPlayerNameNode = cc.find("row_header/player_name" + (j + 1), node);
                    var playerItemNode = cc.find("row_body/player" + (j+1), node);

                    if(j >= round.players.length){
                        roundPlayerNameNode.active = false;
                        playerItemNode.active = false;
                    }
                    else{
                        roundPlayerNameNode.active = true;
                        playerItemNode.active = true;

                        player = round.players[j];

                        roundPlayerNameNode.getComponent(cc.Label).string = player.score;
                        playerItemNode.getChildByName("score").getComponent(cc.Label).string = player.score;

                        if (player.cards[0] == null) {
                            playerItemNode.getChildByName("firstcard").getComponent(cc.Sprite).spriteFrame = this.getSpriteFrameOfCardBack();
                        }
                        else
                        {
                            playerItemNode.getChildByName("firstcard").getComponent(cc.Sprite).spriteFrame = this.getSpriteFrameByCardID(player.cards[0]);
                        }

                        if (player.cards[1] == null) {
                            playerItemNode.getChildByName("secondcard").getComponent(cc.Sprite).spriteFrame = this.getSpriteFrameOfCardBack();
                        }
                        else
                        {
                            playerItemNode.getChildByName("secondcard").getComponent(cc.Sprite).spriteFrame = this.getSpriteFrameByCardID(player.cards[1]);
                        }

                        if(player.isZhuang == true){
                            playerItemNode.getChildByName("zhuang").active = true;
                            playerItemNode.getChildByName("score").active = false;
                            playerItemNode.getChildByName("score_background").active = false;
                        }
                        else{
                            playerItemNode.getChildByName("zhuang").active = false;
                            playerItemNode.getChildByName("score").active = true;
                            playerItemNode.getChildByName("score_background").active = true;
                        }
                    }
                }
            }
        }

    },

    onDetailsCloseBtnClicked: function(){
        this._historyDetails.active = false;
    },

    onDetalsExpandBtnClicked: function(event){
        var node = event.target.rowNode;
        var bodyNode = node.getChildByName("row_body");
        bodyNode.active = !bodyNode.active;
        event.target.rotation += 180;
    },

    onShareHistoryClick: function () {
        cc.vv.anysdkMgr.shareResult();
    },

    getDetailsItem:function(index){
        var content = this._detailsContent;

        if(content.childrenCount > index){
            return content.children[index];
        }

        var node = cc.instantiate(this._detailsItemTemp);
        content.addChild(node);

        return node;
    },

    initGameHistoryList:function(roomInfo,data){
        data.sort(function(a,b){
            return a.create_time < b.create_time;
        });

        for(var i = 0; i < data.length; ++i){
            var node = this.getViewItem(i);
            node.idx = data.length - i - 1;
        }

        this.shrinkContent(data.length);
        this._curRoomInfo = roomInfo;
    },

    getViewItem:function(index){
        var content = this._content;

        if(content.childrenCount > index){
            return content.children[index];
        }

        var node = cc.instantiate(this._viewitemTemp);
        content.addChild(node);

        return node;
    },

    getPlayerViewItem:function(index, roomContent){
        if(roomContent.childrenCount > index){
            return roomContent.children[index];
        }

        var node = cc.instantiate(this._playerItemTemp);

        roomContent.addChild(node);
        node.position.x = 250;

        return node;
    },

    shrinkContent:function(num){
        while(this._content.childrenCount > num){
            var lastOne = this._content.children[this._content.childrenCount -1];
            this._content.removeChild(lastOne,true);
        }
    },

    getGameListOfRoom:function(idx){
        var self = this;
        var roomInfo = this._historyData[idx];
        cc.vv.userMgr.getGamesOfRoom(roomInfo.uuid,function(data){
            if(data != null && data.length > 0){
                self.initGameHistoryList(roomInfo,data);
            }
        });
    },

    getDetailOfGame:function(idx){
        var self = this;
        var roomUUID = this._curRoomInfo.uuid;

        cc.vv.userMgr.getDetailOfGame(roomUUID,idx,function(data){
            data.base_info = JSON.parse(data.base_info);
            data.action_records = JSON.parse(data.action_records);
        });
    },

    onViewItemClicked:function(event){
        var idx = event.target.idx;
        cc.log(idx);

        if(this._curRoomInfo == null){
            this.getGameListOfRoom(idx);
        }
        else{
            this.getDetailOfGame(idx);
        }
    },

    onBtnOpClicked:function(event){
        var idx = event.target.parent.idx;

        cc.log(idx);

        if(this._curRoomInfo == null){
            this.getGameListOfRoom(idx);
        }
        else{
            this.getDetailOfGame(idx);
        }
    },

    getSpriteFrameNameByCardID: function (cardId) {
        cc.assert(cardId >= this._MIN_CARD_ID && cardId <= this._MAX_CARD_ID, 'invalid card id:' + cardId);

        var name = '';

        name = name + parseInt(cardId, 10);

        return name;
    },

    getSpriteFrameByCardID: function(cardId){
        var spriteFrameName = this.getSpriteFrameNameByCardID(cardId);

        var spriteFrame =  this.cardAtlas.getSpriteFrame(spriteFrameName);

        cc.assert(spriteFrame != null, 'internal error');

        return spriteFrame;
    },

    getSpriteFrameOfCardBack: function(){
        var spriteFrameName = 'cardback';

        var spriteFrame =  this.cardAtlas.getSpriteFrame(spriteFrameName);

        cc.assert(spriteFrame != null, 'internal error');

        return spriteFrame;
    }
});
