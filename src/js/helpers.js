import game from './game';

export default {

    _sortEntity: function (listIndex) {
        // Die Liste mit den zu zeichnenden Objekten vorsortieren
        // damit die weiter oben angesetzten Objekte hinter den Vorderen liegen.
        this[listIndex].sort(function (a, b) {
            return a.y > b.y || b.zIndex - a.zIndex;
        });
    },
    createImage : function(src, spr = []) {
        let img = new Image();
        img.src = src;
        img.sprites = spr;
        return img;
    },
    drawSprite: function(image, spriteInd, x, y, w, h){
        // image is the image. Must have an array of sprites
        // image.sprites = [{x:0,y:0,w:10,h:10},{x:20,y:0,w:30,h:40},....]
        // where the position and size of each sprite is kept
        // spriteInd is the index of the sprite
        // x,y position on sprite center
        // cw, ch the final container width and height
        let spr = image.sprites[spriteInd];
        //game.ctx.setTransform(1,0,0,1,x,y); // set scale and position
        game.ctx.drawImage(image,spr.x,spr.y,w,h,x - spr.w / 2,y - spr.h / 2,spr.w,spr.h); // render the subimage
    },
    drawAnimatedSprite: function(image, spriteInd, frameInd, x, y, w, h){
        // image is the image. Must have an array of sprites
        // image.sprites = [{x:0,y:0,w:10,h:10},{x:20,y:0,w:30,h:40},....]
        // where the position and size of each sprite is kept
        // spriteInd is the index of the sprite
        // x,y position on sprite center
        // cw, ch the final container width and height
        let spr = image.sprites[spriteInd];
        //game.ctx.setTransform(1,0,0,1,x,y); // set scale and position
        game.ctx.drawImage(image,spr.frames[parseInt(frameInd)],spr.y,w,h,x - spr.w / 2,y - spr.h / 2,spr.w,spr.h); // render the subimage
    }
}