class MouseController {
    constructor(game) {
        this.game = game;
        this.x = 0;
        this.y = 0;
        this.clicked = false;

        // Mouse events
        this.game.canvas.addEventListener('mousemove', (e) => this.onMove(e));
        this.game.canvas.addEventListener('click', (e) => this.onClick(e));

        // Touch events for mobile
        this.game.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
        this.game.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    }

    update() {
        this.clicked = false;
    }

    onMove(e) {
        this.updatePosition(e.clientX, e.clientY);
    }

    onClick() {
        this.clicked = true;
    }

    onTouchStart(e) {
        e.preventDefault(); // Prevent scrolling
        this.clicked = true;

        if (e.touches.length > 0) {
            const touch = e.touches[0];
            this.updatePosition(touch.clientX, touch.clientY);
        }
    }

    onTouchMove(e) {
        e.preventDefault(); // Prevent scrolling

        if (e.touches.length > 0) {
            const touch = e.touches[0];
            this.updatePosition(touch.clientX, touch.clientY);
        }
    }

    updatePosition(clientX, clientY) {
        // Get canvas scaling factor
        const rect = this.game.canvas.getBoundingClientRect();
        const scaleX = this.game.canvas.width / rect.width;
        const scaleY = this.game.canvas.height / rect.height;

        // Convert to canvas coordinates
        this.x = (clientX - rect.left) * scaleX;
        this.y = (clientY - rect.top) * scaleY;
    }

    isMouseOver(x, y, radius) {
        return Math.round(Math.sqrt(Math.pow(this.x - x, 2) + Math.pow(this.y - y, 2))) <= radius;
    }
}

export default MouseController;