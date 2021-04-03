import helpers from './helpers';
import game from './game';
import enemies from './game.enemies';
import mapEntities from './game.mapEntities';
import settings from './game.settings';
import map from './game.map';

export default {
    images: {
        irlicht:  helpers.createImage(require('/img/enemy/irlicht.png'), [
            { x: 0, y: 0, w: 20, h: 20, frames: [0,40,80,120,160,200]},
            { x: 0, y: 40, w: 20, h: 20, frames: [0,40,80,120,160,200] },
            { x: 0, y: 80, w: 20, h: 20, frames: [0,40,80,120,160,200] },
            { x: 0, y: 120, w: 20, h: 20, frames: [0,40,80,120,160,200] }
        ]),
        bug:  helpers.createImage(require('/img/enemy/bug.png'), [
            { x: 0, y: 0, w: 20, h: 20 },
            { x: 40, y: 0, w: 20, h: 20 },
            { x: 80, y: 0, w: 20, h: 20 },
            { x: 120, y: 0, w: 20, h: 20 }
        ])
    },
    enemiesList: [],
    init: function () {
        let self = this;
        game.on('update', function () {
            self.update();
        });
    },
    update: function () {
        for (let i = this.enemiesList.length - 1; i >= 0; i--)
            if (this.enemiesList[i].deleted === true) this.remove(i);
    },
    remove: function (index) {
        mapEntities.remove(this.enemiesList[index].id);
        this.enemiesList.splice(index, 1);
    },
    create: function (level, wave) {
        let shift = Math.round(Math.random() * 40) - 10,
            me = this,
            entity = mapEntities.create(0, 0, 10, 'red');

        entity.waypointIndex = 0;
        entity.waypoint = {};

        entity.shift = shift;
        entity.velocity = {x: 0, y: 0};

        if (!settings.enemyLevels[level]) level = game.settings.enemyLevels.length - 1;

        let enemySettings = settings.enemyLevels[level];
        entity.level = level;
        entity.wave = wave;
        entity.speed = enemySettings.speed;
        entity.health = enemySettings.health;
        entity.maxHealth = enemySettings.health;
        entity.color = enemySettings.color;
        entity.direction = 0;
        entity.frame = 0;
        entity.enemyType = 'irlicht';

        entity.deleted = false;

        entity.nextWaypoint = function () {
            if (!this.waypoint.x) {
                // Waypoint Objekt kopieren
                this.waypoint = Object.assign({}, map.waypoints[this.waypointIndex]);
                // Versatz aufaddieren
                this.waypoint.x += this.shift;
                this.waypoint.y += this.shift;
                // Position übernehmen
                this.x = this.waypoint.x;
                this.y = this.waypoint.y;
            }

            // Den alten Wegpunkt für den späteren Vergleich merken.
            let oldX = this.waypoint.x,
                oldY = this.waypoint.y;

            // Den nächsten Wegpunkt ansteuern
            this.waypointIndex++;
            if (!map.waypoints[this.waypointIndex]) return false;
            this.waypoint = Object.assign({}, map.waypoints[this.waypointIndex]);

            // Versatz aufaddieren
            this.waypoint.x += this.shift;
            this.waypoint.y += this.shift;

            // Bewegungsernergie setzen
            if (oldX === this.waypoint.x) {
                this.velocity.x = 0;
            } else {
                this.velocity.x = (this.x < this.waypoint.x ? entity.speed : -entity.speed);
            }

            if (oldY === this.waypoint.y) {
                this.velocity.y = 0;
            } else {
                this.velocity.y = (this.y < this.waypoint.y ? entity.speed : -entity.speed);
            }

            // Richtung setzen
            if ( this.velocity.y < 0 && this.velocity.x === 0 ) {
                this.direction = 0;
            } else if ( this.velocity.x > 0 && this.velocity.y === 0 ) {
                this.direction = 1;
            } else if ( this.velocity.y > 0 && this.velocity.x === 0 ) {
                this.direction = 2;
            } else if ( this.velocity.x < 0 && this.velocity.y === 0 ) {
                this.direction = 3;
            }

            return true;
        };

        entity.waypointReached = function () {
            return (
                (this.velocity.x > 0 && this.x >= this.waypoint.x)
                || (this.velocity.x < 0 && this.x <= this.waypoint.x)
                || (this.velocity.y > 0 && this.y >= this.waypoint.y)
                || (this.velocity.y < 0 && this.y <= this.waypoint.y)
            );
        };

        entity.update = function () {
            if (this.deleted === true) return;
            if (this.health <= 0) {
                return this.die();
            }

            if (this.waypointReached()) {
                if (!this.nextWaypoint())
                    return this.done();
            } else {
                this.x += this.velocity.x;
                this.y += this.velocity.y;
            }

            // Animation
            this.frame += 0.2;
            if ( this.frame >= enemies.images[this.enemyType].sprites[this.direction].frames.length ) {
                this.frame = 0;
            }

        };

        entity.draw = function () {
            // Den Gegner zeichnen
            helpers.drawAnimatedSprite(me.images.irlicht, this.direction, this.frame, Math.round(this.x), Math.round(this.y), 40, 40);

            // Zeichne den Lebensbalken
            let  healthPercent = this.health / this.maxHealth;

            if ( healthPercent < 1 ) {
                let healthBar = {
                    x: this.x - this.r,
                    y: this.y - this.r - 5,
                    width: this.r * 2,
                    height: 3
                };
                game.ctx.fillStyle = "black";
                game.ctx.fillRect(healthBar.x, healthBar.y, healthBar.width, healthBar.height);

                game.ctx.fillStyle = "green";
                game.ctx.fillRect(healthBar.x, healthBar.y, healthBar.width * healthPercent, healthBar.height);
            }


        };

        entity.die = function () {
            this.health = 0;
            this.deleted = true;

            game.stat('coins', game.stat('coins') + enemies.calculateReward(entity.level), true);

            // Wir überprüfen ob dies der letzte Gegner der Welle ist und vergeben Bonus Coins
            let waveLastBonus = true;
            for ( let id in enemies.enemiesList ) {
                let enemy = enemies.enemiesList[id];
                if ( enemy.wave === entity.wave && !enemy.deleted ) {
                    waveLastBonus = false;
                }
            }

            //if (waveLastBonus) game.stat('coins', game.stat('coins') + entity.wave, true);

            return this;
        };

        entity.done = function () {
            this.deleted = true;
            let life = game.stat('life');
            life -= 1;
            if (life <= 0) {
                game.resetGame();
                alert('Du hast verloren!');
            } else {
                game.stat('life', life, true);
            }

            return this;
        };

        entity.damage = function (damage) {
            this.health -= damage;
            if (this.health <= 0 && !this.deleted) this.die();
        };

        // Zum nächsten Waypoint laufen
        entity.nextWaypoint();
        this.enemiesList.push(entity);

        return entity;
    },
    calculateReward: function(level) {
        let base = settings.enemyLevels[0],
            enemy = settings.enemyLevels[level];

        return Math.round((enemy.health / base.health) * (enemy.speed / base.speed)) + 4;
    }
};