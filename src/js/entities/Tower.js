import settings from '../game.settings.js';
import helpers from '../helpers.js';
import Entity from './Entity.js';

class Tower extends Entity {
    constructor(x, y, towerType, towersController) {
        const towerSettings = settings.towers[towerType];
        // Call parent constructor
        super(towersController.game, x, y, towerSettings.size, towerSettings.color);

        this.towersController = towersController;
        this.type = 'tower';
        this.towerType = towerType;

        this.fireRange = towerSettings.fireRange;
        this.damage = towerSettings.damage;
        this.cooldownTime = towerSettings.coolDownTime;
        this.level = 0;
        this.audio = towerSettings.audio;

        // Crit stats
        this.critRate = towerSettings.baseCritRate;
        this.critDamage = towerSettings.baseCritDamage;

        this.stats = { shoots: 0, dmg: 0, kills: 0, crits: 0 };
        this.cooldownCounter = 0;
        this.targetEnemy = null;

        // Targeting priority (ordered list of strategies)
        this.targetingPriority = ['most-advanced'];

        // Add self to the entity manager
        this.towersController.mapEntities.add(this);
    }

    upgrade() {
        const game = this.towersController.game;
        const coins = game.stat('coins');
        const upgrade = settings.towers[this.towerType].upgrades[this.level];

        if (upgrade && coins >= upgrade.cost) {
            game.stat('coins', coins - upgrade.cost, true);
            this.damage = upgrade.damage;
            this.fireRange = upgrade.fireRange;

            // Add upgrade stats
            this.critRate += upgrade.critRate;
            this.critDamage += upgrade.critDamage;

            this.level++;
            this.color = upgrade.color;
            game.modal.close();
        }
    }

    update(deltaTime) {
        const { game, mouse } = this.towersController;
        this.cooldownCounter += deltaTime;

        if (this.targetEnemy) {
            const enemyDistance = game.distance(this.x, this.y, this.targetEnemy.x, this.targetEnemy.y);
            if (enemyDistance >= (this.fireRange + this.targetEnemy.r) || this.targetEnemy.health <= 0) {
                this.targetEnemy = null;
            }
        }

        if (!this.targetEnemy) {
            this.targetEnemy = this.findTargetEnemy();
        }

        if (this.targetEnemy) {
            if (this.cooldownCounter >= this.cooldownTime) {
                this.shoot(this.targetEnemy);
                this.cooldownCounter = 0; // Reset cooldown
            }
        }

        this.zIndex = mouse.isMouseOver(this.x, this.y, this.r) ? 20 : 10;

        if (game.stat('mode') !== 'dropTower' && mouse.clicked && mouse.isMouseOver(this.x, this.y, this.r)) {
            this.openOptions();
        }
    }

    getEnemiesInRange() {
        const { game, enemies } = this.towersController;
        return enemies.enemiesList.filter(enemy => {
            const distance = game.distance(this.x, this.y, enemy.x, enemy.y);
            return distance <= (this.fireRange + enemy.r);
        });
    }

    compareByStrategy(enemyA, enemyB, strategy) {
        const { game } = this.towersController;

        switch (strategy) {
            case 'most-advanced':
                if (enemyB.waypointIndex !== enemyA.waypointIndex) {
                    return enemyB.waypointIndex - enemyA.waypointIndex;
                }
                // Same waypoint: closer to next waypoint = more advanced
                const distA = enemyA.waypoint ? game.distance(enemyA.x, enemyA.y, enemyA.waypoint.x, enemyA.waypoint.y) : Infinity;
                const distB = enemyB.waypoint ? game.distance(enemyB.x, enemyB.y, enemyB.waypoint.x, enemyB.waypoint.y) : Infinity;
                return distA - distB;

            case 'least-health':
                return enemyA.health - enemyB.health;

            case 'most-health':
                return enemyB.health - enemyA.health;

            case 'fastest':
                return enemyB.speed - enemyA.speed;

            case 'slowest':
                return enemyA.speed - enemyB.speed;

            case 'closest':
                const distToA = game.distance(this.x, this.y, enemyA.x, enemyA.y);
                const distToB = game.distance(this.x, this.y, enemyB.x, enemyB.y);
                return distToA - distToB;

            case 'prioritize-boss':
                const aIsBoss = enemyA.enemyType === 'boss';
                const bIsBoss = enemyB.enemyType === 'boss';
                if (aIsBoss && !bIsBoss) return -1; // A (boss) comes first
                if (!aIsBoss && bIsBoss) return 1;  // B (boss) comes first
                return 0; // Both boss or both normal → tie

            case 'prioritize-normal':
                const aIsNormal = enemyA.enemyType !== 'boss';
                const bIsNormal = enemyB.enemyType !== 'boss';
                if (aIsNormal && !bIsNormal) return -1; // A (normal) comes first
                if (!aIsNormal && bIsNormal) return 1;  // B (normal) comes first
                return 0; // Both boss or both normal → tie

            default:
                return 0;
        }
    }

    findTargetEnemy() {
        const enemiesInRange = this.getEnemiesInRange();

        if (enemiesInRange.length === 0) {
            return null;
        }

        // Only one enemy: no need to sort
        if (enemiesInRange.length === 1) {
            return enemiesInRange[0];
        }

        // Multi-level sort: use each strategy as tiebreaker for the previous one
        const sorted = [...enemiesInRange].sort((a, b) => {
            for (const strategy of this.targetingPriority) {
                const comparison = this.compareByStrategy(a, b, strategy);
                if (comparison !== 0) {
                    return comparison; // Found a difference, use this strategy
                }
                // Tie: continue to next strategy
            }
            return 0; // All strategies resulted in tie
        });

        return sorted[0];
    }

    // Modal content methods - can be overridden by subclasses
    getStatsHTML() {
        return `
            <h4>Current Stats (Level ${this.level + 1})</h4>
            <table class="tower-stats">
                <tr><td>Schaden:</td><td>${this.damage.from} - ${this.damage.to}</td></tr>
                <tr><td>Reichweite:</td><td>${this.fireRange}</td></tr>
                <tr><td>Feuerrate:</td><td>${this.cooldownTime}s</td></tr>
                <tr><td>Crit Chance:</td><td>${this.critRate.toFixed(0)}%</td></tr>
                <tr><td>Crit Schaden:</td><td>${this.critDamage * 100}%</td></tr>
            </table>
        `;
    }

    getLifetimeStatsHTML() {
        return `
            <h4>Lifetime Stats</h4>
            <table class="tower-stats">
                <tr><td>Schüsse:</td><td>${this.stats.shoots}</td></tr>
                <tr><td>Crits:</td><td>${this.stats.crits} (${((this.stats.crits / this.stats.shoots || 0) * 100).toFixed(2)}%)</td></tr>
                <tr><td>Kills:</td><td>${this.stats.kills}</td></tr>
                <tr><td>Schaden:</td><td>${this.stats.dmg}</td></tr>
            </table>
        `;
    }

    getTargetingPriorityHTML() {
        return `
            <h4>Zielpriorität</h4>
            <p style="font-size: 12px; margin-bottom: 8px;">Wähle mehrere Strategien. Bei Gleichstand wird die nächste Strategie als Tiebreaker verwendet.</p>
            <select id="tower-targeting-priority" multiple autocomplete="off">
                <option value="most-advanced">Am weitesten fortgeschritten</option>
                <option value="least-health">Wenigsten Leben</option>
                <option value="most-health">Meisten Leben</option>
                <option value="fastest">Am schnellsten</option>
                <option value="slowest">Am langsamsten</option>
                <option value="closest">Am nächsten</option>
                <option value="prioritize-boss">Bosse bevorzugen</option>
                <option value="prioritize-normal">Normale Gegner bevorzugen</option>
            </select>
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
                    <tr><td>Crit Chance:</td><td>+${upgrade.critRate}%</td></tr>
                    <tr><td>Crit Schaden:</td><td>+${upgrade.critDamage * 100}%</td></tr>
                </table>
                <button id="tower-buy-upgrade-btn" class="btn" data-required-coins="${upgrade.cost}">Upgrade Kaufen</button>
            `;
        } else {
            return '<h4>Max Level</h4>';
        }
    }

    setupTargetingPriorityUI() {
        const targetingSelect = new window.TomSelect('#tower-targeting-priority', {
            plugins: ['drag_drop', 'remove_button'],
            persist: false,
            maxItems: null,
            items: this.targetingPriority,
            onItemAdd: () => {
                this.targetingPriority = targetingSelect.items;
            },
            onItemRemove: () => {
                this.targetingPriority = targetingSelect.items;
            },
            onDropdownClose: () => {
                this.targetingPriority = targetingSelect.items;
            }
        });

        // Clean up Tom Select when modal closes
        this.towersController.game.modal.onClose(() => {
            targetingSelect.destroy();
        });
    }

    setupUpgradeUI() {
        const upgradeButton = document.getElementById('tower-buy-upgrade-btn');
        if (!upgradeButton) return;

        // Only setup click handler - button enable/disable is handled by Modal's setupCoinBasedButtons
        upgradeButton.onclick = () => this.upgrade();
    }

    openOptions() {
        const content = `
            <div id="tower-stats-container">
                ${this.getStatsHTML()}
                ${this.getLifetimeStatsHTML()}
                ${this.getTargetingPriorityHTML()}
            </div>
            <div id="tower-upgrade-container">
                ${this.getUpgradeHTML()}
            </div>
        `;

        const game = this.towersController.game;
        game.modal.open('Tower Options', content, game);

        // Setup UI components
        this.setupTargetingPriorityUI();
        this.setupUpgradeUI();
    }

    // Abstract method - must be implemented by subclasses
    shoot(enemy) {
        throw new Error('shoot() must be implemented by subclass');
    }

    // Standard draw method (can be overridden if needed)
    draw() {
        const { game, mouse } = this.towersController;
        const towerSettings = settings.towers[this.towerType];

        // Draw range circle when hovering
        if (mouse.isMouseOver(this.x, this.y, this.r) && game.stat('mode') !== 'dropTower') {
            game.drawCircle(this.x, this.y, this.fireRange, 'rgba(255, 102, 0, 0.2)', true);
        }

        // Draw tower sprite or fallback circle
        if (towerSettings.images?.complete) {
            helpers.drawSprite(towerSettings.images, this.level, this.x, this.y - 20, 160, 160);
        } else {
            // Fallback: draw circle
            game.drawCircle(this.x, this.y, this.r, this.color, true);
        }

        // Draw tower-specific shooting effect
        this.drawShootingEffect();
    }

    // Abstract method - must be implemented by subclasses
    drawShootingEffect() {
        throw new Error('drawShootingEffect() must be implemented by subclass');
    }
}

export default Tower;