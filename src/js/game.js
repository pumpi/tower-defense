import map from './game.map';
import mapEntities from './game.mapEntities';
import enemies from './game.enemies';
import towers from './game.towers';
import mouse from './game.mouse';
import settings from './game.settings';
import helpers from "./helpers";

export default {
    canvas: false,	// Das Canvas Element. Hierüber erhalten wir die aktuelle Breite und Höhe des Canvas.
    ctx: false,		// Der Kontext über den wir auf dem Canvas zeichnen können.
    drawList: [],	// In dieser Liste werden alle zu zeichnenden Objekte gesammelt. Nach jedem "draw()"-Durchlauf ist die Liste leer und muss neu befüllt werden.
    mouse: mouse,

    // Hier werden das Spiel und alle Spielelemente initialisiert.
    init: function () {
        let me = this;

        // Das Canvas-Element brauchen wir noch öfter
        this.canvas = document.getElementById('canvas');

        // Den 2D-Kontext merken wir uns in der game.ctx Variable.
        this.ctx = this.canvas.getContext("2d");

        // Alle Erweiterungen initialisieren
        map.init();
        mapEntities.init();
        enemies.init();
        towers.init();
        this.mouse.init();

        // Einmalig schreiben wir in die Buttons die Kosten
        this.output('#towerCosts', settings.towers.laser.costs);

        // Alle Werte zurück setzen
        me.resetGame();

        // 30 mal in der Sekunde aktualisieren wir alle Objekte
        setInterval(me.update.bind(this), 1000 / 30);

        // Die "draw"-Schleife anstoßen
        this.draw();
    },

    // Setzt alle Werte zurück. Diese Methode kann zur Initialisierung und zum Resetten verwendet werden.
    resetGame: function () {
        // Wir fangen wieder mit der ersten Welle an
        this.waveCounter = 0;
        // Alle bestehenden Entitäten entfernen
        mapEntities.list = {};
        // Anfangswerte setzen
        this.stat('life', settings.playerLifes, true);	// Leben des Spielers
        this.stat('coins', 180, true);	                // Genügend Coins für die ersten beiden Türme
        this.stat('wave', 0, true);						// Wir setzen initial die Welle auf 0. Mit Aufruf von "nextWave()" wird der Wert erhöht.
    },

    buyTower: function (bulletType) {
        let me = this,
            bullet = bulletType;

        if (me.stat('mode') !== 'dropTower') {
            let coins = me.stat('coins');
            if (coins >= settings.towers[bullet].costs) {
                me.stat('mode', 'dropTower');
                me.stat('selectedTowerType', bullet);
                me.stat('coins', coins - settings.towers[bullet].costs, true);
            }
        }
    },

    update: function () {
        this.trigger('update');
    },

    draw: function () {
        let me = this;

        // Animation Frame anfordern
        window.requestAnimationFrame(me.draw.bind(this));
        // Canvas leeren
        me.ctx.clearRect(0, 0, me.canvas.width, me.canvas.height);

        // Event triggern so das alle zu zeichnenden Objekte zur Liste "drawList"
        // hinzugefügt werden können.
        // Jedes Objekt, das dieser Liste hinzugefügt wird, benötigt die Eigenschaft "y", "zIndex"
        // und die Methode "draw()" damit es sortiert wird und zum richtigen Zeitpunkt gezeichnet werden kann.
        me.trigger('beforeDraw');

        // Die Liste mit den zu zeichnenden Objekten vorsortieren
        // damit die weiter oben angesetzten Objekte hinter den Vorderen liegen.
        helpers._sortEntity.apply(me, ['drawList']);

        // Für jedes Element der Liste rufen wir die Methode "draw()" auf.
        // Diese Methode regelt die Darstellung des Objekts.
        for (let i = me.drawList.length - 1; i >= 0; i--) {
            me.drawList.splice(i, 1)[0].draw();
        }

        // Es gibt elemente die noch über den fest platzierten Elementen gezeichnet werden sollen
        // Diese elemente werden im after Draw aufgerufen
        me.trigger('afterDraw');
    },

    // Spielstati
    stats: {},
    stat: function (name, value, output) {
        if (value === undefined) return this.stats[name] || false;
        this.stats[name] = value;
        if (output !== undefined) this.output(`#${name}`, value);
        return this;
    },

    // Ausgabe mit Query-Cache
    _outputCache: {},
    output: function (query, value) {
        if (!this._outputCache[query]) {
            this._outputCache[query] = document.querySelector(query);
        }
        this._outputCache[query].innerHTML = value;
    },

    // Die Distanz zwischen zwei Punkten
    distance: function (x1, y1, x2, y2) {
        let a = x1 - x2,
            b = y1 - y2;
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
        this.ctx.beginPath();
        // .. zeichnen einen Bogen der mit 2*PI Umfang zu einem ganzen Kreis wird..
        this.ctx.arc(x, y, r, 0, 2 * Math.PI);
        if (fill === true) {
            // ..setzen eine Füllfarbe..
            this.ctx.fillStyle = color;
            // .. und füllen diesen Bereich mit der vorher festgelegten Farbe
            this.ctx.fill();
        } else {
            this.ctx.strokeStyle = color;
            this.ctx.stroke();
        }
    },

    // Waves
    waveCounter: 0,
    nextWave: function () {
        // Es muss mindestens ein Turm existieren
        if (Object.keys(mapEntities.list).length === 0) return this;
        //if (this.stat('mode')!='nextWave') return this;

        this.waveCounter++;
        this.stat('wave', this.waveCounter, true);

        let delay = 0,
            levelInc = Math.floor(this.waveCounter / settings.enemyLevelIncAt),
            maxTemplate = settings.waves.length - 1,
            template = settings.waves[Math.min(levelInc, maxTemplate)].template,
            currentWave = this.waveCounter;

        for (let spawn of template) {
            let ec = Math.round(spawn.count + (currentWave * spawn.waveFactor)); // Die Anzahl der Gegner multiplitziert mit dem Wellen Faktor
            setTimeout(() => {
                for (let i = 0; i < ec; i++) {
                    setTimeout(() => {
                        enemies.create(spawn.level + levelInc, currentWave);
                    }, i * spawn.coolDown);
                }
            }, delay);
            delay += (spawn.delay + (ec * spawn.coolDown)) * spawn.delayFactor;
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

    off: function (event, fn) {
        if (!this.eventsList[event]) return this;

        if (fn) {
            // Entferne spezifische Funktion
            const index = this.eventsList[event].indexOf(fn);
            if (index !== -1) {
                this.eventsList[event].splice(index, 1);
            }
        } else {
            // Entferne alle Listener für dieses Event
            delete this.eventsList[event];
        }

        return this;
    },

    trigger: function (event) {
        if (!this.eventsList[event]) return this;
        for (let i = 0; i < this.eventsList[event].length; i++) {
            this.eventsList[event][i]();
        }

        return this;
    }
}