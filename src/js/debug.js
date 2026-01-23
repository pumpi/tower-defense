import settings from './game.settings.js';
import GameLogger from './GameLogger.js';

class Debug {
    constructor(game) {
        this.game = game;
        this.panel = null;
        this.logger = null;

        if (import.meta.env.DEV) {
            this.logger = new GameLogger(game);
            this.init();
        }
    }

    init() {
        this.panel = document.createElement('div');
        this.panel.style.position = 'absolute';
        this.panel.style.top = '10px';
        this.panel.style.right = '10px';
        this.panel.style.width = '300px';
        this.panel.style.maxHeight = '90vh';
        this.panel.style.overflowY = 'auto';
        this.panel.style.background = 'rgba(0,0,0,0.75)';
        this.panel.style.color = 'white';
        this.panel.style.padding = '10px';
        this.panel.style.fontFamily = 'monospace';
        this.panel.style.fontSize = '12px';
        this.panel.style.zIndex = '1000';
        document.body.appendChild(this.panel);

        // Create static HTML structure once
        this.panel.innerHTML = `
            <h3>Debug Info</h3>
            <p><strong>Game Time:</strong> <span id="debug-game-time">0</span>s</p>
            <p><strong>Game Mode:</strong> <span id="debug-game-mode">normal</span></p>
            <p><strong>Wave:</strong> <span id="debug-wave">0</span></p>
            <p><strong>Game Level:</strong> <span id="debug-game-level">1</span></p>
            <p><strong>Wave Threat:</strong> <span id="debug-wave-threat">0 / 0</span></p>
            <hr>
            <h4>Towers (<span id="debug-tower-count">0</span>)</h4>
            <ul id="debug-tower-list"><li>None</li></ul>
            <button id="debug-log-towers" style="margin: 5px 0; padding: 5px 10px; cursor: pointer;">Log Tower Stats</button>
            <hr>
            <h4>Enemies (<span id="debug-enemy-count">0</span>)</h4>
            <ul id="debug-enemy-list"><li>None</li></ul>
            <hr>
            <h4>Last Wave Composition</h4>
            <ul id="debug-wave-list"><li>N/A</li></ul>
        `;

        document.getElementById('debug-log-towers').addEventListener('click', () => {
            this.logger?.log('tower_stats', { towers: this.logger.getTowerStats() });
        });

        this.game.on('update', (deltaTime) => this.update(deltaTime));
    }

    log(type, data) {
        this.logger?.log(type, data);
    }

    update(deltaTime) {
        if (!this.panel) return;

        this.game.time = (this.game.time || 0) + deltaTime;

        const towers = Object.values(this.game.mapEntities.list).filter(e => e.type === 'tower');
        const enemies = this.game.enemies.enemiesList;

        // Update only the dynamic parts
        document.getElementById('debug-game-time').textContent = (this.game.time || 0).toFixed(1);
        document.getElementById('debug-game-mode').textContent = this.game.stat('mode') || 'normal';
        document.getElementById('debug-wave').textContent = this.game.stat('wave');
        document.getElementById('debug-game-level').textContent = Math.floor(((this.game.waveCounter || 1) - 1) / settings.leveling.wavesPerLevel) + 1;
        document.getElementById('debug-wave-threat').textContent = `${Math.round(this.game.lastWaveCurrentThreat || 0)} / ${Math.round(this.game.lastWaveMaxThreat || 0)}`;

        // Tower list
        document.getElementById('debug-tower-count').textContent = towers.length;
        const towerList = document.getElementById('debug-tower-list');
        if (towers.length > 0) {
            towerList.innerHTML = towers.map(t =>
                `<li>LvL ${t.level + 1} ${t.towerType} (${t.stats.kills} kills, ${t.stats.crits} crits)</li>`
            ).join('');
        } else {
            towerList.innerHTML = '<li>None</li>';
        }

        // Enemy list
        document.getElementById('debug-enemy-count').textContent = enemies.length;
        const enemyList = document.getElementById('debug-enemy-list');
        if (enemies.length > 0) {
            enemyList.innerHTML = enemies.map(e =>
                `<li>LvL ${e.level} ${e.enemyType} | HP: ${Math.round(e.health)}/${Math.round(e.maxHealth)}</li>`
            ).join('');
        } else {
            enemyList.innerHTML = '<li>None</li>';
        }

        // Wave composition
        const lastWave = this.game.lastWaveTemplate || [];
        const waveList = document.getElementById('debug-wave-list');
        if (lastWave.length > 0) {
            waveList.innerHTML = lastWave.map(s =>
                `<li>${s.name} - ${s.count}x Lvl ${s.level} ${s.enemyType} (${s.threat})</li>`
            ).join('');
        } else {
            waveList.innerHTML = '<li>N/A</li>';
        }
    }

    // Reset logger when game resets
    resetLog() {
        this.logger?.clear();
        this.game.time = 0;
    }
}

export default Debug;
