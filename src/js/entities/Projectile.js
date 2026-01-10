import Entity from './Entity.js';

class Projectile extends Entity {
    constructor(game, startX, startY, targetX, targetY, config) {
        super(game, startX, startY, config.size || 5, config.color || '#00BFFF');

        this.type = 'projectile';
        this.targetX = targetX;
        this.targetY = targetY;
        this.speed = config.speed || 200; // pixels per second
        this.arcHeight = config.arcHeight || 50; // Height of the arc
        this.explosionRadius = config.explosionRadius || 80;
        this.damage = config.damage;
        this.source = config.source; // Tower that fired this projectile
        this.onHit = config.onHit; // Callback when projectile hits

        // Calculate trajectory
        this.startX = startX;
        this.startY = startY;
        const dx = targetX - startX;
        const dy = targetY - startY;
        this.distance = Math.sqrt(dx * dx + dy * dy);
        this.duration = this.distance / this.speed; // Total flight time in seconds
        this.elapsed = 0; // Time elapsed since launch

        this.zIndex = 15; // Draw above most things

        // Add to entity manager
        game.mapEntities.add(this);
    }

    update(deltaTime) {
        this.elapsed += deltaTime;

        // Calculate progress (0 to 1)
        const progress = Math.min(this.elapsed / this.duration, 1);

        if (progress >= 1) {
            // Projectile reached target
            this.explode();
            return;
        }

        // Linear interpolation for x and y
        this.x = this.startX + (this.targetX - this.startX) * progress;
        this.y = this.startY + (this.targetY - this.startY) * progress;

        // Add arc (parabolic trajectory)
        // Arc peaks at 0.5 progress
        const arcProgress = Math.sin(progress * Math.PI);
        this.y -= arcProgress * this.arcHeight;
    }

    explode() {
        // Trigger explosion callback if provided
        if (this.onHit) {
            this.onHit(this.targetX, this.targetY, this.explosionRadius);
        }

        // Remove projectile
        this.game.mapEntities.remove(this.id);
    }

    draw() {
        const ctx = this.game.ctx;
        ctx.save();

        // Draw glowing plasma ball
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r);
        gradient.addColorStop(0, 'rgba(200, 220, 255, 1)'); // Bright center
        gradient.addColorStop(0.5, this.color); // Main color
        gradient.addColorStop(1, 'rgba(0, 100, 200, 0)'); // Transparent edge

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

export default Projectile;