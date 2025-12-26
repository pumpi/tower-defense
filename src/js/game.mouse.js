import game from './game';

export default {
    x: 0,
    y: 0,
    clicked: false,

    // Initialisiert die Maus
    init: function () {
        // Update Event registrieren
        game.on('update', () => this.update());

        // Mausbewegung
        game.canvas.addEventListener('mousemove', (e) => this.onMove(e));
        game.canvas.addEventListener('click', (e) => this.onClick(e));
    },

    update: function () {
        game.mouse.clicked = false;
    },

    onMove: function (e) {
        // Mausposition merken
        this.x = e.offsetX;
        this.y = e.offsetY;
    },

    onClick: function (e) {
        this.clicked = true;
    },

    isMouseOver: function (x, y, radius) {
        return Math.round(Math.sqrt(Math.pow(this.x - x, 2) + Math.pow(this.y - y, 2))) <= radius;
    }
};