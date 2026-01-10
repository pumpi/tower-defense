import Tower from '../Tower.js';
import settings from '../../game.settings.js';

class TeslaTower extends Tower {
    constructor(x, y, towersController) {
        super(x, y, 'tesla', towersController);

        const towerSettings = settings.towers.tesla;
        this.maxChains = towerSettings.maxChains;
        this.chainRange = towerSettings.chainRange;
        this.chainDamageMultipliers = towerSettings.chainDamageMultipliers;

        // Visual effects tracking
        this.activeLightning = []; // Array of lightning chains to draw
    }

    // Override upgrade to handle tesla-specific properties
    upgrade() {
        const game = this.towersController.game;
        const coins = game.stat('coins');
        const upgrade = settings.towers[this.towerType].upgrades[this.level];

        if (upgrade && coins >= upgrade.cost) {
            game.stat('coins', coins - upgrade.cost, true);
            this.damage = upgrade.damage;
            this.fireRange = upgrade.fireRange;
            this.chainRange = upgrade.chainRange;

            // Add upgrade stats
            this.critRate += upgrade.critRate;
            this.critDamage += upgrade.critDamage;

            this.level++;
            this.color = upgrade.color;
            game.modal.close();
        }
    }

    shoot(enemy) {
        if (!enemy) return;

        const hitEnemies = new Set(); // Track which enemies were hit
        const lightningSegments = []; // Store all lightning segments {from, to}

        // Hit initial target
        this.hitTarget(enemy, hitEnemies, 0, lightningSegments, { x: this.x, y: this.y });

        // Process branching chains
        // Level 1: Initial target → 2 enemies
        const level1Targets = this.findMultipleChainTargets(enemy, hitEnemies, 2);
        level1Targets.forEach(target => {
            this.hitTarget(target, hitEnemies, 1, lightningSegments, { x: enemy.x, y: enemy.y });

            // Level 2: Each of the 2 enemies → 3 more enemies
            const level2Targets = this.findMultipleChainTargets(target, hitEnemies, 3);
            level2Targets.forEach(subTarget => {
                this.hitTarget(subTarget, hitEnemies, 2, lightningSegments, { x: target.x, y: target.y });
            });
        });

        // Store lightning segments for visual effect
        this.activeLightning.push({
            segments: lightningSegments,
            progress: 0,
            duration: 0.3 // seconds
        });
    }

    // Hit a target with damage based on chain level
    hitTarget(enemy, hitEnemies, chainLevel, lightningSegments, fromPos) {
        // Double-check: Skip if already hit
        if (hitEnemies.has(enemy)) {
            console.warn('Enemy already hit, skipping to prevent double-hit');
            return;
        }

        // Mark as hit FIRST
        hitEnemies.add(enemy);

        // Add lightning segment
        if (lightningSegments && fromPos) {
            lightningSegments.push({
                from: fromPos,
                to: { x: enemy.x, y: enemy.y }
            });
        }

        // Calculate and apply damage
        const damageMultiplier = this.chainDamageMultipliers[chainLevel] || 0;
        const { damage: baseDamage, damageType } = this.calculateDamage(enemy);
        const damage = Math.round(baseDamage * damageMultiplier);

        this.stats.shoots++;
        this.stats.dmg += damage;
        enemy.damage(damage, damageType);

        if (enemy.deleted) {
            this.stats.kills++;
        }
    }

    // Find multiple chain targets (branching)
    findMultipleChainTargets(currentEnemy, hitEnemies, count) {
        const { game, enemies } = this.towersController;

        // Get all enemies in chain range that haven't been hit
        const validTargets = enemies.enemiesList.filter(enemy => {
            if (hitEnemies.has(enemy)) return false; // Already hit
            if (enemy.health <= 0) return false; // Dead

            const distance = game.distance(currentEnemy.x, currentEnemy.y, enemy.x, enemy.y);
            return distance <= this.chainRange;
        });

        if (validTargets.length === 0) return [];

        // Sort by distance and take closest 'count' enemies
        validTargets.sort((a, b) => {
            const distA = game.distance(currentEnemy.x, currentEnemy.y, a.x, a.y);
            const distB = game.distance(currentEnemy.x, currentEnemy.y, b.x, b.y);
            return distA - distB;
        });

        return validTargets.slice(0, count);
    }

    update(deltaTime) {
        super.update(deltaTime);

        // Update lightning animations
        this.activeLightning = this.activeLightning.filter(lightning => {
            lightning.progress += deltaTime / lightning.duration;
            return lightning.progress < 1;
        });
    }

    // Override stats to show chain info
    getStatsHTML() {
        return `
            <h4>Current Stats (Level ${this.level + 1})</h4>
            <table class="tower-stats">
                <tr><td>Schaden:</td><td>${this.damage.from} - ${this.damage.to}</td></tr>
                <tr><td>Reichweite:</td><td>${this.fireRange}</td></tr>
                <tr><td>Kettenreichweite:</td><td>${this.chainRange}</td></tr>
                <tr><td>Max Ketten:</td><td>${this.maxChains}</td></tr>
                <tr><td>Schadensreduktion:</td><td>${this.chainDamageMultipliers.map(m => Math.round(m * 100) + '%').join(' → ')}</td></tr>
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
                    <tr><td>Reichweite:</td><td>${upgrade.fireRange}</td></tr>
                    <tr><td>Kettenreichweite:</td><td>${upgrade.chainRange}</td></tr>
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

        // Draw all active lightning effects
        this.activeLightning.forEach(lightning => {
            const ctx = game.ctx;
            ctx.save();

            const alpha = 1 - lightning.progress;

            // Draw all lightning segments (branching paths)
            lightning.segments.forEach(segment => {
                this.drawLightningBolt(ctx, segment.from.x, segment.from.y, segment.to.x, segment.to.y, alpha);
            });

            ctx.restore();
        });
    }

    // Draw a jagged lightning bolt between two points
    drawLightningBolt(ctx, x1, y1, x2, y2, alpha) {
        // Calculate direction vector
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.sqrt(dx * dx + dy * dy);

        // Calculate segments based on distance (1 segment per ~20 pixels)
        const segments = Math.max(2, Math.floor(length / 20));
        const offset = 12; // Maximum perpendicular offset

        // Normalized direction
        const dirX = dx / length;
        const dirY = dy / length;

        // Perpendicular vector
        const perpX = -dirY;
        const perpY = dirX;

        // Generate zigzag points once for both paths
        const zigzagPoints = [{ x: x1, y: y1 }];

        for (let i = 1; i < segments; i++) {
            const t = i / segments;
            const baseX = x1 + dx * t;
            const baseY = y1 + dy * t;

            // Random offset perpendicular to the line
            const randOffset = (Math.random() - 0.5) * 2 * offset;
            const segX = baseX + perpX * randOffset;
            const segY = baseY + perpY * randOffset;

            zigzagPoints.push({ x: segX, y: segY });
        }

        zigzagPoints.push({ x: x2, y: y2 });

        // Draw first path - Cyan main bolt (thicker)
        ctx.strokeStyle = `rgba(0, 255, 255, ${alpha})`;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 10;
        ctx.shadowColor = `rgba(0, 255, 255, ${alpha * 0.8})`;

        ctx.beginPath();
        ctx.moveTo(zigzagPoints[0].x, zigzagPoints[0].y);
        for (let i = 1; i < zigzagPoints.length; i++) {
            ctx.lineTo(zigzagPoints[i].x, zigzagPoints[i].y);
        }
        ctx.stroke();

        // Draw second path - White core (thinner, slightly offset)
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.9})`;
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 5;
        ctx.shadowColor = `rgba(255, 255, 255, ${alpha * 0.6})`;

        // Generate slightly different path for the white bolt
        ctx.beginPath();
        ctx.moveTo(x1, y1);

        for (let i = 1; i < segments; i++) {
            const t = i / segments;
            const baseX = x1 + dx * t;
            const baseY = y1 + dy * t;

            // Different random offset for variation
            const randOffset = (Math.random() - 0.5) * 2 * offset * 0.7; // Slightly less offset
            const segX = baseX + perpX * randOffset;
            const segY = baseY + perpY * randOffset;

            ctx.lineTo(segX, segY);
        }

        ctx.lineTo(x2, y2);
        ctx.stroke();

        ctx.shadowBlur = 0;
    }
}

export default TeslaTower;