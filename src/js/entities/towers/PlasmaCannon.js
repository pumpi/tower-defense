import Tower from '../Tower.js';
import settings from '../../game.settings.js';
import Projectile from '../Projectile.js';

class PlasmaCannon extends Tower {
    constructor(x, y, towersController) {
        super(x, y, 'plasma', towersController);

        const towerSettings = settings.towers.plasma;
        this.minRange = towerSettings.minRange;
        this.explosionRadius = towerSettings.explosionRadius;
        this.projectileSpeed = towerSettings.projectileSpeed;
        this.arcHeight = towerSettings.arcHeight;
        this.knockbackForce = towerSettings.knockbackForce;

        this.activeExplosions = []; // Track active explosion effects for drawing
    }

    // Override to add minimum range check
    getEnemiesInRange() {
        const { game, enemies } = this.towersController;
        return enemies.enemiesList.filter(enemy => {
            const distance = game.distance(this.x, this.y, enemy.x, enemy.y);
            return distance >= this.minRange && distance <= (this.fireRange + enemy.r);
        });
    }

    calculatePredictedTarget(enemy) {
        const { game } = this.towersController;
        const map = this.towersController.map;

        // 1. Calculate enemy's current effective speed (with slows)
        let slowMultiplier = 1.0;
        if (enemy.slowedBy && enemy.slowedBy.size > 0) {
            slowMultiplier = Math.min(...enemy.slowedBy.values());
        }
        const effectiveSpeed = enemy.speed * slowMultiplier;

        // 2. Estimate flight time and prediction distance
        const distanceToEnemy = game.distance(this.x, this.y, enemy.x, enemy.y);
        const estimatedFlightTime = distanceToEnemy / this.projectileSpeed;
        let predictionDistance = effectiveSpeed * estimatedFlightTime;

        // 3. "Walk" the enemy along its path to find the future point
        let predictedX = enemy.x;
        let predictedY = enemy.y;
        let currentWaypointIndex = enemy.waypointIndex;

        // Distance to the current target waypoint
        let distanceToNextWaypoint = game.distance(predictedX, predictedY, enemy.waypoint.x, enemy.waypoint.y);

        while (predictionDistance > distanceToNextWaypoint) {
            // Enemy will pass its current waypoint
            predictionDistance -= distanceToNextWaypoint;

            // Move to the next waypoint
            predictedX = enemy.waypoint.x;
            predictedY = enemy.waypoint.y;

            // Get the next waypoint in the path
            currentWaypointIndex++;
            const nextWaypoint = map.waypoints[currentWaypointIndex];
            if (!nextWaypoint) {
                // Enemy is at the end of the path, stop predicting further
                break;
            }

            // Update waypoint with the random shift
            const nextWaypointShifted = {
                x: nextWaypoint.x + enemy.shift,
                y: nextWaypoint.y + enemy.shift
            };

            distanceToNextWaypoint = game.distance(predictedX, predictedY, nextWaypointShifted.x, nextWaypointShifted.y);
        }

        // If there's remaining distance, calculate position on the current segment
        if (predictionDistance > 0 && distanceToNextWaypoint > 0) {
            const nextWaypoint = map.waypoints[currentWaypointIndex];
            if (nextWaypoint) {
                const nextWaypointShifted = {
                    x: nextWaypoint.x + enemy.shift,
                    y: nextWaypoint.y + enemy.shift
                };
                const ratio = predictionDistance / distanceToNextWaypoint;
                predictedX += (nextWaypointShifted.x - predictedX) * ratio;
                predictedY += (nextWaypointShifted.y - predictedY) * ratio;
            }
        }

        // 4. Add original inaccuracy logic
        const enemySpeed = Math.sqrt(enemy.velocity.x ** 2 + enemy.velocity.y ** 2);
        const inaccuracyFactor = enemySpeed * 0.15;
        const offsetX = (Math.random() - 0.5) * 2 * inaccuracyFactor * estimatedFlightTime;
        const offsetY = (Math.random() - 0.5) * 2 * inaccuracyFactor * estimatedFlightTime;

        predictedX += offsetX;
        predictedY += offsetY;

        return { x: predictedX, y: predictedY };
    }

    shoot(enemy) {
        if (!enemy) return;

        // Calculate predicted target position
        const targetPos = this.calculatePredictedTarget(enemy);

        // Create projectile aimed at predicted position
        new Projectile(this.towersController.game, this.x, this.y, targetPos.x, targetPos.y, {
            size: 8,
            color: this.color,
            speed: this.projectileSpeed,
            arcHeight: this.arcHeight,
            explosionRadius: this.explosionRadius,
            damage: this.damage,
            source: this,
            onHit: (x, y, radius) => this.onProjectileHit(x, y, radius)
        });

        this.stats.shoots++;
    }

    onProjectileHit(x, y, radius) {
        const { game, enemies } = this.towersController;

        // Find all enemies in explosion radius
        const hitEnemies = enemies.enemiesList.filter(enemy => {
            if (enemy.health <= 0) return false;
            const distance = game.distance(x, y, enemy.x, enemy.y);
            return distance <= radius;
        });

        // Apply damage and knockback to all enemies in radius
        hitEnemies.forEach(enemy => {
            const { damage, damageType } = this.calculateDamage(enemy);

            this.stats.dmg += damage;
            enemy.damage(damage, damageType, this);

            // Apply mass-based knockback (heavier enemies get knocked back less)
            if (!enemy.deleted && enemy.velocity && (enemy.velocity.x !== 0 || enemy.velocity.y !== 0)) {
                // Base reference HP for knockback calculation (average enemy)
                const baseHP = 100;

                // Calculate knockback distance (inversely proportional to enemy mass/HP)
                const baseKnockbackDistance = this.knockbackForce * (baseHP / enemy.maxHealth);

                // Calculate direction from explosion center to enemy
                const dx = enemy.x - x;
                const dy = enemy.y - y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance > 0) {
                    // Normalize explosion direction
                    const explosionDirX = dx / distance;
                    const explosionDirY = dy / distance;

                    // Get enemy's current movement direction (normalized)
                    const velocityLength = Math.sqrt(enemy.velocity.x ** 2 + enemy.velocity.y ** 2);
                    const velocityDirX = enemy.velocity.x / velocityLength;
                    const velocityDirY = enemy.velocity.y / velocityLength;

                    // Calculate dot product to determine alignment
                    // > 0: explosion pushes forward along path
                    // < 0: explosion pushes backward along path
                    const dotProduct = explosionDirX * velocityDirX + explosionDirY * velocityDirY;

                    // Knockback strength depends on alignment (perpendicular = weak, aligned = strong)
                    const alignmentStrength = Math.abs(dotProduct);
                    const knockbackDistance = baseKnockbackDistance * alignmentStrength;

                    // Only apply if strong enough alignment
                    if (knockbackDistance > 5) {
                        // Knockback direction is along the path (forward or backward)
                        const knockbackSign = Math.sign(dotProduct);

                        // Start knockback animation
                        enemy.knockbackActive = true;
                        enemy.knockbackProgress = 0;
                        enemy.knockbackStartX = enemy.x;
                        enemy.knockbackStartY = enemy.y;
                        enemy.knockbackTargetX = enemy.x + velocityDirX * knockbackSign * knockbackDistance;
                        enemy.knockbackTargetY = enemy.y + velocityDirY * knockbackSign * knockbackDistance;
                    }
                }
            }

            if (enemy.deleted) {
                this.stats.kills++;
            }
        });

        // Create explosion visual effect
        this.activeExplosions.push({
            x: x,
            y: y,
            radius: radius,
            progress: 0,
            duration: 0.5 // seconds
        });
    }

    update(deltaTime) {
        super.update(deltaTime);

        // Update explosion animations
        this.activeExplosions = this.activeExplosions.filter(explosion => {
            explosion.progress += deltaTime / explosion.duration;
            return explosion.progress < 1;
        });
    }

    // Override to show min/max range and explosion radius
    getStatsHTML() {
        return `
            <h4>Current Stats (Level ${this.level + 1})</h4>
            <table class="tower-stats">
                <tr><td>Schaden:</td><td>${this.damage.from} - ${this.damage.to}</td></tr>
                <tr><td>Reichweite:</td><td>${this.minRange} - ${this.fireRange}</td></tr>
                <tr><td>Explosionsradius:</td><td>${this.explosionRadius}</td></tr>
                <tr><td>Feuerrate:</td><td>${this.cooldownTime}s</td></tr>
                <tr><td>Crit Chance:</td><td>${this.critRate.toFixed(0)}%</td></tr>
                <tr><td>Crit Schaden:</td><td>${this.critDamage * 100}%</td></tr>
            </table>
        `;
    }

    drawShootingEffect() {
        const { game } = this.towersController;

        // Draw active explosions
        this.activeExplosions.forEach(explosion => {
            const ctx = game.ctx;
            ctx.save();

            // Explosion expands and fades out
            const currentRadius = explosion.radius * (0.5 + explosion.progress * 0.5);
            const alpha = 1 - explosion.progress;

            // Outer ring (shockwave)
            const gradient = ctx.createRadialGradient(
                explosion.x, explosion.y, currentRadius * 0.5,
                explosion.x, explosion.y, currentRadius
            );
            gradient.addColorStop(0, `rgba(200, 255, 200, 0)`); // Very light green, almost transparent
            gradient.addColorStop(0.5, `rgba(100, 255, 100, ${alpha * 0.6})`); // Bright green
            gradient.addColorStop(1, `rgba(0, 200, 0, 0)`); // Darker green, fading

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(explosion.x, explosion.y, currentRadius, 0, Math.PI * 2);
            ctx.fill();

            // Bright center flash (fades quickly)
            if (explosion.progress < 0.3) {
                const flashAlpha = (1 - explosion.progress / 0.3) * 0.8;
                const flashGradient = ctx.createRadialGradient(
                    explosion.x, explosion.y, 0,
                    explosion.x, explosion.y, currentRadius * 0.4
                );
                flashGradient.addColorStop(0, `rgba(255, 255, 255, ${flashAlpha})`);
                flashGradient.addColorStop(1, `rgba(150, 255, 150, 0)`); // Lighter green flash

                ctx.fillStyle = flashGradient;
                ctx.beginPath();
                ctx.arc(explosion.x, explosion.y, currentRadius * 0.4, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        });
    }

    draw() {
        const { game, mouse } = this.towersController;
        const towerSettings = settings.towers.plasma;

        // Draw range as donut (ring) when hovering
        if (mouse.isMouseOver(this.x, this.y, this.r) && game.stat('mode') !== 'dropTower') {
            game.drawer.donut(this.x, this.y, this.fireRange, this.minRange, 'rgba(255, 102, 0, 0.2)');
        }

        // Draw tower sprite or fallback circle
        if (towerSettings.images?.complete) {
            const helpers = require('../../helpers.js').default;
            helpers.drawSprite(towerSettings.images, this.level, this.x, this.y - 20);
        } else {
            // Fallback: draw circle
            game.drawer.circle(this.x, this.y, this.r, this.color, true);
        }

        // Draw tower-specific shooting effect
        this.drawShootingEffect();
    }
}

export default PlasmaCannon;