import helpers from './helpers';
import game from './game';
import settings from './game.settings';
import mapEntities from './game.mapEntities'

export default {
    waypoints: [
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
    ],
    images: {
        background: helpers.createImage(require('/img/background.png'))
    },
    init: function () {
        var self = this;
        game.on('update', function () {
            self.update();
        });
        game.on('beforeDraw', function () {
            self.draw();
        });
    },
    update: function () {
    },
    draw: function () {
        // Rahmen und das Canvas herumziehen um die Ausmaße besser zu erkennen
        game.ctx.drawImage(this.images.background,0,0,game.canvas.width,game.canvas.height);

        // Game Raster
        this.grid(settings.mapGrid);

        // game.ctx.save();
        // game.ctx.beginPath();
        // game.ctx.strokeStyle = 'rgb(170,170,170)';
        // game.ctx.lineWidth = settings.mapGrid;
        // game.ctx.moveTo(map.waypoints[0].x, map.waypoints[0].y);
        // for (let i = 1; i < map.waypoints.length; i++)
        //     game.ctx.lineTo(map.waypoints[i].x, map.waypoints[i].y);
        // game.ctx.stroke();
        //
        // game.ctx.restore();
    },
    isValidTowerPlace: function (x, y) {
        let me = this;

        // TODO We can buy some types of towers in future
        let bullet = 'laser'

        let r = {
            left: x - settings.towers[bullet].size,
            top: y - settings.towers[bullet].size,
            right: x + settings.towers[bullet].size,
            bottom: y + settings.towers[bullet].size,
        };

        for (let i = 0; i < me.waypoints.length - 1; i++) {
            let x1 = Math.min(me.waypoints[i + 1].x, me.waypoints[i].x);
            let y1 = Math.min(me.waypoints[i + 1].y, me.waypoints[i].y);

            let x2 = Math.max(me.waypoints[i + 1].x, me.waypoints[i].x);
            let y2 = Math.max(me.waypoints[i + 1].y, me.waypoints[i].y);

            let width = (x2 - x1) + 80;
            let height = (y2 - y1) + 80;

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
            if (game.intersectRect(r, r2)) return false;
        }

        for ( let id in mapEntities.list ) {
            let entity = mapEntities.list[id];
            if ( entity.type === 'tower' && game.distance(entity.x, entity.y, x, y) <= settings.towers[bullet].size * 2) {
                return false;
            }
        }

        return true;
    },
    grid: function(gap) {

        // Horizontale Linie
        game.ctx.beginPath();
        game.ctx.strokeStyle = '#ffffff22';
        game.ctx.lineWidth = 1;
        for ( let y = gap; y < game.canvas.height; y += gap ) {
            game.ctx.moveTo(0, y);
            game.ctx.lineTo( game.canvas.width, y);
        }

        // Verticale Linie
        for ( let x = gap; x < game.canvas.width; x += gap ) {
            game.ctx.moveTo(x, 0);
            game.ctx.lineTo( x, game.canvas.height);

        }
        game.ctx.stroke();
    }
};