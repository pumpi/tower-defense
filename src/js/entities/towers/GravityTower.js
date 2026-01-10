import Tower from '../Tower.js';
import settings from '../../game.settings.js';

class GravityTower extends Tower {
    constructor(x, y, towersController) {
        super(x, y, 'gravity', towersController);
        this.slowEffect = settings.towers.gravity.slowEffect;
        this.affectedEnemies = new Set(); // Track which enemies are currently slowed
    }

    update(deltaTime) {
        const { game, mouse } = this.towersController;

        // Update slow effect on all enemies in range
        const enemiesInRange = this.getEnemiesInRange();

        // Apply slow to enemies in range
        enemiesInRange.forEach(enemy => {
            if (!enemy.slowedBy) {
                enemy.slowedBy = new Map();
            }
            enemy.slowedBy.set(this.id, this.slowEffect);
            this.affectedEnemies.add(enemy);
        });

        // Remove slow from enemies that left the range
        this.affectedEnemies.forEach(enemy => {
            if (!enemiesInRange.includes(enemy)) {
                if (enemy.slowedBy) {
                    enemy.slowedBy.delete(this.id);
                }
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

    upgrade() {
        const game = this.towersController.game;
        const coins = game.stat('coins');
        const upgrade = settings.towers[this.towerType].upgrades[this.level];

        if (upgrade && coins >= upgrade.cost) {
            game.stat('coins', coins - upgrade.cost, true);
            this.slowEffect = upgrade.slowEffect;
            this.fireRange = upgrade.fireRange;

            this.level++;
            this.color = upgrade.color;
            game.modal.close();
        }
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
        return ``
    }

    getUpgradeHTML() {
        const upgrade = settings.towers[this.towerType].upgrades[this.level];
        if (upgrade) {
            return `
                <h4>Upgrade auf Level ${this.level + 2}</h4>
                <table class="tower-stats">
                    <tr><td>Kosten:</td><td>${upgrade.cost} Coins</td></tr>
                    <tr><td>Slow Effect:</td><td>-${Math.round(upgrade.slowEffect * 100)}%</td></tr>
                    <tr><td>Reichweite:</td><td>${upgrade.fireRange}</td></tr>
                </table>
                <button id="tower-buy-upgrade-btn" class="btn">Upgrade Kaufen</button>
            `;
        } else {
            return '<h4>Max Level</h4>';
        }
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