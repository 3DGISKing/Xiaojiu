cc.Class({
    extends: cc.Component,

    properties: {

    },

    onLoad: function () {
        var btn = this.node.getChildByName("btn_back");
        cc.vv.utils.addClickEvent(btn,this.node,"OnBack","onBtnClicked");        
    },
    
    onBtnClicked:function(event){
        if(event.target.name == "btn_back"){
            this.node.active = false;
        }
    }
});
