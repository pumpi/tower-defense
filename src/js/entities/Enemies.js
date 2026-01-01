import helpers from '../helpers.js';
import settings from '../game.settings.js';
import Entity from './Entity.js';
import irlichtImage from '../../img/enemy/irlicht.png';
import bugImage from '../../img/enemy/bug.png';

class Enemy extends Entity {
    constructor(enemyType, level, wave, enemiesController) {
        const definition = settings.enemyTypes[enemyType];
        if (!definition) {
            console.error(`Enemy type "${enemyType}" not found in settings.enemyTypes`);
            return;
        }

        // Must calculate color before calling super()
        const color = definition.color || 'red';
        super(enemiesController.game, 0, 0, 10, color);

        this.enemiesController = enemiesController;
        this.type = 'enemy';
        this.enemyType = enemyType;

        // Calculate stats based on type, level, and factors
        const level0 = level > 0 ? level -1 : 0;
        const healthFactor = definition.levelFactors?.health ?? settings.leveling.healthFactor;
        const speedFactor = definition.levelFactors?.speed ?? settings.leveling.speedFactor;
        const rewardFactor = definition.levelFactors?.reward ?? settings.leveling.rewardFactor;

        this.health = definition.baseHealth * Math.pow(healthFactor, level0);
        this.maxHealth = this.health;
        this.speed = definition.baseSpeed * Math.pow(speedFactor, level0);
        this.reward = Math.round(definition.baseReward * Math.pow(rewardFactor, level0));
        
        this.graphicType = definition.graphic; // 'irlicht', 'bug', or undefined
        this.level = level;
        this.wave = wave;
        
        // Standard properties
        const shift = Math.round(Math.random() * 40) - 10;
        this.waypointIndex = 0;
        this.waypoint = {};
        this.shift = shift;
        this.velocity = {x: 0, y: 0};
        this.direction = 0;
        this.frame = 0;
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
        
        if (this.graphicType) {
            const enemySprite = this.enemiesController.images[this.graphicType].sprites[this.direction];
            if (enemySprite.frames) {
                this.frame = (this.frame + 6 * deltaTime) % enemySprite.frames.length;
            }
        }
    }

    draw() {
        if (this.graphicType) {
            helpers.drawAnimatedSprite(this.enemiesController.images[this.graphicType], this.direction, this.frame, Math.round(this.x), Math.round(this.y), 40, 40);
        } else {
            // Draw a placeholder circle if no graphic is defined
            this.game.drawCircle(this.x, this.y, this.r, this.color, true);
        }

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
        this.game.stat('coins', this.game.stat('coins') + this.reward, true);
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
                { x: 0, y: 0, w: 20, h: 20, frames: [0] },
                { x: 40, y: 0, w: 20, h: 20, frames: [0] },
                { x: 80, y: 0, w: 20, h: 20, frames: [0] },
                { x: 120, y: 0, w: 20, h: 20, frames: [0] }
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

export default Enemies;
