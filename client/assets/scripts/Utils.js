cc.Class({
    extends: cc.Component,

    properties: {

    },

    addClickEvent:function(node,target,component,handler){
        var eventHandler = new cc.Component.EventHandler();

        eventHandler.target = target;
        eventHandler.component = component;
        eventHandler.handler = handler;

        var clickEvents = node.getComponent(cc.Button).clickEvents;

        clickEvents.push(eventHandler);
    },
    
    addSlideEvent:function(node,target,component,handler){
        var eventHandler = new cc.Component.EventHandler();

        eventHandler.target = target;
        eventHandler.component = component;
        eventHandler.handler = handler;

        var slideEvents = node.getComponent(cc.Slider).slideEvents;

        slideEvents.push(eventHandler);
    }
});
