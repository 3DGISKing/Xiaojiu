cc.Class({
    extends: cc.Component,

    properties: {
        cardAtlas:{
            default:null,
            type:cc.SpriteAtlas
        },

        cardAtlas1:{
            default:null,
            type:cc.SpriteAtlas
        },

        cardAtlas2:{
            default:null,
            type:cc.SpriteAtlas
        },

        cardBackgroundAtlas1:{
            default:null,
            type:cc.SpriteAtlas
        },

        cardBackgroundAtlas2:{
            default:null,
            type:cc.SpriteAtlas
        },

        cardBack:{
            default:null,
            type:cc.SpriteFrame
        },

        _MAX_CARD_ID: 40,
        _MIN_CARD_ID: 1,
        TOTAL_CARD_COUNT: 40
    },

    onLoad: function () {
        cc.vv.gamemgr = this;
    },

    getSpriteFrameOfCardBack: function(){
        return  this.cardBack;
    },

    getSpriteFrameByCardID: function(cardId){
        var spriteFrameName = this.getSpriteFrameNameByCardID(cardId);

        var spriteFrame =  this.cardAtlas1.getSpriteFrame(spriteFrameName);

        if(spriteFrame == null) {
            spriteFrame =  this.cardAtlas2.getSpriteFrame(spriteFrameName);
        }

        cc.assert(spriteFrame != null, 'internal error');

        return spriteFrame;
    },

    getSpriteFrameOfCardBackgroundByCardID: function(cardId){
        var spriteFrameName = this.getSpriteFrameNameByCardID(cardId);

        spriteFrameName += '_n';

        var spriteFrame =  this.cardBackgroundAtlas1.getSpriteFrame(spriteFrameName);

        if(spriteFrame == null) {
            spriteFrame =  this.cardBackgroundAtlas2.getSpriteFrame(spriteFrameName);
        }

        cc.assert(spriteFrame != null, 'internal error');

        return spriteFrame;
    },

    getSpriteFrameNameByCardID: function (cardId) {
        cc.assert(cardId >= this._MIN_CARD_ID && cardId <= this._MAX_CARD_ID, 'internal error. cardId = ' + cardId);

        var name = '';

        name = name + parseInt(cardId, 10);

        return name;
    },

    getSeatIndexInScene: function(logicalSeatIndex) {
        var totalSeatCount = cc.vv.gameNetMgr.getValidSeatCount();

        if (cc.vv.gameNetMgr.seatIndex == -1) {
            return this.getSeatIndexInSceneForObserver(logicalSeatIndex, totalSeatCount);
        }
        else {
            return this.getSeatIndexInSceneForPlayer(logicalSeatIndex, totalSeatCount);
        }
    },

    getSeatIndexInSceneForPlayer: function(logicalSeatIndex, totalSeatCount) {
        cc.assert( totalSeatCount != null, 'totalSeatCount: ' + totalSeatCount );
        cc.assert( logicalSeatIndex < totalSeatCount, 'invalid logicalSeatIndex: ' + logicalSeatIndex);

        var myLogicalSeatIndex = cc.vv.gameNetMgr.seatIndex;

        cc.assert(myLogicalSeatIndex != -1, 'internal error. myLogicalSeatIndex = ' + myLogicalSeatIndex);

        if (totalSeatCount == 1) {
            cc.assert(logicalSeatIndex == 0, 'internal error. logicalSeatIndex = ' + logicalSeatIndex);

            return 0;
        }
        else if (totalSeatCount == 2) {
            if (myLogicalSeatIndex == 0) {
                if (logicalSeatIndex == 0) {
                    return 0;
                }
                else if (logicalSeatIndex == 1) {
                    return 3;
                }
                else {
                    throw new Error('internal error. totalSeatCount = 2, myLogicalSeatIndex = 0 logicalSeatIndex = ' + logicalSeatIndex);
                }
            }
            else if (myLogicalSeatIndex == 1){
                if (logicalSeatIndex == 0) {
                    return 3;
                }
                else if (logicalSeatIndex == 1) {
                    return 0;
                }
                else {
                    throw new Error('internal error. totalSeatCount = 2, myLogicalSeatIndex = 1 logicalSeatIndex = ' + logicalSeatIndex);
                }
            }
            else {
                throw new Error('internal error. totalSeatCount = 2, myLogicalSeatIndex = ' + myLogicalSeatIndex);
            }
        }
        else if (totalSeatCount == 3) {
            if (myLogicalSeatIndex == 0) {
                if (logicalSeatIndex == 0) {
                    return 0;
                }
                else if (logicalSeatIndex == 1) {
                    return 2;
                }
                else if (logicalSeatIndex == 2) {
                    return 4;
                }
                else {
                    throw new Error('internal error. totalSeatCount = 3, myLogicalSeatIndex = 0 logicalSeatIndex = ' + logicalSeatIndex);
                }
            }
            else if (myLogicalSeatIndex == 1) {
                if (logicalSeatIndex == 0) {
                    return 4;
                }
                else if (logicalSeatIndex == 1) {
                    return 0;
                }
                else if (logicalSeatIndex == 2) {
                    return 2;
                }
                else {
                    throw new Error('internal error. totalSeatCount = 3, myLogicalSeatIndex = 1 logicalSeatIndex = ' + logicalSeatIndex);
                }
            }
            else if (myLogicalSeatIndex == 2){
                if (logicalSeatIndex == 0) {
                    return 2;
                }
                else if (logicalSeatIndex == 1) {
                    return 4;
                }
                else if (logicalSeatIndex == 2) {
                    return 0;
                }
                else {
                    throw new Error('internal error. totalSeatCount = 3, myLogicalSeatIndex = 2 logicalSeatIndex = ' + logicalSeatIndex);
                }
            }
            else{
                throw new Error('internal error. totalSeatCount = 3, myLogicalSeatIndex = ' + myLogicalSeatIndex);
            }
        }
        else if (totalSeatCount == 4) {
            if (myLogicalSeatIndex == 0) {
                if (logicalSeatIndex == 0) {
                    return 0;
                }
                else if (logicalSeatIndex == 1) {
                    return 1;
                }
                else if (logicalSeatIndex == 2) {
                    return 3;
                }
                else if (logicalSeatIndex == 3) {
                    return 5;
                }
                else {
                    throw new Error('internal error. totalSeatCount = 4, myLogicalSeatIndex = 0 logicalSeatIndex = ' + logicalSeatIndex);
                }
            }
            else if (myLogicalSeatIndex == 1) {
                if (logicalSeatIndex == 0) {
                    return 5;
                }
                else if (logicalSeatIndex == 1) {
                    return 0;
                }
                else if (logicalSeatIndex == 2) {
                    return 1;
                }
                else if (logicalSeatIndex == 3) {
                    return 3;
                }
                else {
                    throw new Error('internal error. totalSeatCount = 4, myLogicalSeatIndex = 1 logicalSeatIndex = ' + logicalSeatIndex);
                }
            }
            else if (myLogicalSeatIndex == 2) {
                if (logicalSeatIndex == 0) {
                    return 3;
                }
                else if (logicalSeatIndex == 1) {
                    return 5;
                }
                else if (logicalSeatIndex == 2) {
                    return 0;
                }
                else if (logicalSeatIndex == 3) {
                    return 1;
                }
                else {
                    throw new Error('internal error. totalSeatCount = 4, myLogicalSeatIndex = 2 logicalSeatIndex = ' + logicalSeatIndex);
                }
            }
            else if (myLogicalSeatIndex == 3) {
                if (logicalSeatIndex == 0) {
                    return 1;
                }
                else if (logicalSeatIndex == 1) {
                    return 3;
                }
                else if (logicalSeatIndex == 2) {
                    return 5;
                }
                else if (logicalSeatIndex == 3) {
                    return 0;
                }
                else {
                    throw new Error('internal error. totalSeatCount = 4, myLogicalSeatIndex = 3 logicalSeatIndex = ' + logicalSeatIndex);
                }
            }
            else {
                throw new Error('internal error. totalSeatCount = 4, myLogicalSeatIndex = ' + myLogicalSeatIndex);
            }
        }
        else if (totalSeatCount == 5) {
            if (myLogicalSeatIndex == 0) {
                if (logicalSeatIndex == 0) {
                    return 0;
                }
                else if (logicalSeatIndex == 1) {
                    return 1;
                }
                else if (logicalSeatIndex == 2) {
                    return 2;
                }
                else if (logicalSeatIndex == 3) {
                    return 4;
                }
                else if (logicalSeatIndex == 4) {
                    return 5;
                }
                else {
                    throw new Error('internal error. totalSeatCount = 5, myLogicalSeatIndex = 0 logicalSeatIndex = ' + logicalSeatIndex);
                }
            }
            else if (myLogicalSeatIndex == 1) {
                if (logicalSeatIndex == 0) {
                    return 5;
                }
                else if (logicalSeatIndex == 1) {
                    return 0;
                }
                else if (logicalSeatIndex == 2) {
                    return 1;
                }
                else if (logicalSeatIndex == 3) {
                    return 2;
                }
                else if (logicalSeatIndex == 4) {
                    return 3;
                }
                else {
                    throw new Error('internal error. totalSeatCount = 5, myLogicalSeatIndex = 1 logicalSeatIndex = ' + logicalSeatIndex);
                }
            }
            else if (myLogicalSeatIndex == 2) {
                if (logicalSeatIndex == 0) {
                    return 4;
                }
                else if (logicalSeatIndex == 1) {
                    return 5;
                }
                else if (logicalSeatIndex == 2) {
                    return 0;
                }
                else if (logicalSeatIndex == 3) {
                    return 1;
                }
                else if (logicalSeatIndex == 4) {
                    return 2;
                }
                else {
                    throw new Error('internal error. totalSeatCount = 5, myLogicalSeatIndex = 2 logicalSeatIndex = ' + logicalSeatIndex);
                }
            }
            else if (myLogicalSeatIndex == 3) {
                if (logicalSeatIndex == 0) {
                    return 3;
                }
                else if (logicalSeatIndex == 1) {
                    return 4;
                }
                else if (logicalSeatIndex == 2) {
                    return 5;
                }
                else if (logicalSeatIndex == 3) {
                    return 0;
                }
                else if (logicalSeatIndex == 4) {
                    return 1;
                }
                else {
                    throw new Error('internal error. totalSeatCount = 5, myLogicalSeatIndex = 3 logicalSeatIndex = ' + logicalSeatIndex);
                }
            }
            else if (myLogicalSeatIndex == 4) {
                if (logicalSeatIndex == 0) {
                    return 2;
                }
                else if (logicalSeatIndex == 1) {
                    return 3;
                }
                else if (logicalSeatIndex == 2) {
                    return 4;
                }
                else if (logicalSeatIndex == 3) {
                    return 5;
                }
                else if (logicalSeatIndex == 4) {
                    return 0;
                }
                else {
                    throw new Error('internal error. totalSeatCount = 5, myLogicalSeatIndex = 4 logicalSeatIndex = ' + logicalSeatIndex);
                }
            }
            else {
                throw new Error('internal error. totalSeatCount = 5, myLogicalSeatIndex = ' + myLogicalSeatIndex);
            }
        }
        else if (totalSeatCount == 6) {
            return  (logicalSeatIndex - myLogicalSeatIndex + 6) % 6;
        }
        else {
            throw new Error('internal error. totalSeatCount = ' + totalSeatCount);
        }
    },

    getSeatIndexInSceneForObserver: function(logicalSeatIndex, totalSeatCount) {
        cc.assert(cc.vv.gameNetMgr.seatIndex == -1, 'internal error');
        cc.assert(logicalSeatIndex <totalSeatCount , 'internal error');

        if (totalSeatCount == 1) {
            return 3;
        }
        else if (totalSeatCount == 2) {
            if (logicalSeatIndex == 0) {
                return 2;
            }
            else if (logicalSeatIndex == 1) {
                return 4;
            }
            else {
                throw new Error('');
            }
        }
        else if (totalSeatCount == 3) {
            if (logicalSeatIndex == 0) {
                return 1;
            }
            else if (logicalSeatIndex == 1) {
                return 3;
            }
            else if (logicalSeatIndex == 2) {
                return 5;
            }
            else {
                throw new Error('');
            }
        }
        else if (totalSeatCount == 4) {
            if (logicalSeatIndex == 0) {
                return 1;
            }
            else if (logicalSeatIndex == 1) {
                return 2;
            }
            else if (logicalSeatIndex == 2) {
                return 4;
            }
            else if (logicalSeatIndex == 3) {
                return 5;
            }
            else {
                throw new Error('');
            }
        }
        else if (totalSeatCount == 5) {
            return logicalSeatIndex + 1;
        }
        else if (totalSeatCount == 6) {
            return logicalSeatIndex;
        }
        else {
            throw new Error('');
        }
    },

     getCardValue: function(cardId) {
        if(cardId < 1 || cardId > this.TOTAL_CARD_COUNT)
            throw new Error('Unknown cardId: ' + cardId);

        var value = cardId % 10;

        if (value == 0)
            return 10;
        else
            return value;
    },

    //같은 패 2개인가를 검사한다.
     isDuizi: function(cards) {
        if (cards == null)
            throw new Error('cards could not be null!');

        if (cards.length != 2)
            throw new Error('cards.length should be 2! but length is ' + cards.length);

        var value1 = this.getCardValue(cards[0]);
        var value2 = this.getCardValue(cards[1]);

        return value1 == value2;
    },

    //홑패 2개에 대한 점수를 계산한다.
     calculateScoreForDianzi: function(cards) {
        if (cards == null)
            throw new Error('cards could not be null!');

        if (cards.length != 2)
            throw new Error('cards.length should be 2!');

        var value1 = this.getCardValue(cards[0]);
        var value2 = this.getCardValue(cards[1]);

        if (value1 == value2)
            return new Error('this is not dianzi!');

        var score = value1 + value2;

        if (score >= 10)
            score = score - 10;

        return score;
    },

    getSoundUrlFromCards: function (cards) {
        var soundUrl = 'paimian/';

        if (this.isDuizi(cards)) {
            var cardValue = this.getCardValue(cards[0]);

            if (cardValue == 1) {
                soundUrl += 'jian_';
            }
            else {
                soundUrl += cardValue;
                soundUrl += '_';
            }

            soundUrl += 'bao.mp3';
        }
        else {
            var score =this.calculateScoreForDianzi(cards);

            if (score == 0) {
                soundUrl += 'budou.mp3';
            }
            else {
                soundUrl += score;
                soundUrl += '_dian.mp3';
            }
        }

        return soundUrl;
    }
});
