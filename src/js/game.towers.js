import game from './game';
import map from './game.map';
import mouse from './game.mouse';
import settings from './game.settings';
import mapEntities from './game.mapEntities';
import enemies from './game.enemies';
import helpers from './helpers';

export default {
    optionsModal: null,
    init: function () {
        let me = this;

        // DOM Element cachen
        this.optionsModal = document.querySelector('.modal-options');

        game.on('update', function () {
            me.update();
        });
        game.on('afterDraw', function () {
            me.draw();
        });
    },

    update: function () {
        let me = this,
            gridPosition = me.gridPosition(),
            bulletType = game.stat('selectedTowerType');

        if (game.stat('mode') === 'dropTower' && map.isValidTowerPlace(gridPosition.x, gridPosition.y, bulletType) && game.mouse.clicked) {
            game.stat('mode', '');
            this.create(gridPosition.x, gridPosition.y, bulletType);
        }
    },

    draw: function () {
        let me = this;

        if (game.stat('mode') === 'dropTower') {
            let gridPosition = me.gridPosition(),
                bulletType = game.stat('selectedTowerType');

            if (map.isValidTowerPlace(gridPosition.x, gridPosition.y, bulletType)) {
                // Wirkungsradius/Reichweite zeichnen
                game.drawCircle(gridPosition.x, gridPosition.y, settings.towers[bulletType].fireRange, 'rgba(0,0,255,0.2)', true);

                //game.drawCircle(gridPosition.x, gridPosition.y, game.settings.tower.size, game.settings.tower.color, true);
                helpers.drawSprite(settings.towers[bulletType].images, 0, gridPosition.x, gridPosition.y - 20, 160, 160);
            }
            else {
                game.drawCircle(gridPosition.x, gridPosition.y, settings.towers[bulletType].size, 'gray', true);
            }
        }

    },

    create: function (x, y, bulletType) {
        const me = this;
        const entity = this._createEntity(x, y, bulletType);

        entity.upgrade = this._entityUpgrade(entity, me);
        entity.update = this._entityUpdate(entity, me);
        entity.findClosestEnemy = this._entityFindClosestEnemy(entity);
        entity.shoot = this._entityShoot(entity);
        entity.draw = this._entityDraw(entity);

        return entity;
    },

    _createEntity: function(x, y, bulletType) {
        const tower = settings.towers[bulletType];
        const entity = mapEntities.create(x, y, tower.size, tower.color);

        entity.type = 'tower';
        entity.bullet = bulletType;
        entity.fireRange = tower.fireRange;
        entity.damage = tower.damage;
        entity.cooldownTime = tower.coolDownTime;
        entity.barell = {x: x, y: y - (5 + entity.r)};
        entity.audio = new Audio(tower.audio);
        entity.audio.volume = 0.3;
        entity.stats = {
            shoots: 0,
            dmg: 0,
            kills: 0,
        };
        entity.cooldownCounter = 0;
        entity.closestEnemy = false;

        return entity;
    },

    _entityUpgrade: function(entity, me) {
        return function() {
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
        };
    },

    _entityUpdate: function(entity, me) {
        return function () {
            entity.cooldownCounter--;

            // Prüfen ob der aktuelle Gegner noch gültig ist (in Reichweite und am Leben)
            if ( this.closestEnemy !== false ) {
                let enemyDistance = game.distance(this.x, this.y, this.closestEnemy.x, this.closestEnemy.y);
                if ( enemyDistance >= (this.fireRange + this.closestEnemy.r) || this.closestEnemy.health <= 0 ) {
                    this.closestEnemy = false;
                }
            }

            // Neuen Gegner suchen, falls kein gültiger Gegner vorhanden
            if ( this.closestEnemy === false ) {
                this.closestEnemy = this.findClosestEnemy();
            }

            // Gegner angreifen wenn vorhanden und Cooldown abgelaufen
            if ( this.closestEnemy !== false ) {
                this.closestEnemy.shoot = false;

                if ( entity.cooldownCounter <= 0 ) {
                    this.shoot(this.closestEnemy);
                    this.closestEnemy.shoot = true;

                    // Audio mit Error Handling (Browser Autoplay-Policies)
                    entity.audio.play().catch(() => {
                        // Audio playback wurde blockiert - ignorieren wir stillschweigend
                    });
                }
            }

            // zIndex für Rendering-Reihenfolge setzen
            entity.zIndex = 10;
            if (mouse.isMouseOver(this.x, this.y, this.r )) {
                entity.zIndex = 20;
            }

            // Turm-Optionen öffnen bei Klick
            if ( game.stat('mode') !== 'dropTower' && mouse.clicked && mouse.isMouseOver(this.x, this.y, this.r ) ) {
                me.openOptions(this);
            }
        };
    },

    _entityFindClosestEnemy: function(entity) {
        return function() {
            // Wähle den am weitesten fortgeschrittenen Gegner (höchster waypointIndex)
            // der in Reichweite ist
            let mostAdvancedEnemy = false;
            let highestWaypointIndex = -1;
            let shortestDistanceToWaypoint = Number.MAX_SAFE_INTEGER;

            for (let i in enemies.enemiesList) {
                let enemy = enemies.enemiesList[i];
                let distance = game.distance(this.x, this.y, enemy.x, enemy.y);

                // Nur Gegner in Reichweite berücksichtigen
                if (distance <= (this.fireRange + enemy.r)) {
                    // Wähle Gegner mit höherem waypointIndex
                    if (enemy.waypointIndex > highestWaypointIndex) {
                        highestWaypointIndex = enemy.waypointIndex;
                        mostAdvancedEnemy = enemy;
                        shortestDistanceToWaypoint = enemy.waypoint ?
                            game.distance(enemy.x, enemy.y, enemy.waypoint.x, enemy.waypoint.y) :
                            Number.MAX_SAFE_INTEGER;
                    }
                    // Bei gleichem waypointIndex: wähle den, der näher am nächsten Waypoint ist
                    else if (enemy.waypointIndex === highestWaypointIndex && enemy.waypoint) {
                        let distanceToWaypoint = game.distance(enemy.x, enemy.y, enemy.waypoint.x, enemy.waypoint.y);
                        if (distanceToWaypoint < shortestDistanceToWaypoint) {
                            mostAdvancedEnemy = enemy;
                            shortestDistanceToWaypoint = distanceToWaypoint;
                        }
                    }
                }
            }

            return mostAdvancedEnemy;
        };
    },

    _entityShoot: function(entity) {
        return function (enemy) {
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
    },

    _entityDraw: function(entity) {
        return function () {
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
    },

    gridPosition: function() {
        let x = ((Math.floor(game.mouse.x / settings.mapGrid)) * settings.mapGrid) + (settings.mapGrid / 2),
            y = ((Math.floor(game.mouse.y / settings.mapGrid)) * settings.mapGrid) + (settings.mapGrid / 2);

        return {x: x, y: y};
    },

    openOptions: function(tower) {
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
            this.optionsModal.querySelector('.tower-upgrade').classList.remove('is--hidden');

            game.output('#tower-upgrade-level', tower.level + 2);
            game.output('#tower-upgrade-cost', upgrade.cost);
            game.output('#tower-upgrade-fire-range', upgrade.fireRange);
            game.output('#tower-upgrade-damage-from', upgrade.damage.from);
            game.output('#tower-upgrade-damage-to', upgrade.damage.to);
            game.output('.modal-options .tower-upgrade-level', tower.level + 2);

            this.optionsModal.querySelector('.tower-buy-upgrade').onclick = function() {
                tower.upgrade();
            }
        } else {
            this.optionsModal.querySelector('.tower-upgrade').classList.add('is--hidden');
        }

        this.optionsModal.classList.add('is--open');

    },

    closeOptions: function() {
        this.optionsModal.classList.remove('is--open');
    }
};