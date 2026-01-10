export default class Entity {
    constructor(game, x, y, r, color) {
        this.game = game;
        this.type = 'entity';
        this.x = x;
        this.y = y;
        this.r = r;
        this.color = color;
        this.zIndex = 0;
    }

    update(deltaTime) {
        // Default update does nothing
    }

    draw() {
        // Default draw is a simple circle
        this.game.drawer.circle(this.x, this.y, this.r, this.color, true);
    }

    remove() {
        // This will be handled by the manager
        this.game.mapEntities.remove(this.id);
    }
}
