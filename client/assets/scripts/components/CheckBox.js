cc.Class({
    extends: cc.Component,

    properties: {
        target:cc.Node,
        sprite:cc.SpriteFrame,
        checkedSprite:cc.SpriteFrame,
        checked:false
    },

    onLoad: function () {
        this.refresh();
    },
    
    onClicked:function(){
        this.checked = !this.checked;
        this.refresh();
    },
    
    refresh:function(){
        var targetSprite = this.target.getComponent(cc.Sprite);

        if(this.checked) {
            targetSprite.spriteFrame = this.checkedSprite;
        }
        else {
            targetSprite.spriteFrame = this.sprite;
        }
    },

    getChecked:function() {
      return this.checked;
    }
});
