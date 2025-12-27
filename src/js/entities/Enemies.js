import helpers from '../helpers.js';
import settings from '../game.settings.js';
import Entity from './Entity.js';
import irlichtImage from '../../img/enemy/irlicht.png';
import bugImage from '../../img/enemy/bug.png';

class Enemy extends Entity {
    constructor(level, wave, enemiesController) {
        const enemySettings = settings.enemyLevels[level] || settings.enemyLevels[settings.enemyLevels.length - 1];
        // Call the parent constructor
        super(enemiesController.game, 0, 0, 10, enemySettings.color);

        this.enemiesController = enemiesController;
        this.type = 'enemy';
        
        const shift = Math.round(Math.random() * 40) - 10;
        this.waypointIndex = 0;
        this.waypoint = {};
        this.shift = shift;
        this.velocity = {x: 0, y: 0};
        this.level = level;
        this.wave = wave;
        this.speed = enemySettings.speed;
        this.health = enemySettings.health;
        this.maxHealth = enemySettings.health;
        this.direction = 0;
        this.frame = 0;
        this.enemyType = 'irlicht';
        this.deleted = false;
        this.zIndex = 5;

        // Add self to the entity manager
        this.enemiesController.mapEntities.add(this);

        this.nextWaypoint();
    }

    nextWaypoint() {
        const map = this.enemiesController.map;
        if (!this.waypoint.x) { // First waypoint
            this.waypoint = {...map.waypoints[this.waypointIndex]};
            this.waypoint.x += this.shift;
            this.waypoint.y += this.shift;
            this.x = this.waypoint.x;
            this.y = this.waypoint.y;
        }

        let oldX = this.waypoint.x;
        let oldY = this.waypoint.y;

        this.waypointIndex++;
        if (!map.waypoints[this.waypointIndex]) {
            this.done();
            return false;
        }
        this.waypoint = {...map.waypoints[this.waypointIndex]};
        this.waypoint.x += this.shift;
        this.waypoint.y += this.shift;

        this.velocity.x = (this.x < this.waypoint.x) ? this.speed : -this.speed;
        if (oldX === this.waypoint.x) this.velocity.x = 0;

        this.velocity.y = (this.y < this.waypoint.y) ? this.speed : -this.speed;
        if (oldY === this.waypoint.y) this.velocity.y = 0;

        if (this.velocity.y < 0) this.direction = 0;
        else if (this.velocity.x > 0) this.direction = 1;
        else if (this.velocity.y > 0) this.direction = 2;
        else if (this.velocity.x < 0) this.direction = 3;

        return true;
    }

    waypointReached() {
        return (
            (this.velocity.x > 0 && this.x >= this.waypoint.x) ||
            (this.velocity.x < 0 && this.x <= this.waypoint.x) ||
            (this.velocity.y > 0 && this.y >= this.waypoint.y) ||
            (this.velocity.y < 0 && this.y <= this.waypoint.y)
        );
    }

    update(deltaTime) {
        if (this.deleted) return;

        if (this.waypointReached()) {
            this.nextWaypoint();
        } else {
            this.x += this.velocity.x * deltaTime;
            this.y += this.velocity.y * deltaTime;
        }

        this.frame = (this.frame + 6 * deltaTime) % this.enemiesController.images[this.enemyType].sprites[this.direction].frames.length;
    }

    draw() {
        helpers.drawAnimatedSprite(this.enemiesController.images[this.enemyType], this.direction, this.frame, Math.round(this.x), Math.round(this.y), 40, 40);

        const healthPercent = this.health / this.maxHealth;
        if (healthPercent < 1) {
            const healthBar = {
                x: this.x - this.r,
                y: this.y - this.r - 5,
                width: this.r * 2,
                height: 3
            };
            this.game.ctx.fillStyle = "black";
            this.game.ctx.fillRect(healthBar.x, healthBar.y, healthBar.width, healthBar.height);
            this.game.ctx.fillStyle = "green";
            this.game.ctx.fillRect(healthBar.x, healthBar.y, healthBar.width * healthPercent, healthBar.height);
        }
    }

    damage(amount) {
        if (this.deleted) return;
        this.health -= amount;
        if (this.health <= 0) {
            this.die();
        }
    }

    die() {
        if (this.deleted) return;
        this.health = 0;
        this.deleted = true;
        this.game.stat('coins', this.game.stat('coins') + this.enemiesController.calculateReward(this.level), true);
        this.enemiesController.remove(this);
    }

    done() {
        if (this.deleted) return;
        this.deleted = true;
        let life = this.game.stat('life') - 1;
        if (life <= 0) {
            this.game.setGameOver();
        } else {
            this.game.stat('life', life, true);
        }
        this.enemiesController.remove(this);
    }
}

class Enemies {
    constructor(game, map, mapEntities) {
        this.game = game;
        this.map = map;
        this.mapEntities = mapEntities;
        this.images = {
            irlicht: helpers.createImage(irlichtImage, [
                { x: 0, y: 0, w: 20, h: 20, frames: [0,40,80,120,160,200]},
                { x: 0, y: 40, w: 20, h: 20, frames: [0,40,80,120,160,200] },
                { x: 0, y: 80, w: 20, h: 20, frames: [0,40,80,120,160,200] },
                { x: 0, y: 120, w: 20, h: 20, frames: [0,40,80,120,160,200] }
            ]),
            bug: helpers.createImage(bugImage, [
                { x: 0, y: 0, w: 20, h: 20 },
                { x: 40, y: 0, w: 20, h: 20 },
                { x: 80, y: 0, w: 20, h: 20 },
                { x: 120, y: 0, w: 20, h: 20 }
            ])
        };
        this.enemiesList = [];
    }

    create(level, wave) {
        const enemy = new Enemy(level, wave, this);
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

    calculateReward(level) {
        const base = settings.enemyLevels[0];
        const enemy = settings.enemyLevels[level];
        return Math.round((enemy.health / base.health) * (enemy.speed / base.speed)) + 4;
    }
}

export default Enemies;
