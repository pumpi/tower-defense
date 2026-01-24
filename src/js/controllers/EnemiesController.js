import Enemy from '../entities/Enemy.js';

class EnemiesController {
    constructor(game, map, mapEntities) {
        this.game = game;
        this.map = map;
        this.mapEntities = mapEntities;
        this.enemiesList = [];
    }

    create(enemyType, level, wave) {
        const enemy = new Enemy(enemyType, level, wave, this);
        this.enemiesList.push(enemy);
        return enemy;
    }

    remove(enemyToRemove) {
        if (!enemyToRemove) return;
        const index = this.enemiesList.indexOf(enemyToRemove);
        if (index > -1) {
            this.enemiesList.splice(index, 1);
        }
        this.mapEntities.remove(enemyToRemove.id);
    }

    clearAll() {
        // Iterate backwards because the list is being modified
        for (let i = this.enemiesList.length - 1; i >= 0; i--) {
            this.enemiesList[i].clear();
        }
    }
}

export default EnemiesController;
