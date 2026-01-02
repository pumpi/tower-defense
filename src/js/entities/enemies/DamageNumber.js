import Entity from '../Entity.js';

class DamageNumber extends Entity {
    constructor(text, x, y, isCrit, floatDirection, game) {
        super(game, x, y, 0, 'transparent');
        
        this.text = text;
        this.isCrit = isCrit;
        this.floatDirection = floatDirection || -1; // Default to floating up
        this.type = 'damagenumber';
        this.zIndex = 20; // Draw on top of everything
        this.lifetime = 1.0; // seconds
        this.opacity = 1.0;
        this.verticalSpeed = 30;
    }

    update(deltaTime) {
        this.lifetime -= deltaTime;
        if (this.lifetime <= 0) {
            this.game.mapEntities.remove(this.id);
            return;
        }
        
        // Move in the specified direction and fade out
        this.y += (this.verticalSpeed * this.floatDirection) * deltaTime;
        this.opacity = this.lifetime; // Fades out linearly with lifetime
    }

    draw() {
        const ctx = this.game.ctx;
        ctx.save();
        ctx.font = this.isCrit ? 'bold 18px sans-serif' : 'normal 14px sans-serif';
        ctx.textAlign = 'center';

        // Outline
        ctx.strokeStyle = `rgba(0, 0, 0, ${this.opacity})`;
        ctx.lineWidth = 3;
        ctx.strokeText(this.text, this.x, this.y);

        // Fill
        ctx.fillStyle = this.isCrit ? `rgba(255, 0, 0, ${this.opacity})` : `rgba(255, 255, 255, ${this.opacity})`;
        ctx.fillText(this.text, this.x, this.y);
        
        ctx.restore();
    }
}

export default DamageNumber;
