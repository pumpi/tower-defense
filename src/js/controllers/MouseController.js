class MouseController {
    constructor(game) {
        this.game = game;
        this.x = 0;
        this.y = 0;
        this.clicked = false;

        this.game.canvas.addEventListener('mousemove', (e) => this.onMove(e));
        this.game.canvas.addEventListener('click', (e) => this.onClick(e));
    }

    update() {
        this.clicked = false;
    }

    onMove(e) {
        this.x = e.offsetX;
        this.y = e.offsetY;
    }

    onClick(e) {
        this.clicked = true;
    }

    isMouseOver(x, y, radius) {
        return Math.round(Math.sqrt(Math.pow(this.x - x, 2) + Math.pow(this.y - y, 2))) <= radius;
    }
}

export default MouseController;