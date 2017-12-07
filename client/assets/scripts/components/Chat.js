cc.Class({
    extends: cc.Component,

    properties: {
        _chatRoot: null,
        _tabQuick:null,
        _tabEmoji:null,

        _quickChatInfo:null
    },

    onLoad: function () {
        cc.vv.chat = this;

        this._chatRoot = this.node.getChildByName('chat');

        this._chatRoot.active = false;

        this._tabQuick = this._chatRoot.getChildByName("quick_chat_list");
        this._tabEmoji = this._chatRoot.getChildByName("emojis");

        this._quickChatInfo = {};
        this._quickChatInfo["item0"] = {index:0, content:'吃了吃了！'};
        this._quickChatInfo["item1"] = {index:1, content:'二门吃了不？'};
        this._quickChatInfo["item2"] = {index:2, content:'大哥，打快点，屋头还有锅炖起的！'};
        this._quickChatInfo["item3"] = {index:3, content:'不要走，决战到天亮！'};
        this._quickChatInfo["item4"] = {index:4, content:'都速度准备好，开船了，开船了！'};
        this._quickChatInfo["item5"] = {index:5, content:'大家马儿大家骑，有输就有赢。'};
        this._quickChatInfo["item6"] = {index:6, content:'赢了这把就发家致富，快点开！'};
        this._quickChatInfo["item7"] = {index:7, content:'不要搓了，牌都搓烂了！'};
        this._quickChatInfo["item8"] = {index:8, content:'我接个电话，等我一分钟！'};
        this._quickChatInfo["item9"] = {index:9, content:'感谢你们下重注！'};
        this._quickChatInfo["item10"] = {index:10, content:'拐求，今天焊的深。'};
        this._quickChatInfo["item11"] = {index:11, content:'总算打个不输不赢，上岸喽！上岸喽！'};
        this._quickChatInfo["item12"] = {index:12, content:'此仇不报非君子，不要跑！'};
        this._quickChatInfo["item13"] = {index:13, content:'等我去把银行搬过来，都不要走！'};
        this._quickChatInfo["item14"] = {index:14, content:'社会你大哥，牌好话不多。'};
        this._quickChatInfo["item15"] = {index:15, content:'默默地赢着钱，静静地看着你们。'};
        this._quickChatInfo["item16"] = {index:16, content:'赢了这把就去买把大宝剑！'};
        this._quickChatInfo["item17"] = {index:17, content:'今天小赢，想翻本的继续来呀！'};
        this._quickChatInfo["item18"] = {index:18, content:'迎娶白富美，走上人生巅峰！'};
        this._quickChatInfo["item19"] = {index:19, content:'轻点整，不要整凶了！'};
        this._quickChatInfo["item20"] = {index:20, content:'咋又断线了，网络咋那么差。'};
    },

    getQuickChatInfo: function(index){
        var key = "item" + index;
        return this._quickChatInfo[key];
    },

    onSceneMaskClicked: function () {
        this._chatRoot.active = false;
    },

    onChatButtonClicked: function(){
        this._chatRoot.active = true;
    },

    onTabClicked:function(event){
        if(event.target.name == "tab_quick"){
            this._tabQuick.active = true;
            this._tabEmoji.active = false;
        }
        else if(event.target.name == "tab_emoji"){
            this._tabQuick.active = false;
            this._tabEmoji.active = true;
        }
    },

    onQuickChatItemClicked:function(event){
        this._chatRoot.active = false;

        var info = this._quickChatInfo[event.target.name];
        cc.vv.net.send("quick_chat",info.index);

        var soundUrl = 'duanju/' + (info.index + 1) + '.mp3';

        cc.vv.audioMgr.playSFX(soundUrl);
    },

    onEmojiItemClicked:function(event){
        this._chatRoot.active = false;
        cc.vv.net.send("emoji",event.target.name);
    }
});
