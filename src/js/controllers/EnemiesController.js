import helpers from '../helpers.js';
import Enemy from '../entities/Enemy.js';
import wispImage from '../../img/enemy/wisp.png';
import bugImage from '../../img/enemy/bug.png';

class EnemiesController {
    constructor(game, map, mapEntities) {
        this.game = game;
        this.map = map;
        this.mapEntities = mapEntities;
        this.images = {
            wisp: helpers.createImage(wispImage, [
                { x: 0, y: 0, w: 20, h: 20, frames: [0,40,80,120,160,200]},
                { x: 0, y: 40, w: 20, h: 20, frames: [0,40,80,120,160,200] },
                { x: 0, y: 80, w: 20, h: 20, frames: [0,40,80,120,160,200] },
                { x: 0, y: 120, w: 20, h: 20, frames: [0,40,80,120,160,200] }
            ]),
            bug: helpers.createImage(bugImage, [
                { x: 0, y: 0, w: 20, h: 20, frames: [0] },
                { x: 40, y: 0, w: 20, h: 20, frames: [40] },
                { x: 80, y: 0, w: 20, h: 20, frames: [80] },
                { x: 120, y: 0, w: 20, h: 20, frames: [120] }
            ])
        };
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
}

export default EnemiesController;
