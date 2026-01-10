import Tower from '../Tower.js';
import settings from '../../game.settings.js';
import Projectile from '../Projectile.js';

class PlasmaCannon extends Tower {
    constructor(x, y, towersController) {
        super(x, y, 'plasma', towersController);

        const towerSettings = settings.towers.plasma;
        this.minRange = towerSettings.minRange;
        this.explosionRadius = towerSettings.explosionRadius;
        this.projectileSpeed = towerSettings.projectileSpeed;
        this.arcHeight = towerSettings.arcHeight;

        this.activeExplosions = []; // Track active explosion effects for drawing
    }

    // Override upgrade to handle plasma-specific properties
    upgrade() {
        const game = this.towersController.game;
        const coins = game.stat('coins');
        const upgrade = settings.towers[this.towerType].upgrades[this.level];

        if (upgrade && coins >= upgrade.cost) {
            game.stat('coins', coins - upgrade.cost, true);
            this.damage = upgrade.damage;
            this.fireRange = upgrade.fireRange;
            this.explosionRadius = upgrade.explosionRadius;

            // Add upgrade stats
            this.critRate += upgrade.critRate;
            this.critDamage += upgrade.critDamage;

            this.level++;
            this.color = upgrade.color;
            game.modal.close();
        }
    }

    // Override to add minimum range check
    getEnemiesInRange() {
        const { game, enemies } = this.towersController;
        return enemies.enemiesList.filter(enemy => {
            const distance = game.distance(this.x, this.y, enemy.x, enemy.y);
            return distance >= this.minRange && distance <= (this.fireRange + enemy.r);
        });
    }

    // Calculate predicted target position with inaccuracy
    calculatePredictedTarget(enemy) {
        const { game } = this.towersController;

        // Calculate initial distance and flight time
        const distance = game.distance(this.x, this.y, enemy.x, enemy.y);
        const estimatedFlightTime = distance / this.projectileSpeed;

        // Predict where the enemy will be
        let predictedX = enemy.x + (enemy.velocity.x * estimatedFlightTime);
        let predictedY = enemy.y + (enemy.velocity.y * estimatedFlightTime);

        // Add inaccuracy based on enemy speed (faster = more inaccurate)
        const enemySpeed = Math.sqrt(enemy.velocity.x ** 2 + enemy.velocity.y ** 2);
        const inaccuracyFactor = enemySpeed * 0.15; // 15% inaccuracy per speed unit

        // Random offset in both directions
        const offsetX = (Math.random() - 0.5) * 2 * inaccuracyFactor * estimatedFlightTime;
        const offsetY = (Math.random() - 0.5) * 2 * inaccuracyFactor * estimatedFlightTime;

        predictedX += offsetX;
        predictedY += offsetY;

        return { x: predictedX, y: predictedY };
    }

    shoot(enemy) {
        if (!enemy) return;

        // Calculate predicted target position
        const targetPos = this.calculatePredictedTarget(enemy);

        // Create projectile aimed at predicted position
        new Projectile(this.towersController.game, this.x, this.y, targetPos.x, targetPos.y, {
            size: 8,
            color: this.color,
            speed: this.projectileSpeed,
            arcHeight: this.arcHeight,
            explosionRadius: this.explosionRadius,
            damage: this.damage,
            source: this,
            onHit: (x, y, radius) => this.onProjectileHit(x, y, radius)
        });

        this.stats.shoots++;
    }

    onProjectileHit(x, y, radius) {
        const { game, enemies } = this.towersController;

        // Find all enemies in explosion radius
        const hitEnemies = enemies.enemiesList.filter(enemy => {
            if (enemy.health <= 0) return false;
            const distance = game.distance(x, y, enemy.x, enemy.y);
            return distance <= radius;
        });

        // Apply damage to all enemies in radius
        hitEnemies.forEach(enemy => {
            const { damage, damageType } = this.calculateDamage(enemy);

            this.stats.dmg += damage;
            enemy.damage(damage, damageType);

            if (enemy.deleted) {
                this.stats.kills++;
            }
        });

        // Create explosion visual effect
        this.activeExplosions.push({
            x: x,
            y: y,
            radius: radius,
            progress: 0,
            duration: 0.5 // seconds
        });
    }

    update(deltaTime) {
        super.update(deltaTime);

        // Update explosion animations
        this.activeExplosions = this.activeExplosions.filter(explosion => {
            explosion.progress += deltaTime / explosion.duration;
            return explosion.progress < 1;
        });
    }

    // Override to show min/max range and explosion radius
    getStatsHTML() {
        return `
            <h4>Current Stats (Level ${this.level + 1})</h4>
            <table class="tower-stats">
                <tr><td>Schaden:</td><td>${this.damage.from} - ${this.damage.to}</td></tr>
                <tr><td>Reichweite:</td><td>${this.minRange} - ${this.fireRange}</td></tr>
                <tr><td>Explosionsradius:</td><td>${this.explosionRadius}</td></tr>
                <tr><td>Feuerrate:</td><td>${this.cooldownTime}s</td></tr>
                <tr><td>Crit Chance:</td><td>${this.critRate.toFixed(0)}%</td></tr>
                <tr><td>Crit Schaden:</td><td>${this.critDamage * 100}%</td></tr>
            </table>
        `;
    }

    getUpgradeHTML() {
        const upgrade = settings.towers[this.towerType].upgrades[this.level];
        if (upgrade) {
            return `
                <h4>Upgrade auf Level ${this.level + 2}</h4>
                <table class="tower-stats">
                    <tr><td>Kosten:</td><td>${upgrade.cost} Coins</td></tr>
                    <tr><td>Schaden:</td><td>${upgrade.damage.from} - ${upgrade.damage.to}</td></tr>
                    <tr><td>Max Reichweite:</td><td>${upgrade.fireRange}</td></tr>
                    <tr><td>Explosionsradius:</td><td>${upgrade.explosionRadius}</td></tr>
                    <tr><td>Crit Chance:</td><td>+${upgrade.critRate}%</td></tr>
                    <tr><td>Crit Schaden:</td><td>+${upgrade.critDamage * 100}%</td></tr>
                </table>
                <button id="tower-buy-upgrade-btn" class="btn btn-buy" data-required-coins="${upgrade.cost}">Upgrade Kaufen</button>
            `;
        } else {
            return '<h4>Max Level</h4>';
        }
    }

    drawShootingEffect() {
        const { game } = this.towersController;

        // Draw active explosions
        this.activeExplosions.forEach(explosion => {
            const ctx = game.ctx;
            ctx.save();

            // Explosion expands and fades out
            const currentRadius = explosion.radius * (0.5 + explosion.progress * 0.5);
            const alpha = 1 - explosion.progress;

            // Outer ring (shockwave)
            const gradient = ctx.createRadialGradient(
                explosion.x, explosion.y, currentRadius * 0.5,
                explosion.x, explosion.y, currentRadius
            );
            gradient.addColorStop(0, `rgba(200, 220, 255, 0)`);
            gradient.addColorStop(0.5, `rgba(100, 150, 255, ${alpha * 0.6})`);
            gradient.addColorStop(1, `rgba(0, 100, 200, 0)`);

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(explosion.x, explosion.y, currentRadius, 0, Math.PI * 2);
            ctx.fill();

            // Bright center flash (fades quickly)
            if (explosion.progress < 0.3) {
                const flashAlpha = (1 - explosion.progress / 0.3) * 0.8;
                const flashGradient = ctx.createRadialGradient(
                    explosion.x, explosion.y, 0,
                    explosion.x, explosion.y, currentRadius * 0.4
                );
                flashGradient.addColorStop(0, `rgba(255, 255, 255, ${flashAlpha})`);
                flashGradient.addColorStop(1, `rgba(150, 200, 255, 0)`);

                ctx.fillStyle = flashGradient;
                ctx.beginPath();
                ctx.arc(explosion.x, explosion.y, currentRadius * 0.4, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        });
    }

    draw() {
        const { game, mouse } = this.towersController;
        const towerSettings = settings.towers.plasma;

        // Draw range as donut (ring) when hovering
        if (mouse.isMouseOver(this.x, this.y, this.r) && game.stat('mode') !== 'dropTower') {
            game.drawer.donut(this.x, this.y, this.fireRange, this.minRange, 'rgba(255, 102, 0, 0.2)');
        }

        // Draw tower sprite or fallback circle
        if (towerSettings.images?.complete) {
            const helpers = require('../../helpers.js').default;
            helpers.drawSprite(towerSettings.images, this.level, this.x, this.y - 20, 160, 160);
        } else {
            // Fallback: draw circle
            game.drawer.circle(this.x, this.y, this.r, this.color, true);
        }

        // Draw tower-specific shooting effect
        this.drawShootingEffect();
    }
}

export default PlasmaCannon;