import settings from '../game.settings.js';
import helpers from '../helpers.js';
import LaserTower from '../entities/towers/LaserTower.js';
import GravityTower from '../entities/towers/GravityTower.js';

// Tower class definitions are in ../entities/towers/ directory

class TowersController {
    constructor(game, map, mouse, mapEntities, enemies) {
        this.game = game;
        this.map = map;
        this.mouse = mouse;
        this.mapEntities = mapEntities;
        this.enemies = enemies;

        this.game.on('update', () => this.update());
        this.game.on('beforeDraw', () => this.draw());
    }

    update() {
        const gridPosition = this.gridPosition();
        const bulletType = this.game.stat('selectedTowerType');

        if (this.game.stat('mode') === 'dropTower' && this.map.isValidTowerPlace(gridPosition.x, gridPosition.y) && this.mouse.clicked) {
            this.game.stat('mode', '');
            this.game.stat('coins', this.game.stat('coins') - settings.towers[bulletType].costs, true);
            this.create(gridPosition.x, gridPosition.y, bulletType);
        }
    }

    draw() {
        if (this.game.stat('mode') === 'dropTower') {
            const gridPosition = this.gridPosition();
            const bulletType = this.game.stat('selectedTowerType');
            const isValid = this.map.isValidTowerPlace(gridPosition.x, gridPosition.y);
            const isOccupied = this.map.isTowerAtPosition(gridPosition.x, gridPosition.y);
            const tower = settings.towers[bulletType];

            if (isValid) {
                this.game.drawCircle(gridPosition.x, gridPosition.y, tower.fireRange, 'rgba(0,0,255,0.2)', true);

                // Draw tower sprite or fallback circle
                if (tower.images?.complete) {
                    helpers.drawSprite(tower.images, 0, gridPosition.x, gridPosition.y - 20, 160, 160);
                } else {
                    this.game.drawCircle(gridPosition.x, gridPosition.y, tower.size, tower.color, true);
                }
            } else if (!isOccupied) {
                // Draw grayed out preview
                if (tower.images?.complete) {
                    this.game.ctx.save();
                    this.game.ctx.filter = 'grayscale(100%)';
                    helpers.drawSprite(tower.images, 0, gridPosition.x, gridPosition.y - 20, 160, 160);
                    this.game.ctx.restore();
                } else {
                    this.game.drawCircle(gridPosition.x, gridPosition.y, tower.size, '#666', true);
                }
            }
        }
    }

    create(x, y, towerType) {
        // Factory pattern: create the appropriate tower type
        switch (towerType) {
            case 'laser':
                return new LaserTower(x, y, this);
            case 'gravity':
                return new GravityTower(x, y, this);
            default:
                throw new Error(`Unknown tower type: ${towerType}`);
        }
    }

    gridPosition() {
        const x = ((Math.floor(this.mouse.x / settings.mapGrid)) * settings.mapGrid) + (settings.mapGrid / 2);
        const y = ((Math.floor(this.mouse.y / settings.mapGrid)) * settings.mapGrid) + (settings.mapGrid / 2);
        return { x, y };
    }
}

export default TowersController;
