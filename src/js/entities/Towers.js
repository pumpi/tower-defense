import settings from '../game.settings.js';
import helpers from '../helpers.js';
import Entity from './Entity.js';

class Tower extends Entity {
    constructor(x, y, bulletType, towersController) {
        const towerSettings = settings.towers[bulletType];
        // Call parent constructor
        super(towersController.game, x, y, towerSettings.size, towerSettings.color);

        this.towersController = towersController;
        this.type = 'tower';

        this.bullet = bulletType;
        this.fireRange = towerSettings.fireRange;
        this.damage = towerSettings.damage;
        this.cooldownTime = towerSettings.coolDownTime;
        this.level = 0;
        this.audio = new Audio(towerSettings.audio);
        this.audio.volume = 0.3;
        this.stats = { shoots: 0, dmg: 0, kills: 0 };
        this.cooldownCounter = 0;
        this.closestEnemy = false;

        // Add self to the entity manager
        this.towersController.mapEntities.add(this);
    }

    upgrade() {
        const game = this.towersController.game;
        const coins = game.stat('coins');
        const upgrade = settings.towers[this.bullet].upgrades[this.level];

        if (upgrade && coins >= upgrade.cost) {
            game.stat('coins', coins - upgrade.cost, true);
            this.damage = upgrade.damage;
            this.fireRange = upgrade.fireRange;
            this.level++;
            this.color = upgrade.color;
            this.towersController.closeOptions();
        }
    }

    update(deltaTime) {
        const { game, mouse } = this.towersController;
        this.cooldownCounter += deltaTime;

        if (this.closestEnemy) {
            const enemyDistance = game.distance(this.x, this.y, this.closestEnemy.x, this.closestEnemy.y);
            if (enemyDistance >= (this.fireRange + this.closestEnemy.r) || this.closestEnemy.health <= 0) {
                this.closestEnemy = false;
            }
        }

        if (!this.closestEnemy) {
            this.closestEnemy = this.findClosestEnemy();
        }

        if (this.closestEnemy) {
            if (this.cooldownCounter >= this.cooldownTime) {
                this.shoot(this.closestEnemy);
                this.audio.play().catch(() => {});
                this.cooldownCounter = 0; // Reset cooldown
            }
        }

        this.zIndex = mouse.isMouseOver(this.x, this.y, this.r) ? 20 : 10;

        if (game.stat('mode') !== 'dropTower' && mouse.clicked && mouse.isMouseOver(this.x, this.y, this.r)) {
            this.towersController.openOptions(this);
        }
    }

    findClosestEnemy() {
        const { game, enemies } = this.towersController;
        let mostAdvancedEnemy = null;
        let highestWaypointIndex = -1;
        let shortestDistanceToWaypoint = Infinity;

        for (const enemy of enemies.enemiesList) {
            const distance = game.distance(this.x, this.y, enemy.x, enemy.y);

            if (distance <= (this.fireRange + enemy.r)) {
                if (enemy.waypointIndex > highestWaypointIndex) {
                    highestWaypointIndex = enemy.waypointIndex;
                    mostAdvancedEnemy = enemy;
                    shortestDistanceToWaypoint = enemy.waypoint ? game.distance(enemy.x, enemy.y, enemy.waypoint.x, enemy.waypoint.y) : Infinity;
                } else if (enemy.waypointIndex === highestWaypointIndex && enemy.waypoint) {
                    const distanceToWaypoint = game.distance(enemy.x, enemy.y, enemy.waypoint.x, enemy.waypoint.y);
                    if (distanceToWaypoint < shortestDistanceToWaypoint) {
                        mostAdvancedEnemy = enemy;
                        shortestDistanceToWaypoint = distanceToWaypoint;
                    }
                }
            }
        }
        return mostAdvancedEnemy;
    }

    shoot(enemy) {
        const damage = Math.floor(Math.random() * (this.damage.to - this.damage.from + 1)) + this.damage.from;
        this.stats.shoots++;
        this.stats.dmg += damage;
        enemy.damage(damage);

        if (enemy.deleted) {
            this.stats.kills++;
        }
        this.cooldownCounter = this.cooldownTime;

        this.shootingAt = enemy;
        setTimeout(() => { this.shootingAt = null; }, 100);
    }

    draw() {
        const { game, mouse } = this.towersController;
        if (mouse.isMouseOver(this.x, this.y, this.r) && game.stat('mode') !== 'dropTower') {
            game.drawCircle(this.x, this.y, this.fireRange, 'rgba(0,0,255,0.2)', true);
        }

        helpers.drawSprite(settings.towers[this.bullet].images, this.level, this.x, this.y - 20, 160, 160);

        if (this.shootingAt) {
            game.ctx.save();
            game.ctx.beginPath();
            game.ctx.strokeStyle = this.color;
            game.ctx.lineWidth = 2;
            game.ctx.moveTo(this.x, this.y - 50);
            game.ctx.lineTo(this.shootingAt.x, this.shootingAt.y);
            game.ctx.stroke();
            game.ctx.restore();
        }
    }
}

class Towers {
    constructor(game, map, mouse, mapEntities, enemies) {
        this.game = game;
        this.map = map;
        this.mouse = mouse;
        this.mapEntities = mapEntities;
        this.enemies = enemies;
        this.optionsModal = null;

        this.optionsModal = document.querySelector('.modal-options');
        this.game.on('update', () => this.update());
        this.game.on('afterDraw', () => this.draw());
    }

    update() {
        const gridPosition = this.gridPosition();
        const bulletType = this.game.stat('selectedTowerType');

        if (this.game.stat('mode') === 'dropTower' && this.map.isValidTowerPlace(gridPosition.x, gridPosition.y, bulletType) && this.mouse.clicked) {
            this.game.stat('mode', '');
            this.game.stat('coins', this.game.stat('coins') - settings.towers[bulletType].costs, true);
            this.create(gridPosition.x, gridPosition.y, bulletType);
        }
    }

    draw() {
        if (this.game.stat('mode') === 'dropTower') {
            const gridPosition = this.gridPosition();
            const bulletType = this.game.stat('selectedTowerType');
            const isValid = this.map.isValidTowerPlace(gridPosition.x, gridPosition.y, bulletType);

            if (isValid) {
                this.game.drawCircle(gridPosition.x, gridPosition.y, settings.towers[bulletType].fireRange, 'rgba(0,0,255,0.2)', true);
                helpers.drawSprite(settings.towers[bulletType].images, 0, gridPosition.x, gridPosition.y - 20, 160, 160);
            } else {
                this.game.ctx.save();
                this.game.ctx.filter = 'grayscale(100%)';
                helpers.drawSprite(settings.towers[bulletType].images, 0, gridPosition.x, gridPosition.y - 20, 160, 160);
                this.game.ctx.restore();
            }
        }
    }

    create(x, y, bulletType) {
        return new Tower(x, y, bulletType, this);
    }

    gridPosition() {
        const x = ((Math.floor(this.mouse.x / settings.mapGrid)) * settings.mapGrid) + (settings.mapGrid / 2);
        const y = ((Math.floor(this.mouse.y / settings.mapGrid)) * settings.mapGrid) + (settings.mapGrid / 2);
        return { x, y };
    }

    openOptions(tower) {
        this.game.output('#tower-position-x', tower.x);
        this.game.output('#tower-position-y', tower.y);
        this.game.output('#tower-level', tower.level + 1);
        this.game.output('#tower-fire-range', tower.fireRange);
        this.game.output('#tower-cooldown-time', tower.cooldownTime);
        this.game.output('#tower-damage-from', tower.damage.from);
        this.game.output('#tower-damage-to', tower.damage.to);
        this.game.output('#tower-stats-shoots', tower.stats.shoots);
        this.game.output('#tower-stats-damage', tower.stats.dmg);
        this.game.output('#tower-stats-kills', tower.stats.kills);

        const upgrade = settings.towers[tower.bullet].upgrades[tower.level];
        const upgradeEl = this.optionsModal.querySelector('.tower-upgrade');

        if (upgrade) {
            upgradeEl.classList.remove('is--hidden');
            this.game.output('.tower-upgrade-level', tower.level + 2);
            this.game.output('#tower-upgrade-cost', upgrade.cost);
            this.game.output('#tower-upgrade-fire-range', upgrade.fireRange);
            this.game.output('#tower-upgrade-damage-from', upgrade.damage.from);
            this.game.output('#tower-upgrade-damage-to', upgrade.damage.to);
            this.optionsModal.querySelector('.tower-buy-upgrade').onclick = () => tower.upgrade();
        } else {
            upgradeEl.classList.add('is--hidden');
        }

        this.optionsModal.classList.add('is--open');
    }

    closeOptions() {
        this.optionsModal.classList.remove('is--open');
    }
}

export default Towers;
