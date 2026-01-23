/**
 * GameLogger - Simple event logging for balancing analysis
 * Events are written to files in dev mode via Vite middleware
 */
class GameLogger {
    constructor(game) {
        this.game = game;
        this.events = [];
        this.sessionId = this.generateSessionId();
        this.eventCount = 0;
    }

    /**
     * Generate session ID from current timestamp
     */
    generateSessionId() {
        const now = new Date();
        return now.toISOString().slice(0, 19).replace(/[T:]/g, '-');
    }

    /**
     * Get current game state - attached to every log entry
     */
    getGameState() {
        return {
            time: (this.game.time || 0).toFixed(2),
            coins: this.game.stat('coins'),
            lives: this.game.stat('live'),
            wave: this.game.stat('wave')
        };
    }

    /**
     * Log any event with automatic game state
     */
    log(type, data = {}) {
        const event = {
            ...this.getGameState(),
            type,
            ...data
        };

        this.events.push(event);
        this.sendToServer(event);
    }

    /**
     * Send event to dev server for file logging
     */
    sendToServer(event) {
        fetch('/api/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: this.sessionId, event })
        }).catch(() => {
            // Silently ignore errors (e.g., in production where endpoint doesn't exist)
        });
    }

    /**
     * Get current tower stats from game entities
     */
    getTowerStats() {
        if (!this.game.mapEntities?.list) return [];

        return Object.values(this.game.mapEntities.list)
            .filter(e => e.type === 'tower')
            .map(t => ({
                id: t.id,
                type: t.towerType,
                level: t.level + 1,
                x: t.x,
                y: t.y,
                ...t.stats
            }));
    }

    /**
     * Log final summary with tower stats and clear events
     */
    clear() {
        // Log tower summary before clearing
        if (this.events.length > 0) {
            this.log('session_summary', { towers: this.getTowerStats() });
        }
        this.events = [];
        this.sessionId = this.generateSessionId();
    }
}

export default GameLogger;