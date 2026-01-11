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

        this.shootingAt = {
            enemy: enemy,
            startTime: performance.now(),
        };
    }

    drawShootingEffect() {
        if (!this.shootingAt) {
            return;
        }

        const { game } = this.towersController;
        const { enemy, startTime } = this.shootingAt;

        const elapsedTime = performance.now() - startTime;
        const totalDuration = 150; // ms
        const fadeStartTime = 100; // ms

        // If animation is over, stop drawing
        if (elapsedTime > totalDuration) {
            this.shootingAt = null;
            return;
        }

        game.ctx.save();
        game.ctx.beginPath();

        // Determine current width based on animation phase
        let outerWidth, innerWidth;
        if (elapsedTime < fadeStartTime) {
            // Hold phase
            outerWidth = 4;
            innerWidth = 2;
        } else {
            // Fade phase - shrink the beam
            const fadeProgress = (elapsedTime - fadeStartTime) / (totalDuration - fadeStartTime);
            outerWidth = 4 * (1 - fadeProgress);
            innerWidth = 2 * (1 - fadeProgress);
        }

        // Draw outer beam (colored)
        game.ctx.strokeStyle = this.color;
        game.ctx.lineWidth = outerWidth;
        game.ctx.moveTo(this.x, this.y - 50);
        game.ctx.lineTo(enemy.x, enemy.y);
        game.ctx.stroke();

        // Draw inner beam (white)
        game.ctx.strokeStyle = 'white';
        game.ctx.lineWidth = innerWidth;
        game.ctx.moveTo(this.x, this.y - 50);
        game.ctx.lineTo(enemy.x, enemy.y);
        game.ctx.stroke();

        game.ctx.restore();
    }
}

export default LaserTower;