import helpers from '../helpers';
import settings from '../game.settings';
import backgroundImage from '../../img/background.png';

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
            background: helpers.createImage(backgroundImage)
        };

        // Init logic
        this.game.on('update', () => this.update());
        this.game.on('beforeDraw', () => this.draw());
    }

    update() {
    }

    draw() {
        // Rahmen und das Canvas herumziehen um die Ausmaße besser zu erkennen
        this.game.ctx.drawImage(this.images.background,0,0,this.game.canvas.width,this.game.canvas.height);

        // Game Raster
        this.grid(settings.mapGrid);
    }

    isValidTowerPlace(x, y, bulletType) {
        const r = {
            left: x - settings.towers[bulletType].size,
            top: y - settings.towers[bulletType].size,
            right: x + settings.towers[bulletType].size,
            bottom: y + settings.towers[bulletType].size,
        };

        for (let i = 0; i < this.waypoints.length - 1; i++) {
            let x1 = Math.min(this.waypoints[i + 1].x, this.waypoints[i].x),
                y1 = Math.min(this.waypoints[i + 1].y, this.waypoints[i].y),
                x2 = Math.max(this.waypoints[i + 1].x, this.waypoints[i].x),
                y2 = Math.max(this.waypoints[i + 1].y, this.waypoints[i].y),
                width = (x2 - x1) + 80,
                height = (y2 - y1) + 80;

            x1 -= 40;
            y1 -= 40;
            x2 = x1 + width;
            y2 = y1 + height;

            let r2 = {
                left: x1,
                top: y1,
                right: x2,
                bottom: y2
            };

            if (this.game.intersectRect(r, r2)) return false;
        }

        for ( let id in this.mapEntities.list ) {
            let entity = this.mapEntities.list[id];
            if ( entity.type === 'tower' && this.game.distance(entity.x, entity.y, x, y) <= settings.towers[bulletType].size * 2) {
                return false;
            }
        }

        return true;
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