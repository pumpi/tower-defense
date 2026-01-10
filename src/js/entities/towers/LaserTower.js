import Tower from '../Tower.js';
import helpers from '../../helpers.js';

class LaserTower extends Tower {
    constructor(x, y, towersController) {
        super(x, y, 'laser', towersController);
        this.shootingAt = null;
    }

    shoot(enemy) {
        const { damage, damageType } = this.calculateDamage(enemy);

        this.stats.shoots++;
        this.stats.dmg += damage;
        enemy.damage(damage, damageType);

        if (enemy.deleted) {
            this.stats.kills++;
        }

        helpers.playAudio(this.audio);

        this.shootingAt = enemy;
        setTimeout(() => { this.shootingAt = null; }, 100);
    }

    drawShootingEffect() {
        const { game } = this.towersController;

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