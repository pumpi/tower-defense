class MapEntityManager {
    constructor(game) {
        this.game = game;
        this.list = {};
        this.idCounter = 0;

        // Init logic
        this.game.on('update', (deltaTime) => this.update(deltaTime));
        this.game.on('beforeDraw', () => this.draw());
    }

    add(entity) {
        // This manager is now responsible for assigning the ID
        const id = ++this.idCounter;
        entity.id = id;
        this.list[id] = entity;
        return entity;
    }

    remove(id) {
        if (this.list[id]) {
            delete this.list[id];
        }
    }

    update(deltaTime) {
        const ids = Object.keys(this.list);
        for (const id of ids) {
            const entity = this.list[id];
            if (entity) {
                entity.update(deltaTime);
            }
        }
    }

    draw() {
        for (const i in this.list) {
            this.game.drawList.push(this.list[i]);
        }
    }
}

export default MapEntityManager;
