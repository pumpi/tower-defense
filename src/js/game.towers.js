import game from './game';
import map from './game.map';
import mouse from './game.mouse';
import settings from './game.settings';
import mapEntities from './game.mapEntities';
import enemies from './game.enemies';
import helpers from './helpers';

export default {
    init: function () {
        let me = this;
        game.on('update', function () {
            me.update();
        });
        game.on('afterDraw', function () {
            me.draw();
        });
    },
    update: function () {
        let me = this,
            gridPosition = me.gridPosition();

        if (game.stat('mode') === 'dropTower' && map.isValidTowerPlace(gridPosition.x, gridPosition.y) && game.mouse.clicked) {
            game.stat('mode', '');
            this.create(gridPosition.x, gridPosition.y);
        }
    },
    draw: function () {
        let me = this;

        if (game.stat('mode') === 'dropTower') {
            let gridPosition = me.gridPosition();

            // TODO We can buy some types of towers in future
            let bullet = 'laser'

            if (map.isValidTowerPlace(gridPosition.x, gridPosition.y)) {
                // Wirkungsradius/Reichweite zeichnen
                game.drawCircle(gridPosition.x, gridPosition.y, settings.towers[bullet].fireRange, 'rgba(0,0,255,0.2)', true);

                //game.drawCircle(gridPosition.x, gridPosition.y, game.settings.tower.size, game.settings.tower.color, true);
                helpers.drawSprite(settings.towers[bullet].images, 0, gridPosition.x, gridPosition.y - 20, 160, 160);
            }
            else {
                game.drawCircle(gridPosition.x, gridPosition.y, settings.towers[bullet].size, 'gray', true);
            }
        }

    },
    create: function (x, y) {
        // TODO We can buy some types of towers in future
        let bullet = 'laser'

        let me = this,
            tower = settings.towers[bullet],
            entity = mapEntities.create(x, y, tower.size, tower.color);

        entity.type = 'tower';
        entity.bullet = bullet;

        entity.fireRange = tower.fireRange;
        entity.damage = tower.damage;
        entity.cooldownTime = tower.coolDownTime;
        entity.barell = {x: x, y: y - (5 + entity.r)}
        entity.audio = new Audio(tower.audio);
        entity.audio.volume = 0.3;

        // Turm Statistik Daten
        entity.stats = {
            shoots: 0,
            dmg: 0,
            kills: 0,
        }

        entity.cooldownCounter = 0;
        entity.closestEnemy = false;

        entity.upgrade = function() {
            let coins = game.stat('coins'),
                upgrade = settings.towers[entity.bullet].upgrades[entity.level];

            if ( upgrade && coins >= upgrade.cost ) {

                // Upgrade bezahlen
                game.stat('coins', coins - upgrade.cost, true);

                // Upgrade ausführen
                entity.damage = upgrade.damage;
                entity.fireRange = upgrade.fireRange;
                entity.level ++;
                entity.color = upgrade.color;

                me.closeOptions();
            }
        }

        entity.update = function () {
            entity.cooldownCounter--;

            // Prüfen ob der aktuelle Gegner noch im Reichweite ist oder tot ist
            if ( this.closestEnemy !== false ) {
                let newEnemyDistance = game.distance(this.x, this.y, this.closestEnemy.x, this.closestEnemy.y);

                if ( newEnemyDistance >= (this.fireRange + this.closestEnemy.r) || this.closestEnemy.health <= 0 ) {
                    this.closestEnemy = false;
                }
            }

            if ( this.closestEnemy === false ) {

                let closestDistance = Number.MAX_SAFE_INTEGER;
                for (let i in enemies.enemiesList) {
                    let enemy = enemies.enemiesList[i];
                    let distance = game.distance(this.x, this.y, enemy.x, enemy.y);
                    if (distance < closestDistance && distance <= (this.fireRange + enemy.r)) {
                        closestDistance = distance;
                        this.closestEnemy = enemy;
                    }
                }
            }

            if ( this.closestEnemy !== false ) {
                this.closestEnemy.shoot = false;
            }

            if ( this.closestEnemy !== false && entity.cooldownCounter <= 0) {
                this.shoot(this.closestEnemy);
                this.closestEnemy.shoot = true;
                entity.audio.play();
            }

            // Wenn man den Turm Hoverst soll sich der zIndex erhöhen
            entity.zIndex = 10;
            if (mouse.isMouseOver(this.x, this.y, this.r )) {
                entity.zIndex = 100;
            }

            if ( game.stat('mode') !== 'dropTower' && mouse.clicked && mouse.isMouseOver(this.x, this.y, this.r ) ) {
                me.openOptions(this);
            }
        };

        entity.shoot = function (enemy) {
            // DMG Range berechnen
            let damage = Math.floor(Math.random() * (this.damage.to - this.damage.from + 1) + this.damage.from) ;

            // Zählt die abgegebenen Shüsse
            this.stats.shoots += 1;

            // Zählt den gemachten Schaden
            this.stats.dmg += damage;
            enemy.damage(damage);

            // Zählt die getöteten Gegner
            if ( enemy.deleted ) {
                this.stats.kills += 1;
            }

            this.cooldownCounter = this.cooldownTime;
        };

        entity.draw = function () {
            // Wirkungsradius/Reichweite zeichnen
            if (game.stat('mode') !== 'dropTower' && mouse.isMouseOver(this.x, this.y, this.r )) {
                game.drawCircle(this.x, this.y, this.fireRange, 'rgba(0,0,255,0.2)', true);
            }

            // Den Turm zeichnen
            helpers.drawSprite(settings.towers[entity.bullet].images, entity.level, entity.x, entity.y - 20, 160, 160);

            if ( this.closestEnemy ) {
                let eDistance = game.distance(this.x, this.y, this.closestEnemy.x, this.closestEnemy.y);

                // Neue Turm Ausrichtung berechnen
                let dRatio = (5 + this.r) / eDistance;
                this.barell.x = this.x + dRatio * (this.closestEnemy.x - this.x);
                this.barell.y = this.y + dRatio * (this.closestEnemy.y - this.y);
            }


            game.ctx.save();

            // Schuss darstellen
            if ( this.closestEnemy?.shoot ) {
                game.ctx.beginPath();
                game.ctx.strokeStyle = entity.color;
                game.ctx.lineWidth = 2;
                game.ctx.moveTo(this.x, this.y - 50);
                game.ctx.lineTo(this.closestEnemy.x, this.closestEnemy.y);
                game.ctx.stroke();
            }

            // Turm Ausrichtung darstellen
            // game.ctx.beginPath();
            // game.ctx.strokeStyle = 'black';
            // game.ctx.lineWidth = 5;
            // game.ctx.moveTo(this.x, this.y);
            // game.ctx.lineTo(this.barell.x, this.barell.y);
            // game.ctx.stroke();

            game.ctx.restore();

        };
        return entity;
    },
    gridPosition: function() {
        let x = ((Math.floor(game.mouse.x / settings.mapGrid)) * settings.mapGrid) + (settings.mapGrid / 2),
            y = ((Math.floor(game.mouse.y / settings.mapGrid)) * settings.mapGrid) + (settings.mapGrid / 2);

        return {x: x, y: y};
    },
    drawTower: function(bullet, x, y, level) {
        let image = this.images[bullet];
        //console.log('before onload');
        game.ctx.drawImage(image, 0, level * 160, image.width, image.width, x - 40, y - 60, 80, 80);
    },
    openOptions: function(tower) {
        let optionsModal = document.querySelector('.modal-options');

        game.output('#tower-position-x', tower.x);
        game.output('#tower-position-y', tower.y);
        game.output('#tower-level', tower.level +1);
        game.output('#tower-fire-range', tower.fireRange);
        game.output('#tower-cooldown-time', tower.cooldownTime);
        game.output('#tower-damage-from', tower.damage.from);
        game.output('#tower-damage-to', tower.damage.to);
        game.output('#tower-stats-shoots', tower.stats.shoots);
        game.output('#tower-stats-damage', tower.stats.dmg);
        game.output('#tower-stats-kills', tower.stats.kills);

        let upgrade = settings.towers[tower.bullet].upgrades[tower.level];
        if ( upgrade ) {
            optionsModal.querySelector('.tower-upgrade').classList.remove('is--hidden');

            game.output('#tower-upgrade-level', tower.level + 2);
            game.output('#tower-upgrade-cost', upgrade.cost);
            game.output('#tower-upgrade-fire-range', upgrade.fireRange);
            game.output('#tower-upgrade-damage-from', upgrade.damage.from);
            game.output('#tower-upgrade-damage-to', upgrade.damage.to);
            game.output('.modal-options .tower-upgrade-level', tower.level + 2);

            optionsModal.querySelector('.tower-buy-upgrade').onclick = function() {
                tower.upgrade();
            }
        } else {
            optionsModal.querySelector('.tower-upgrade').classList.add('is--hidden');
        }

        optionsModal.classList.add('is--open');

    }
};