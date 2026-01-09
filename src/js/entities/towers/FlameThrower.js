import Tower from '../Tower.js';
import settings from '../../game.settings.js';

class FlameThrower extends Tower {
    constructor(x, y, towersController) {
        super(x, y, 'flamethrower', towersController);

        const towerSettings = settings.towers.flamethrower;
        this.coneAngle = towerSettings.coneAngle;
        this.dotDamage = towerSettings.dotDamage;
        this.dotDuration = towerSettings.dotDuration;
        this.dotTickRate = towerSettings.dotTickRate;
        this.dotType = towerSettings.dotType;

        this.isShooting = false;
        this.shootingAngle = 0; // Direction the flamethrower is facing
        this.flameAnimationProgress = 0; // 0 to 1, animates the flame spreading
    }

    // Override upgrade to handle flamethrower-specific properties
    upgrade() {
        const game = this.towersController.game;
        const coins = game.stat('coins');
        const upgrade = settings.towers[this.towerType].upgrades[this.level];

        if (upgrade && coins >= upgrade.cost) {
            game.stat('coins', coins - upgrade.cost, true);
            this.damage = upgrade.damage;
            this.fireRange = upgrade.fireRange;
            this.coneAngle = upgrade.coneAngle;
            this.dotDamage = upgrade.dotDamage;
            this.dotDuration = upgrade.dotDuration;

            this.level++;
            this.color = upgrade.color;
            game.modal.close();
        }
    }


    // Check if an enemy is within the cone area
    isEnemyInCone(enemy) {
        const { game } = this.towersController;
        const distance = game.distance(this.x, this.y, enemy.x, enemy.y);

        // Check if enemy is within range
        if (distance > this.fireRange + enemy.r) return false;

        // Calculate angle to enemy
        const angleToEnemy = Math.atan2(enemy.y - this.y, enemy.x - this.x);

        // Calculate angle difference
        let angleDiff = angleToEnemy - this.shootingAngle;

        // Normalize angle difference to -PI to PI
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

        // Check if within cone angle (convert degrees to radians)
        const coneAngleRad = (this.coneAngle * Math.PI / 180) / 2;
        return Math.abs(angleDiff) <= coneAngleRad;
    }

    // Get all enemies in the cone
    getEnemiesInCone() {
        return this.towersController.enemies.enemiesList.filter(enemy =>
            enemy.health > 0 && this.isEnemyInCone(enemy)
        );
    }

    shoot(enemy) {
        // Target enemy check happens in base Tower class
        if (!this.targetEnemy) return;

        // Get all enemies in cone
        const enemiesInCone = this.getEnemiesInCone();

        if (enemiesInCone.length === 0) return;

        // Apply initial damage and DoT to all enemies in cone
        enemiesInCone.forEach(enemy => {
            // Calculate initial damage
            let damage = Math.floor(Math.random() * (this.damage.to - this.damage.from + 1)) + this.damage.from;
            let damageType = 'normal';

            // Crit calculation
            const critChance = (this.critRate - enemy.critResistance) / 100;
            const finalCritChance = Math.max(0.05, Math.min(critChance, 0.75)); // Clamp chance between 5% and 75%

            if (Math.random() < finalCritChance) {
                damage *= this.critDamage;
                this.stats.crits++;
                damageType = 'crit';
            }

            damage = Math.round(damage);
            this.stats.shoots++;
            this.stats.dmg += damage;
            enemy.damage(damage, damageType);

            if (enemy.deleted) {
                this.stats.kills++;
            }

            // Apply DoT effect
            if (!enemy.dotEffects) {
                enemy.dotEffects = new Map();
            }

            // Each tower instance can only apply one DoT at a time per enemy
            enemy.dotEffects.set(this.id, {
                type: this.dotType,
                damage: this.dotDamage,
                duration: this.dotDuration,
                tickRate: this.dotTickRate,
                tickCounter: 0,
                remainingTime: this.dotDuration,
                source: this
            });
        });

        // Visual effect - start/continue shooting
        this.isShooting = true;
    }

    // Override stats to show DoT damage
    getStatsHTML() {
        return `
            <h4>Current Stats (Level ${this.level + 1})</h4>
            <table class="tower-stats">
                <tr><td>Schaden:</td><td>${this.damage.from} - ${this.damage.to}</td></tr>
                <tr><td>DoT Schaden:</td><td>${this.dotDamage.from} - ${this.dotDamage.to} / ${this.dotTickRate}s</td></tr>
                <tr><td>DoT Dauer:</td><td>${this.dotDuration}s</td></tr>
                <tr><td>Reichweite:</td><td>${this.fireRange}</td></tr>
                <tr><td>Kegelwinkel:</td><td>${this.coneAngle}°</td></tr>
                <tr><td>Feuerrate:</td><td>${this.cooldownTime}s</td></tr>
            </table>
        `;
    }

    drawShootingEffect() {
        const { game } = this.towersController;

        // Update shooting angle continuously when we have a target
        if (this.targetEnemy) {
            this.shootingAngle = Math.atan2(this.targetEnemy.y - this.y, this.targetEnemy.x - this.x);
        }

        // Draw flame effect when shooting
        if (this.isShooting || this.flameAnimationProgress > 0) {
            const coneAngleRad = (this.coneAngle * Math.PI / 180) / 2;
            const flameLength = this.fireRange;

            // Check if there are enemies in cone
            const enemiesInCone = this.getEnemiesInCone();
            const hasEnemies = enemiesInCone.length > 0;

            // Animate flame progress
            if (hasEnemies) {
                // Grow flame to full range
                this.flameAnimationProgress = Math.min(1, this.flameAnimationProgress + 0.05);
            } else {
                // Shrink flame back
                this.flameAnimationProgress = Math.max(0, this.flameAnimationProgress - 0.08);
                if (this.flameAnimationProgress === 0) {
                    this.isShooting = false;
                }
            }

            if (this.flameAnimationProgress === 0) return;

            game.ctx.save();

            // Add flicker effect when at full range with enemies
            let flickerAmount = 0;
            if (this.flameAnimationProgress >= 0.9 && hasEnemies) {
                flickerAmount = (Math.random() - 0.5) * 0.08; // ±8% flicker
            }

            // Animate flame expanding from tower to full range
            const currentLength = flameLength * (this.flameAnimationProgress + flickerAmount);

            // Draw flame with gradient from bright center to dark edges
            // Create radial gradient: bright/hot at center (tower), dark at edges
            const gradient = game.ctx.createRadialGradient(
                this.x, this.y, 0,
                this.x, this.y, currentLength
            );

            // Gradient from bright yellow/white (hot center) to red to transparent (cool edges)
            gradient.addColorStop(0, 'rgba(255, 255, 200, 0.9)'); // Bright yellow/white at center
            gradient.addColorStop(0.2, 'rgba(255, 200, 100, 0.8)'); // Light orange
            gradient.addColorStop(0.5, 'rgba(255, 100, 0, 0.7)'); // Orange
            gradient.addColorStop(0.8, 'rgba(200, 50, 0, 0.5)'); // Dark red/orange
            gradient.addColorStop(1, 'rgba(100, 20, 0, 0)'); // Transparent at edges

            game.ctx.fillStyle = gradient;

            // Draw cone as filled arc
            game.ctx.beginPath();
            game.ctx.moveTo(this.x, this.y);
            game.ctx.arc(
                this.x, this.y,
                currentLength,
                this.shootingAngle - coneAngleRad,
                this.shootingAngle + coneAngleRad
            );
            game.ctx.closePath();
            game.ctx.fill();

            game.ctx.restore();
        }
    }
}

export default FlameThrower;