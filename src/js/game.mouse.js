import game from './game';

export default {
    x: 0,
    y: 0,
    clicked: false,

    // Initialisiert die Maus
    init: function () {
        let me = this;
        // Update Event registrieren
        game.on('update', function () {
            me.update();
        });

        // Mausbewegung
        game.canvas.addEventListener('mousemove', me.onMove);
        game.canvas.addEventListener("click", me.onClick);
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
        let me = this;

        return Math.round(Math.sqrt(Math.pow(me.x - x, 2) + Math.pow(me.y - y, 2))) <= radius;
    }
};