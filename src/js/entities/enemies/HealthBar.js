import Entity from '../Entity.js';

class HealthBar extends Entity {
    constructor(target, game) {
        // Call parent constructor. Initial position doesn't matter, it's updated every frame.
        super(game, 0, 0, 0, 'transparent');
        
        this.target = target;
        this.type = 'healthbar';
        this.zIndex = 15; // Ensure it's drawn on top of the enemy, but below towers
    }

    update() {
        // If the target is gone, destroy the health bar
        if (this.target.deleted) {
            this.game.mapEntities.remove(this.id);
            return;
        }

        // Follow the target
        this.x = this.target.x;
        this.y = this.target.y;
    }

    draw() {
        const healthPercent = this.target.health / this.target.maxHealth;
        
        // Only draw if the enemy is damaged
        if (healthPercent < 1) {
            const healthBar = {
                x: this.x - this.target.r,
                y: this.y - this.target.r - 8, // Position it slightly above the enemy
                width: this.target.r * 2,
                height: 4
            };
            this.game.ctx.fillStyle = "black";
            this.game.ctx.fillRect(healthBar.x, healthBar.y, healthBar.width, healthBar.height);
            this.game.ctx.fillStyle = "green";
            this.game.ctx.fillRect(healthBar.x, healthBar.y, healthBar.width * healthPercent, healthBar.height);
        }
    }
}

export default HealthBar;
