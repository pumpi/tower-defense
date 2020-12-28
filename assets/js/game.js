game = {
    settings: {
        playerLifes: 10,			// Lebenspunkte des Spielers

        tower: {
            costs: 20,		// Kosten für einen Tower (in Coins)
            color: 'blue',	// Farbe der Türme (ist fix)
            size: 20,		// Größe der Türme (fixer Radius)
            fireRange: 100,		// Anfängliche Reichweite eines Turms (kann per Upgrade für alle Türme erhöht werden)
            damage: 1,		// Anfänglicher Schaden den ein Turm bewirkt (kann per Upgrade für alle Türme erhöht werden)
            cooldownTime: 18,		// Anfängliche Schussverzögerung eines Turms (kann per Upgrade für alle Türme erhöht werden)
        },

        towerUpgrades: {
            fireRange: {costs: 50, amount: 10},
            cooldownTime: {costs: 25, amount: -1},
            damage: {costs: 50, amount: 1},
        },

        enemyMinSize: 3,
        enemyLevelIncAt: 15,
        enemyLevels: [
            {speed: 6, health: 1, color: 'rgb(250,0,0)'},
            {speed: 5, health: 2, color: 'rgb(200,0,0)'},
            {speed: 6, health: 3, color: 'rgb(150,0,0)'},
            {speed: 7, health: 4, color: 'rgb(100,0,0)'},
            {speed: 8, health: 5, color: 'rgb(50,0,0)'},
            {speed: 8, health: 6, color: 'rgb(30,30,30)'},
            {speed: 9, health: 7, color: 'rgb(15,15,15)'},
            {speed: 11, health: 10, color: 'rgb(0,0,0)'}, // <== Endgegner
        ],
    },

    canvas: false,		// Das Canvas Element. Hierüber erhalten wir die aktuelle Breite und Höhe des Canvas.
    ctx: false,		// Der Kontext über den wir auf dem Canvas zeichnen können.
    drawList: [],			// In dieser Liste werden alle zu zeichnenden Objekte gesammelt. Nach jedem "draw()"-Durchlauf ist die Liste leer und muss neu befüllt werden.

    // Hier werden das Spiel und alle Spielelemente initialisiert.
    init: function () {
        var self = this;

        // Das Canvas-Element brauchen wir noch öfter
        this.canvas = document.getElementById('canvas');

        // Den 2D-Kontext merken wir uns in der game.ctx Variable.
        this.ctx = this.canvas.getContext("2d");

        // Alle Erweiterungen initialisieren
        game.map.init();
        game.mapEntities.init();
        game.enemies.init();
        game.towers.init();
        game.mouse.init();

        // Einmalig schreiben wir in die Buttons die Kosten
        this.output('towerCosts', this.settings.tower.costs);
        this.output('fireRangeCosts', this.settings.towerUpgrades.fireRange.costs);
        this.output('cooldownTimeCosts', this.settings.towerUpgrades.cooldownTime.costs);
        this.output('damageCosts', this.settings.towerUpgrades.damage.costs);

        // Alle Werte zurück setzen
        game.resetGame();

        // 30 mal in der Sekunde aktualisieren wir alle Objekte
        setInterval(self.update, 1000 / 30);

        // Die "draw"-Schleife anstoßen
        this.draw();
    },
    // Setzt alle Werte zurück. Diese Methode kann zur Initialisierung und zum Resetten verwendet werden.
    resetGame: function () {
        // Wir fangen wieder mit der ersten Welle an
        this.waveCounter = 0;
        // Alle bestehenden Entitäten entfernen
        game.mapEntities.list = {};
        // Anfangswerte setzen
        this.stat('life', game.settings.playerLifes, true);		// Leben des Spielers
        this.stat('coins', 2 * game.settings.tower.costs, true);	// Genügend Coins für die ersten beiden Türme
        this.stat('wave', 0, true);								// Wir setzen initial die Welle auf 0. Mit Aufruf von "nextWave()" wird der Wert erhöht.
        this.stat('fireRange', game.settings.tower.fireRange);			// Reichweite zurücksetzen
        this.stat('damage', game.settings.tower.damage);			// Schadenswert zurücksetzen
        this.stat('cooldownTime', game.settings.tower.cooldownTime);		// Schussverzögerung zurücksetzen
    },
    buyTower: function () {
        if (game.stat('mode') != 'dropTower') {
            var coins = game.stat('coins');
            if (coins >= game.settings.tower.costs) {
                game.stat('mode', 'dropTower');
                game.stat('coins', coins - game.settings.tower.costs, true);
            }
        }
    },
    buyTowerUpgrade: function (what) {
        var coins = game.stat('coins');
        var upgrade = game.settings.towerUpgrades[what];
        if (coins >= upgrade.costs) {
            this.stat(what, this.stat(what) + upgrade.amount);
            if (this.stat(what) < 1) {
                this.stat(what, 1);
                return;
            }

            for (id in game.mapEntities.list) {
                if (game.mapEntities.list[id].type == 'tower') {
                    game.mapEntities.list[id][what] += upgrade.amount;
                }
            }

            // nach dem kauf wird es doppelt so teuer
            game.stat('coins', coins - upgrade.costs, true);
            game.settings.towerUpgrades[what].costs = upgrade.costs * 2;
            game.output(what + 'Costs', game.settings.towerUpgrades[what].costs);
            console.log(game.settings.towerUpgrades[what].costs);
        }
    },
    update: function () {
        game.trigger('update');
    },
    draw: function () {
        // Animation Frame anfordern
        window.requestAnimationFrame(game.draw);
        // Canvas leeren
        game.ctx.clearRect(0, 0, game.canvas.width, game.canvas.height);

        // Event triggern so das alle zu zeichnenden Objekte zur Liste "drawList"
        // hinzugefügt werden können.git add
        // Jedes Objekt, das dieser Liste hinzugefügt wird, benötigt die Eigenschaft "y"
        // und die Methode "draw()" damit es sortiert und zum richtigen Zeitpunkt gezeichnet werden kann.
        game.trigger('draw');

        // Die Liste mit den zu zeichnenden Objekten vorsortieren
        // damit die weiter oben angesetzten Objekte hinter den Vorderen liegen.
        //OLD: game.drawList.sort(function(a,b){ return (a.y > b.y); });
        game._sortByY.apply(game, ['drawList']);

        // Für jedes Element der Liste rufen wir die Methode "draw()" auf.
        // Diese Methode regelt die Darstellung des Objekts.
        for (let i = game.drawList.length - 1; i >= 0; i--) {
            game.drawList.splice(i, 1)[0].draw();
        }
    },
    // Spielstati
    stats: {},
    stat: function (name, value, output) {
        if (value === undefined) return this.stats[name] || false;
        this.stats[name] = value;
        if (output !== undefined) this.output(name, value);
        return this;
    },
    // Ausgabe
    output: function (id, value) {
        document.getElementById(id).innerHTML = value;
    },
    // Die Distanz zwischen zwei Punkten
    distance: function (x1, y1, x2, y2) {
        var a = x1 - x2;
        var b = y1 - y2;
        return Math.sqrt(a * a + b * b);
    },
    intersectRect: function (r1, r2) {
        return !(r2.left > r1.right ||
            r2.right < r1.left ||
            r2.top > r1.bottom ||
            r2.bottom < r1.top);
    },
    drawCircle: function (x, y, r, color, fill = true) {
        // Zunächst öffnen wir einen Pfad..
        game.ctx.beginPath();
        // .. zeichnen einen Bogen der mit 2*PI Umfang zu einem ganzen Kreis wird..
        game.ctx.arc(x, y, r, 0, 2 * Math.PI);
        if (fill === true) {
            // ..setzen eine Füllfarbe..
            game.ctx.fillStyle = color;
            // .. und füllen diesen Bereich mit der vorher festgelegten Farbe
            game.ctx.fill();
        } else {
            game.ctx.strokeStyle = color;
            game.ctx.stroke();
        }
    },
    // Waves
    waveCounter: 0,
    nextWave: function () {
        // Es muss mindestens ein Turm existieren
        if (Object.keys(game.mapEntities.list).length == 0) return this;
        //if (this.stat('mode')!='nextWave') return this;
        this.waveCounter++;
        this.stat('wave', this.waveCounter, true);
        var delay = Math.round(1000 / this.waveCounter);
        var level = Math.floor(this.waveCounter / this.settings.enemyLevelIncAt);
        for (let i = 0; i < this.waveCounter; i++) {
            setTimeout(function () {
                game.enemies.create(level);
            }, i * delay);
        }

        return this;
    },
    // Events
    eventsList: {},
    on: function (event, fn) {
        if (!this.eventsList[event]) this.eventsList[event] = [];
        this.eventsList[event].push(fn);
        return this;
    },
    trigger: function (event) {
        if (!this.eventsList[event]) return this;
        for (let i = 0; i < this.eventsList[event].length; i++) {
            this.eventsList[event][i]();
        }

        return this;
    },
    _sortByY: function (listIndex) {
        // Die Liste mit den zu zeichnenden Objekten vorsortieren
        // damit die weiter oben angesetzten Objekte hinter den Vorderen liegen.
        this[listIndex].sort(function (a, b) {
            return (a.y < b.y);
        });
    }
};

game.map = {
    waypoints: [
        {x: 0, y: 100},
        {x: 100, y: 100},
        {x: 100, y: 300},
        {x: 300, y: 300},
        {x: 300, y: 100},
        {x: 500, y: 100},
        {x: 500, y: 500},
        {x: 700, y: 500},
        {x: 700, y: 400},
        {x: 800, y: 400},
    ],
    init: function () {
        var self = this;
        game.on('update', function () {
            self.update();
        });
        game.on('draw', function () {
            self.draw();
        });
    },
    update: function () {
    },
    draw: function () {
        // Rahmen und das Canvas herumziehen um die Ausmaße besser zu erkennen

        game.ctx.fillStyle = 'rgb(100,100,100)';
        game.ctx.fillRect(0, 0, game.canvas.width, game.canvas.height);

        game.ctx.save();
        game.ctx.beginPath();
        game.ctx.strokeStyle = 'rgb(170,170,170)';
        game.ctx.lineWidth = 80;
        game.ctx.moveTo(game.map.waypoints[0].x, game.map.waypoints[0].y);
        for (let i = 1; i < game.map.waypoints.length; i++)
            game.ctx.lineTo(game.map.waypoints[i].x, game.map.waypoints[i].y);
        game.ctx.stroke();

        game.ctx.restore();
    },
    isValidTowerPlace: function (x, y) {
        let r = {
            left: x - game.settings.tower.size,
            top: y - game.settings.tower.size,
            right: x + game.settings.tower.size,
            bottom: y + game.settings.tower.size,
        };

        for (let i = 0; i < game.map.waypoints.length - 1; i++) {
            let x1 = Math.min(game.map.waypoints[i + 1].x, game.map.waypoints[i].x);
            let y1 = Math.min(game.map.waypoints[i + 1].y, game.map.waypoints[i].y);

            let x2 = Math.max(game.map.waypoints[i + 1].x, game.map.waypoints[i].x);
            let y2 = Math.max(game.map.waypoints[i + 1].y, game.map.waypoints[i].y);

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

        return true;
    },
};

game.mouse = {
    x: 0,
    y: 0,
    clicked: false,
    // Initialisiert die Maus
    init: function () {
        // Update Event registrieren
        game.on('update', function () {
            game.mouse.update();
        });

        // Mausbewegung
        game.canvas.addEventListener('mousemove', game.mouse.onMove);
        game.canvas.addEventListener("click", game.mouse.onClick);
    },
    update: function () {
        game.mouse.clicked = false;
    },
    onMove: function (e) {
        // Mausposition merken
        game.mouse.x = e.offsetX;
        game.mouse.y = e.offsetY;
    },
    onClick: function (e) {
        game.mouse.clicked = true;
    },
    isMouseOver: function (x, y, radius) {

        return Math.round(Math.sqrt(Math.pow(game.mouse.x - x, 2) + Math.pow(game.mouse.y - y, 2))) <= radius;
    }
};

game.towers = {

    init: function () {
        var self = this;
        game.on('update', function () {
            self.update();
        });
        game.on('draw', function () {
            self.draw();
        });
    },
    update: function () {
        if (game.stat('mode') == 'dropTower' && game.map.isValidTowerPlace(game.mouse.x, game.mouse.y) && game.mouse.clicked) {
            game.stat('mode', '');
            this.create(game.mouse.x, game.mouse.y);
        }

    },
    draw: function () {
        if (game.stat('mode') == 'dropTower') {

            if (game.map.isValidTowerPlace(game.mouse.x, game.mouse.y))
                game.drawCircle(game.mouse.x, game.mouse.y, game.settings.tower.size, game.settings.tower.color, true);
            else
                game.drawCircle(game.mouse.x, game.mouse.y, game.settings.tower.size, 'gray', true);

            // Wirkungsradius/Reichweite zeichnen
            game.drawCircle(game.mouse.x, game.mouse.y, game.stat('fireRange'), 'rgba(0,0,255,0.2)', true);
        }

    },
    create: function (x, y) {
        let self = this,
            entity = game.mapEntities.create(x, y, game.settings.tower.size, game.settings.tower.color);

        entity.type = 'tower';

        entity.fireRange = game.stat('fireRange');
        entity.damage = game.stat('damage');
        entity.cooldownTime = game.stat('cooldownTime');
        entity.barell = {x: x, y: y - (5 + entity.r)}

        entity.cooldownCounter = 0;
        entity.closestEnemy = false;

        entity.update = function () {
            entity.cooldownCounter--;
            let newEnemyDistance = game.distance(this.x, this.y, this.closestEnemy.x, this.closestEnemy.y);

            if ( newEnemyDistance >= (this.fireRange + this.closestEnemy.r) || this.closestEnemy.health <= 0 ) {
                this.closestEnemy = false;
            }

            if ( this.closestEnemy === false ) {

                let closestDistance = Number.MAX_SAFE_INTEGER;
                for (i in game.enemies.enemiesList) {
                    let enemy = game.enemies.enemiesList[i];
                    let distance = game.distance(this.x, this.y, enemy.x, enemy.y);
                    if (distance < closestDistance && distance <= (this.fireRange + enemy.r)) {
                        closestDistance = distance;
                        this.closestEnemy = enemy;
                    }
                }
            }

            this.closestEnemy.shoot = false;
            if ( this.closestEnemy !== false && entity.cooldownCounter <= 0) {
                this.shoot(this.closestEnemy);
                this.closestEnemy.shoot = true;
            }

        };

        entity.shoot = function (enemy) {
            enemy.damage(this.damage);
            this.cooldownCounter = this.cooldownTime;
        };

        let superDraw = entity.draw;
        entity.draw = function () {
            // Den Turm zeichnen
            superDraw.apply(this);

            // Wirkungsradius/Reichweite zeichnen
            if (game.mouse.isMouseOver(this.x, this.y, this.r )) {
                game.drawCircle(this.x, this.y, this.fireRange, 'rgba(0,0,255,0.2)', true);
            }

            if ( this.closestEnemy ) {
                let eDistance = game.distance(this.x, this.y, this.closestEnemy.x, this.closestEnemy.y);

                // Neue Turm Ausrichtung berechnen
                let dRatio = (5 + this.r) / eDistance;
                this.barell.x = this.x + dRatio * (this.closestEnemy.x - this.x);
                this.barell.y = this.y + dRatio * (this.closestEnemy.y - this.y);
            }


            game.ctx.save();

            // Schuss darstellen
            if ( this.closestEnemy.shoot ) {
                game.ctx.beginPath();
                game.ctx.strokeStyle = 'white';
                game.ctx.lineWidth = 2;
                game.ctx.moveTo(this.x, this.y);
                game.ctx.lineTo(this.closestEnemy.x, this.closestEnemy.y);
                game.ctx.stroke();
            }

            // Turm Ausrichtung darstellen
            game.ctx.beginPath();
            game.ctx.strokeStyle = 'black';
            game.ctx.lineWidth = 5;
            game.ctx.moveTo(this.x, this.y);
            game.ctx.lineTo(this.barell.x, this.barell.y);
            game.ctx.stroke();

            game.ctx.restore();


        };
        return entity;
    }
};

game.enemies = {
    enemiesList: [],
    init: function () {
        var self = this;
        game.on('update', function () {
            self.update();
        });
    },
    update: function () {
        for (let i = this.enemiesList.length - 1; i >= 0; i--)
            if (this.enemiesList[i].deleted == true) this.remove(i);
    },
    remove: function (index) {
        game.mapEntities.remove(this.enemiesList[index].id);
        this.enemiesList.splice(index, 1);
    },
    create: function (level) {
        let shift = Math.round(Math.random() * 40) - 10,
            self = this,
            entity = game.mapEntities.create(0, 0, 10, 'red');

        entity.waypointIndex = 0;
        entity.waypoint = {};

        entity.shift = shift;
        entity.velocity = {x: 0, y: 0};

        if (!game.settings.enemyLevels[level]) level = game.settings.enemyLevels.length - 1;

        let settings = game.settings.enemyLevels[level]
        entity.speed = settings.speed;
        entity.health = settings.health;
        entity.color = settings.color;

        entity.r = entity.health * game.settings.enemyMinSize;

        entity.deleted = false;

        entity.nextWaypoint = function () {
            if (!this.waypoint.x) {
                // Waypoint Objekt kopieren
                this.waypoint = Object.assign({}, game.map.waypoints[this.waypointIndex]);
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
            if (!game.map.waypoints[this.waypointIndex]) return false;
            this.waypoint = Object.assign({}, game.map.waypoints[this.waypointIndex]);

            // Versatz aufaddieren
            this.waypoint.x += this.shift;
            this.waypoint.y += this.shift;

            // Bewegungsernergie setzen
            if (oldX == this.waypoint.x)
                this.velocity.x = 0;
            else
                this.velocity.x = (this.x < this.waypoint.x ? entity.speed : -entity.speed);

            if (oldY == this.waypoint.y)
                this.velocity.y = 0;
            else
                this.velocity.y = (this.y < this.waypoint.y ? entity.speed : -entity.speed);

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
                console.log('Gestorben');
                return this.die();
            }

            /*
                        if(!game.settings.enemyLevels[level]) level = game.settings.enemyLevels.length-1;

                        var settings = game.settings.enemyLevels[level]
                        entity.speed = settings.speed;
                        entity.health = settings.health;
                        entity.color = settings.color;
            */
            this.r = game.settings.enemyMinSize * this.health;

            if (this.waypointReached()) {
                if (!this.nextWaypoint())
                    return this.done();
            } else {
                this.x += this.velocity.x;
                this.y += this.velocity.y;
            }

        };
        entity.die = function () {
            this.health = 0;
            this.deleted = true;
            game.stat('coins', game.stat('coins') + 1, true);
            return this;
        };
        entity.done = function () {
            this.deleted = true;
            let life = game.stat('life');
            life -= this.health;
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
            if (this.health <= 0) this.die();
        };
        // Zum nächsten Waypoint laufen
        entity.nextWaypoint();
        this.enemiesList.push(entity);
        //entity.draw = {};
        return entity;
    },
};

game.mapEntities = {
    list: {},
    idCounter: 0,
    init: function () {
        var self = this;
        game.on('update', function () {
            self.update();
        });
        game.on('draw', function () {
            self.draw();
        });
    },
    create: function (x, y, r, color) {
        let self = this,
            id = ++this.idCounter,
            entity = {
                id: id,
                type: 0,			// Entity-Typ zur Unterscheidung der Entities
                x: x,			// X-Position auf dem Canvas
                y: y,			// Y-Position auf dem Canvas
                r: r,			// Radius für die Kollisionserkennung (und auch zum Zeichnen)
                color: color,		// Farbe zum zeichnen
                // 30 mal in der Sekunde wird diese Methode aufgerufen.
                // Hier lassen sich getaktete Abläufe realisieren.
                update: function () {
                },
                remove: function () {
                    self.remove(this.id);
                },
                // Die "draw"-Funktion wird so oft in der Sekunde aufgerufen wie es das Brtriebssystem vorgibt.
                // Getaktete Abläufe lassen sich hier also nicht umsetzen - dafür ist die "Update"-Methode da.
                // Hier kann das Canvas bemalt werden. Dazu werden die Eigenschaften x,y,r und color verwendet.
                draw: function () {
                    game.drawCircle(this.x, this.y, this.r, this.color, true);
                },
            };
        this.list[entity.id] = entity;
        return entity;
    },
    remove: function (id) {
        delete this.list[id];
    },
    update: function () {
        // Für jedes mapEntity rufen wir dessen "update"-Methode auf
        //for(let i=0; i<this.list.length; i++) this.list[i].update();
        for (let i in this.list) this.list[i].update();
    },
    draw: function () {
        // Alle Objekte zur drawList hinzufügen.
        // Dort werden sie sortiert und deren "draw()"-Methode aufgerufen.
        //for(let i=0; i<this.list.length; i++) game.drawList.push(this.list[i]);
        for (let i in this.list) game.drawList.push(this.list[i]);
    },
};
