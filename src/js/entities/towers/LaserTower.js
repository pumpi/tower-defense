import Tower from '../Tower.js';
import settings from '../../game.settings.js';
import helpers from '../../helpers.js';

class LaserTower extends Tower {
    constructor(x, y, towersController) {
        super(x, y, 'laser', towersController);
        this.shootingAt = null;
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

        helpers.playAudio(this.audio);

        this.shootingAt = enemy;
        setTimeout(() => { this.shootingAt = null; }, 100);
    }

    draw() {
        const { game, mouse } = this.towersController;
        if (mouse.isMouseOver(this.x, this.y, this.r) && game.stat('mode') !== 'dropTower') {
            game.drawCircle(this.x, this.y, this.fireRange, 'rgba(0,0,255,0.2)', true);
        }

        helpers.drawSprite(settings.towers[this.towerType].images, this.level, this.x, this.y - 20, 160, 160);

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

export default LaserTower;