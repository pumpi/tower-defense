// Drawing utilities for canvas operations
class Draw {
    constructor(ctx) {
        this.ctx = ctx;
    }

    /**
     * Draw a circle on the canvas
     * @param {number} x - Center X coordinate
     * @param {number} y - Center Y coordinate
     * @param {number} r - Radius
     * @param {string} color - CSS color string
     * @param {boolean} fill - True to fill, false to stroke
     */
    circle(x, y, r, color, fill = true) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, r, 0, 2 * Math.PI);
        if (fill === true) {
            this.ctx.fillStyle = color;
            this.ctx.fill();
        } else {
            this.ctx.strokeStyle = color;
            this.ctx.stroke();
        }
    }

    /**
     * Draw a donut/ring shape (circle with hole in center)
     * @param {number} x - Center X coordinate
     * @param {number} y - Center Y coordinate
     * @param {number} outerRadius - Outer radius
     * @param {number} innerRadius - Inner radius (hole size)
     * @param {string} color - CSS color string
     */
    donut(x, y, outerRadius, innerRadius, color) {
        this.ctx.save();
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        // Outer circle
        this.ctx.arc(x, y, outerRadius, 0, Math.PI * 2, false);
        // Inner circle (counterclockwise to create hole)
        this.ctx.arc(x, y, innerRadius, 0, Math.PI * 2, true);
        this.ctx.fill();
        this.ctx.restore();
    }
}

export default Draw;