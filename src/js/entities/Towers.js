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
        const upgrade = settings.towers[this.bullet].upgrades[this.level];

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
                helpers.playAudio(this.audio);
                this.cooldownCounter = 0; // Reset cooldown
            }
        }

        this.zIndex = mouse.isMouseOver(this.x, this.y, this.r) ? 20 : 10;

        if (game.stat('mode') !== 'dropTower' && mouse.clicked && mouse.isMouseOver(this.x, this.y, this.r)) {
            this.towersController.openOptions(this);
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

    shoot(enemy) {
        let damage = Math.floor(Math.random() * (this.damage.to - this.damage.from + 1)) + this.damage.from;
        let isCrit = false;
        
        // Crit calculation
        const critChance = (this.critRate - enemy.critResistance) / 100;
        const finalCritChance = Math.max(0.05, Math.min(critChance, 0.75)); // Clamp chance between 5% and 75%
        
        if (Math.random() < finalCritChance) {
            damage *= this.critDamage;
            this.stats.crits++;
            isCrit = true;
        }

        damage = Math.round(damage);
        this.stats.shoots++;
        this.stats.dmg += damage;
        enemy.damage(damage, isCrit);

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

        this.game.on('update', () => this.update());
        this.game.on('beforeDraw', () => this.draw());
    }

    update() {
        const gridPosition = this.gridPosition();
        const bulletType = this.game.stat('selectedTowerType');

        if (this.game.stat('mode') === 'dropTower' && this.map.isValidTowerPlace(gridPosition.x, gridPosition.y) && this.mouse.clicked) {
            this.game.stat('mode', '');
            this.game.stat('coins', this.game.stat('coins') - settings.towers[bulletType].costs, true);
            this.create(gridPosition.x, gridPosition.y, bulletType);
        }
    }

    draw() {
        if (this.game.stat('mode') === 'dropTower') {
            const gridPosition = this.gridPosition();
            const bulletType = this.game.stat('selectedTowerType');
            const isValid = this.map.isValidTowerPlace(gridPosition.x, gridPosition.y);
            const isOccupied = this.map.isTowerAtPosition(gridPosition.x, gridPosition.y);

            if (isValid) {
                this.game.drawCircle(gridPosition.x, gridPosition.y, settings.towers[bulletType].fireRange, 'rgba(0,0,255,0.2)', true);
                helpers.drawSprite(settings.towers[bulletType].images, 0, gridPosition.x, gridPosition.y - 20, 160, 160);
            } else if (!isOccupied) {
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
        // Build current stats HTML
        let content = `
            <div id="tower-stats-container">
                <h4>Current Stats (Level ${tower.level + 1})</h4>
                <table class="tower-stats">
                    <tr><td>Schaden:</td><td>${tower.damage.from} - ${tower.damage.to}</td></tr>
                    <tr><td>Reichweite:</td><td>${tower.fireRange}</td></tr>
                    <tr><td>Feuerrate:</td><td>${tower.cooldownTime}s</td></tr>
                    <tr><td>Crit Chance:</td><td>${tower.critRate.toFixed(0)}%</td></tr>
                    <tr><td>Crit Schaden:</td><td>${tower.critDamage * 100}%</td></tr>
                </table>
                <h4>Lifetime Stats</h4>
                <table class="tower-stats">
                    <tr><td>Schüsse:</td><td>${tower.stats.shoots}</td></tr>
                    <tr><td>Crits:</td><td>${tower.stats.crits} (${((tower.stats.crits / tower.stats.shoots || 0) * 100).toFixed(2)}%)</td></tr>
                    <tr><td>Kills:</td><td>${tower.stats.kills}</td></tr>
                    <tr><td>Schaden:</td><td>${tower.stats.dmg}</td></tr>
                </table>
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
            </div>
            <div id="tower-upgrade-container">
        `;

        // Build upgrade stats HTML
        const upgrade = settings.towers[tower.bullet].upgrades[tower.level];
        if (upgrade) {
            content += `
                <h4>Upgrade auf Level ${tower.level + 2}</h4>
                <table class="tower-stats">
                    <tr><td>Kosten:</td><td>${upgrade.cost} Coins</td></tr>
                    <tr><td>Schaden:</td><td>${upgrade.damage.from} - ${upgrade.damage.to}</td></tr>
                    <tr><td>Reichweite:</td><td>${upgrade.fireRange}</td></tr>
                    <tr><td>Crit Chance:</td><td>+${upgrade.critRate}%</td></tr>
                    <tr><td>Crit Schaden:</td><td>+${upgrade.critDamage * 100}%</td></tr>
                </table>
                <button id="tower-buy-upgrade-btn" class="btn">Upgrade Kaufen</button>
            `;
        } else {
            content += '<h4>Max Level</h4>';
        }

        content += '</div>';

        this.game.modal.open('Tower Options', content);

        // Initialize Tom Select for targeting priority
        const targetingSelect = new window.TomSelect('#tower-targeting-priority', {
            plugins: ['drag_drop', 'remove_button'],
            persist: false,
            maxItems: null,
            items: tower.targetingPriority, // Set current priorities
            onItemAdd: function() {
                tower.targetingPriority = this.items;
            },
            onItemRemove: function() {
                tower.targetingPriority = this.items;
            },
            onDropdownClose: function() {
                tower.targetingPriority = this.items;
            }
        });

        // Clean up Tom Select when modal closes
        this.game.modal.onClose(() => {
            targetingSelect.destroy();
        });

        // Add event listener for upgrade button if it exists
        if (upgrade) {
            const upgradeButton = document.getElementById('tower-buy-upgrade-btn');
            if (upgradeButton) {
                upgradeButton.onclick = () => tower.upgrade();

                // Update button status based on current coins
                const updateButtonStatus = () => {
                    upgradeButton.disabled = upgrade.cost > this.game.stat('coins');
                };
                updateButtonStatus();

                // Listen to coin changes and update button status
                const coinChangeHandler = () => updateButtonStatus();
                this.game.on('stat:coins', coinChangeHandler);

                // Clean up listener when modal closes
                this.game.modal.onClose(() => {
                    this.game.off('stat:coins', coinChangeHandler);
                });
            }
        }
    }
}

export default Towers;
