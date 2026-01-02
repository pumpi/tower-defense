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

        // Crit stats
        this.critRate = towerSettings.baseCritRate;
        this.critDamage = towerSettings.baseCritDamage;

        this.audio = new Audio(towerSettings.audio);
        this.audio.volume = 0.3;
        this.stats = { shoots: 0, dmg: 0, kills: 0, crits: 0 };
        this.cooldownCounter = 0;
        this.closestEnemy = false;

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

        if (this.closestEnemy) {
            const enemyDistance = game.distance(this.x, this.y, this.closestEnemy.x, this.closestEnemy.y);
            if (enemyDistance >= (this.fireRange + this.closestEnemy.r) || this.closestEnemy.health <= 0) {
                this.closestEnemy = false;
            }
        }

        if (!this.closestEnemy) {
            this.closestEnemy = this.findClosestEnemy();
        }

        if (this.closestEnemy) {
            if (this.cooldownCounter >= this.cooldownTime) {
                this.shoot(this.closestEnemy);
                this.audio.play().catch(() => {});
                this.cooldownCounter = 0; // Reset cooldown
            }
        }

        this.zIndex = mouse.isMouseOver(this.x, this.y, this.r) ? 20 : 10;

        if (game.stat('mode') !== 'dropTower' && mouse.clicked && mouse.isMouseOver(this.x, this.y, this.r)) {
            this.towersController.openOptions(this);
        }
    }

    findClosestEnemy() {
        const { game, enemies } = this.towersController;
        let mostAdvancedEnemy = null;
        let highestWaypointIndex = -1;
        let shortestDistanceToWaypoint = Infinity;

        for (const enemy of enemies.enemiesList) {
            const distance = game.distance(this.x, this.y, enemy.x, enemy.y);

            if (distance <= (this.fireRange + enemy.r)) {
                if (enemy.waypointIndex > highestWaypointIndex) {
                    highestWaypointIndex = enemy.waypointIndex;
                    mostAdvancedEnemy = enemy;
                    shortestDistanceToWaypoint = enemy.waypoint ? game.distance(enemy.x, enemy.y, enemy.waypoint.x, enemy.waypoint.y) : Infinity;
                } else if (enemy.waypointIndex === highestWaypointIndex && enemy.waypoint) {
                    const distanceToWaypoint = game.distance(enemy.x, enemy.y, enemy.waypoint.x, enemy.waypoint.y);
                    if (distanceToWaypoint < shortestDistanceToWaypoint) {
                        mostAdvancedEnemy = enemy;
                        shortestDistanceToWaypoint = distanceToWaypoint;
                    }
                }
            }
        }
        return mostAdvancedEnemy;
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
        this.game.on('afterDraw', () => this.draw());
    }

    update() {
        const gridPosition = this.gridPosition();
        const bulletType = this.game.stat('selectedTowerType');

        if (this.game.stat('mode') === 'dropTower' && this.map.isValidTowerPlace(gridPosition.x, gridPosition.y, bulletType) && this.mouse.clicked) {
            this.game.stat('mode', '');
            this.game.stat('coins', this.game.stat('coins') - settings.towers[bulletType].costs, true);
            this.create(gridPosition.x, gridPosition.y, bulletType);
        }
    }

    draw() {
        if (this.game.stat('mode') === 'dropTower') {
            const gridPosition = this.gridPosition();
            const bulletType = this.game.stat('selectedTowerType');
            const isValid = this.map.isValidTowerPlace(gridPosition.x, gridPosition.y, bulletType);

            if (isValid) {
                this.game.drawCircle(gridPosition.x, gridPosition.y, settings.towers[bulletType].fireRange, 'rgba(0,0,255,0.2)', true);
                helpers.drawSprite(settings.towers[bulletType].images, 0, gridPosition.x, gridPosition.y - 20, 160, 160);
            } else {
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

        // Add event listener for upgrade button if it exists
        if (upgrade) {
            const upgradeButton = document.getElementById('tower-buy-upgrade-btn');
            if (upgradeButton) {
                upgradeButton.onclick = () => tower.upgrade();
                upgradeButton.disabled = upgrade.cost > this.game.stat('coins');
            }
        }
    }
}

export default Towers;
