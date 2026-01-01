import settings from './game.settings.js';

class Debug {
    constructor(game) {
        this.game = game;
        this.panel = null;

        if (import.meta.env.DEV) {
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

        this.game.on('update', () => this.update());
    }

    update() {
        if (!this.panel) return;

        const towers = Object.values(this.game.mapEntities.list).filter(e => e.type === 'tower');
        const enemies = this.game.enemies.enemiesList;

        const towerInfo = towers.map(t => 
            `<li>LvL ${t.level + 1} ${t.bullet} (${t.stats.kills} kills)</li>`
        ).join('');

        const enemyInfo = enemies.map(e => 
            `<li>LvL ${e.level} ${e.enemyType} | HP: ${Math.round(e.health)}/${Math.round(e.maxHealth)}</li>`
        ).join('');
        
        const lastWave = this.game.lastWaveTemplate || [];
        const waveInfo = lastWave.map(s => `<li>${s.count}x Lvl ${s.level} ${s.enemyType} (${s.threat})</li>`).join('');

        this.panel.innerHTML = `
            <h3>Debug Info</h3>
            <p><strong>Game Mode:</strong> ${this.game.stat('mode') || 'normal'}</p>
            <p><strong>Wave:</strong> ${this.game.stat('wave')}</p>
            <p><strong>Game Level:</strong> ${Math.floor(((this.game.waveCounter || 1) -1) / settings.leveling.wavesPerLevel) + 1}</p>
            <p><strong>Wave Threat:</strong> ${Math.round(this.game.lastWaveCurrentThreat || 0)} / ${Math.round(this.game.lastWaveMaxThreat || 0)}</p>
            <hr>
            <h4>Towers (${towers.length})</h4>
            <ul>${towerInfo || '<li>None</li>'}</ul>
            <hr>
            <h4>Enemies (${enemies.length})</h4>
            <ul>${enemyInfo || '<li>None</li>'}</ul>
            <hr>
            <h4>Last Wave Composition</h4>
            <ul>${waveInfo || '<li>N/A</li>'}</ul>
        `;
    }
}

export default Debug;
