import helpers from '../helpers';
import settings from '../game.settings';
import backLayerImage from '../../img/backlayer.png';
import frontLayerImage from '../../img/frontlayer.png';

class MapController {
    constructor(game, mapEntities) {
        this.game = game;
        this.mapEntities = mapEntities;
        this.waypoints = [
            {x: 0, y: 120},
            {x: 120, y: 120},
            {x: 120, y: 360},
            {x: 360, y: 360},
            {x: 360, y: 200},
            {x: 520, y: 200},
            {x: 520, y: 520},
            {x: 680, y: 520},
            {x: 680, y: 280},
            {x: 800, y: 280},
            {x: 920, y: 280},
            {x: 920, y: 200},
            {x: 1200, y: 200},
        ];
        this.images = {
            background: helpers.createImage(backLayerImage),
            frontLayer: helpers.createImage(frontLayerImage),
        };

        // Init logic
        this.game.on('update', () => this.update());
        this.game.on('beforeDraw', () => this.beforeDraw());
        this.game.on('afterDraw', () => this.afterDraw());
    }

    update() {
    }

    beforeDraw() {
        this.game.ctx.drawImage(this.images.background,0,0,this.game.canvas.width,this.game.canvas.height);

        // Game grid
        this.grid(settings.mapGrid);
    }

    afterDraw() {
        this.game.ctx.drawImage(this.images.frontLayer,0,0,this.game.canvas.width,this.game.canvas.height);
    }

    isValidTowerPlace(x, y) {
        const distanceToPath = this.distanceToPath(x, y);

        // Tower is ON the path (too close to path centerline)
        if (distanceToPath <= settings.mapGrid / 2) return false;

        // Tower position already occupied
        if (this.isTowerAtPosition(x, y)) return false;

        // Tower must be adjacent to path (within diagonal distance)
        return distanceToPath <= Math.sqrt(2) * settings.mapGrid;
    }

    distanceToPath(x, y) {
        // Returns the minimum distance from point (x, y) to any path segment
        return this.getClosestPointOnPath(x, y).distance;
    }

    getClosestPointOnPath(x, y) {
        // Returns the closest point on the path and its distance
        let minDistance = Infinity;
        let closestPoint = null;

        for (let i = 0; i < this.waypoints.length - 1; i++) {
            const x1 = this.waypoints[i].x;
            const y1 = this.waypoints[i].y;
            const x2 = this.waypoints[i + 1].x;
            const y2 = this.waypoints[i + 1].y;

            // Calculate distance to this line segment
            const dx = x2 - x1;
            const dy = y2 - y1;
            const lengthSquared = dx * dx + dy * dy;

            // Calculate projection of point onto the line (clamped to segment)
            let t = ((x - x1) * dx + (y - y1) * dy) / lengthSquared;
            t = Math.max(0, Math.min(1, t)); // Clamp to [0, 1]

            // Find the closest point on the segment
            const segmentClosestX = x1 + t * dx;
            const segmentClosestY = y1 + t * dy;

            const distance = this.game.distance(x, y, segmentClosestX, segmentClosestY);

            if (distance < minDistance) {
                minDistance = distance;
                closestPoint = { x: segmentClosestX, y: segmentClosestY };
            }
        }

        return {
            x: closestPoint?.x ?? this.waypoints[0].x,
            y: closestPoint?.y ?? this.waypoints[0].y,
            distance: minDistance
        };
    }

    isTowerAtPosition(x, y) {
        for (let id in this.mapEntities.list) {
            let entity = this.mapEntities.list[id];
            if (entity.type === 'tower' && entity.x === x && entity.y === y) {
                return true;
            }
        }
        return false;
    }

    grid(gap) {
        // Horizontale Linie
        this.game.ctx.beginPath();
        this.game.ctx.strokeStyle = '#ffffff22';
        this.game.ctx.lineWidth = 1;
        for ( let y = gap; y < this.game.canvas.height; y += gap ) {
            this.game.ctx.moveTo(0, y);
            this.game.ctx.lineTo( this.game.canvas.width, y);
        }

        // Verticale Linie
        for ( let x = gap; x < this.game.canvas.width; x += gap ) {
            this.game.ctx.moveTo(x, 0);
            this.game.ctx.lineTo( x, this.game.canvas.height);
        }
        this.game.ctx.stroke();
    }
}
export default MapController;