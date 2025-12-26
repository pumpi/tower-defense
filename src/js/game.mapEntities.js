import helpers from './helpers';
import game from './game';

export default {
    list: {},
    idCounter: 0,
    init: function () {
        const self = this;
        game.on('update', function () {
            self.update();
        });
        game.on('beforeDraw', function () {
            self.draw();
        });
    },
    create: function (x, y, r, color) {
        const self = this,
            id = ++this.idCounter,
            entity = {
                id: id,
                type: 0,		// Entity-Typ zur Unterscheidung der Entities
                x: x,			// X-Position auf dem Canvas
                y: y,			// Y-Position auf dem Canvas
                r: r,			// Radius für die Kollisionserkennung (und auch zum Zeichnen)
                color: color,	// Farbe zum zeichnen
                level: 0,       // Entity Level
                zIndex: 0,      // Entity zIndex
                // 30 mal in der Sekunde wird diese Methode aufgerufen.
                // Hier lassen sich getaktete Abläufe realisieren.
                update: function () {
                },
                remove: function () {
                    self.remove(this.id);
                },
                // Die "draw"-Funktion wird so oft in der Sekunde aufgerufen wie es das Betriebssystem vorgibt.
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