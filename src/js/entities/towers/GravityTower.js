import Tower from '../Tower.js';
import settings from '../../game.settings.js';

class GravityTower extends Tower {
    constructor(x, y, towersController) {
        super(x, y, 'gravity', towersController);
        this.slowEffect = settings.towers.gravity.slowEffect;
        this.critRateBonus = settings.towers.gravity.critRateBonus;
        this.affectedEnemies = new Set(); // Track which enemies are currently slowed

        // Override stats for support tower tracking
        this.stats = {
            totalEnemiesSlowed: 0,      // Unique enemies that were slowed
            totalSlowTime: 0,           // Accumulated slow-seconds (enemies * time)
            totalCritDebuffTime: 0,     // Accumulated crit debuff-seconds
            currentlyAffecting: 0       // Current enemies being affected
        };
        this.trackedEnemies = new Set(); // Track unique enemies we've ever slowed
    }

    update(deltaTime) {
        const { game, mouse } = this.towersController;

        // Update slow effect on all enemies in range
        const enemiesInRange = this.getEnemiesInRange();

        // Apply slow and crit debuff to enemies in range
        enemiesInRange.forEach(enemy => {
            if (!enemy.slowedBy) {
                enemy.slowedBy = new Map();
            }
            enemy.slowedBy.set(this.id, this.slowEffect);

            // Apply crit rate debuff (makes enemy easier to crit)
            enemy.critRateDebuff = this.critRateBonus;

            this.affectedEnemies.add(enemy);

            // Track unique enemies for stats
            if (!this.trackedEnemies.has(enemy)) {
                this.trackedEnemies.add(enemy);
                this.stats.totalEnemiesSlowed++;
            }
        });

        // Track slow time (enemy-seconds of slow effect)
        if (deltaTime && this.affectedEnemies.size > 0) {
            this.stats.totalSlowTime += deltaTime * this.affectedEnemies.size;
            this.stats.totalCritDebuffTime += deltaTime * this.affectedEnemies.size;
        }
        this.stats.currentlyAffecting = this.affectedEnemies.size;

        // Remove slow and crit debuff from enemies that left the range
        this.affectedEnemies.forEach(enemy => {
            if (!enemiesInRange.includes(enemy)) {
                if (enemy.slowedBy) {
                    enemy.slowedBy.delete(this.id);
                }
                // Reset crit debuff
                enemy.critRateDebuff = 0;
                this.affectedEnemies.delete(enemy);
            }
        });

        this.zIndex = mouse.isMouseOver(this.x, this.y, this.r) ? 20 : 10;

        if (game.stat('mode') !== 'dropTower' && mouse.clicked && mouse.isMouseOver(this.x, this.y, this.r)) {
            this.openOptions();
        }
    }

    shoot(enemy) {
        // No shooting - slow effect is applied in update()
    }

    getStatsHTML() {
        return `
            <h4>Current Stats (Level ${this.level + 1})</h4>
            <table class="tower-stats">
                <tr><td>Slow Effect:</td><td>-${Math.round((1 - this.slowEffect) * 100)}%</td></tr>
                <tr><td>Reichweite:</td><td>${this.fireRange}</td></tr>
            </table>
        `;
    }

    getTargetingPriorityHTML() {
        return ``
    }

    setupTargetingPriorityUI() {
    }

    getLifetimeStatsHTML() {
        return `
            <h4>Lifetime Stats</h4>
            <table class="tower-stats">
                <tr><td>Enemies verlangsamt:</td><td>${this.stats.totalEnemiesSlowed}</td></tr>
                <tr><td>Slow-Zeit (gesamt):</td><td>${this.stats.totalSlowTime.toFixed(1)}s</td></tr>
                <tr><td>Aktuell betroffene:</td><td>${this.stats.currentlyAffecting}</td></tr>
            </table>
        `;
    }

    drawShootingEffect() {
        const { game } = this.towersController;

        // Draw lines to slowed enemies
        game.ctx.save();
        game.ctx.strokeStyle = this.color;
        game.ctx.lineWidth = 1;
        game.ctx.globalAlpha = 0.3;
        this.affectedEnemies.forEach(enemy => {
            game.ctx.beginPath();
            game.ctx.moveTo(this.x, this.y);
            game.ctx.lineTo(enemy.x, enemy.y);
            game.ctx.stroke();
        });
        game.ctx.restore();
    }
}

export default GravityTower;