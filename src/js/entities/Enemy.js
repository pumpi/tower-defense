import helpers from '../helpers.js';
import settings from '../game.settings.js';
import Entity from './Entity.js';
import HealthBar from './enemies/HealthBar.js';
import DamageNumber from './enemies/DamageNumber.js';

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
        const critResistanceFactor = definition.levelFactors?.critResistanceFactor ?? 1.1;

        this.health = definition.baseHealth * Math.pow(healthFactor, level0);
        this.maxHealth = this.health;
        this.speed = definition.baseSpeed * Math.pow(speedFactor, level0);
        this.reward = Math.round(definition.baseReward * Math.pow(rewardFactor, level0));
        this.critResistance = definition.baseCritResistance * Math.pow(critResistanceFactor, level0);

        this.graphicType = definition.graphic; // 'wisp', 'bug', or undefined
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

        // Add self and health bar to the entity manager
        this.enemiesController.mapEntities.add(this);
        this.enemiesController.mapEntities.add(new HealthBar(this, this.enemiesController.game));

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

        // Calculate slow multiplier from all gravity towers affecting this enemy
        let slowMultiplier = 1.0;
        if (this.slowedBy && this.slowedBy.size > 0) {
            // Use the strongest slow effect (minimum multiplier)
            slowMultiplier = Math.min(...this.slowedBy.values());
        }

        // Process DoT effects
        if (this.dotEffects && this.dotEffects.size > 0) {
            const effectsToRemove = [];

            this.dotEffects.forEach((effect, towerId) => {
                // Update tick counter
                effect.tickCounter += deltaTime;
                effect.remainingTime -= deltaTime;

                // Apply damage when tick rate is reached
                if (effect.tickCounter >= effect.tickRate) {
                    const dotDamage = Math.floor(
                        Math.random() * (effect.damage.to - effect.damage.from + 1)
                    ) + effect.damage.from;

                    this.damage(dotDamage, 'dot');

                    // Update source tower stats
                    if (effect.source) {
                        effect.source.stats.dmg += dotDamage;
                        if (this.deleted) {
                            effect.source.stats.kills++;
                        }
                    }

                    effect.tickCounter = 0;
                }

                // Remove effect if duration expired
                if (effect.remainingTime <= 0) {
                    effectsToRemove.push(towerId);
                }
            });

            // Clean up expired effects
            effectsToRemove.forEach(towerId => this.dotEffects.delete(towerId));
        }

        if (this.waypointReached()) {
            this.nextWaypoint();
        } else {
            this.x += this.velocity.x * deltaTime * slowMultiplier;
            this.y += this.velocity.y * deltaTime * slowMultiplier;
        }

        if (this.graphicType) {
            const enemySprite = this.enemiesController.images[this.graphicType].sprites[this.direction];
            if (enemySprite.frames) {
                this.frame = (this.frame + 6 * deltaTime * slowMultiplier) % enemySprite.frames.length;
            }
        }
    }

    draw() {
        if (this.graphicType) {
            helpers.drawAnimatedSprite(this.enemiesController.images[this.graphicType], this.direction, this.frame, Math.round(this.x), Math.round(this.y), 40, 40);
        } else {
            // Draw a placeholder circle if no graphic is defined
            this.enemiesController.game.drawer.circle(this.x, this.y, this.r, this.color, true);
        }
    }

    damage(amount, damageType = 'normal') {
        if (this.deleted) return;

        // Only show damage numbers if it's crit/dot OR showNormalDamage is enabled
        if (damageType !== 'normal' || this.enemiesController.game.stat('showNormalDamage')) {
            // If enemy is moving up, numbers float down. Otherwise, they float up.
            const floatDirection = this.velocity.y < 0 ? 1 : -1;

            this.enemiesController.mapEntities.add(
                new DamageNumber(amount, this.x, this.y - this.r, damageType, floatDirection, this.enemiesController.game)
            );
        }

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
        let live = this.game.stat('live') - 1;
        if (live <= 0) {
            this.game.setGameOver();
        } else {
            this.game.stat('live', live, true);
        }
        this.enemiesController.remove(this);
    }
}

export default Enemy;