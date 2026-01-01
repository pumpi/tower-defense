import Debug from './debug.js';
import MapController from './controllers/MapController.js';
import MapEntityManager from './controllers/MapEntityManager.js';
import MouseController from './controllers/MouseController.js';
import Enemies from './entities/Enemies.js';
import Towers from './entities/Towers.js';
import settings from './game.settings.js';
import helpers from "./helpers.js";

class Game {
    constructor() {
        helpers.init(this);
        
        // Core properties
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext("2d");
        this.drawList = [];
        this.stats = {};
        this._outputCache = {};
        this.waveCounter = 0;
        this.gameOver = false;
        this.eventsList = {};
        this.lastFrameTime = 0;
        this.lastWaveTemplate = [];

        // Create instances of all controllers, injecting dependencies
        this.mapEntities = new MapEntityManager(this);
        this.map = new MapController(this, this.mapEntities);
        this.mouse = new MouseController(this);
        this.enemies = new Enemies(this, this.map, this.mapEntities);
        this.towers = new Towers(this, this.map, this.mouse, this.mapEntities, this.enemies);
        this.debug = new Debug(this);

        // UI Listeners
        document.addEventListener('click', (event) => {
            if (this.gameOver) {
                this.resetGame();
                return;
            }
            if (event.target.matches('#buy-tower')) {
                event.preventDefault();
                this.buyTower('laser');
            }
            if (event.target.matches('#next-wave')) {
                event.preventDefault();
                this.nextWave();
            }
            if (event.target.matches('.modal-close')) {
                event.preventDefault();
                this.towers.closeOptions();
            }
        }, false);
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.stat('mode') === 'dropTower') {
                this.stat('mode', '');
            }
        });
        
        // Initial static setup
        this.output('#towerCosts', settings.towers.laser.costs);
        this.output('#app-version', `v${import.meta.env.VITE_APP_VERSION}`);

        // Start the game
        this.resetGame();

        window.requestAnimationFrame(this.draw.bind(this));
    }

    resetGame() {
        this.gameOver = false;
        this.waveCounter = 0;
        this.mapEntities.list = {}; // Reset entities
        this.enemies.enemiesList = []; // Clear the specific enemies list
        this.stat('life', settings.playerLifes, true);
        this.stat('coins', settings.coins, true);
        this.stat('wave', 0, true);
        this.stat('mode', ''); // Reset game mode
    }

    buyTower(bulletType) {
        if (this.stat('mode') !== 'dropTower') {
            if (this.stat('coins') >= settings.towers[bulletType].costs) {
                this.stat('mode', 'dropTower');
                this.stat('selectedTowerType', bulletType);
            }
        }
    }

    update(deltaTime) {
        if (this.gameOver) {
            // Only mouse updates are needed for the restart click
            this.mouse.update();
            return;
        }
        this.trigger('update', deltaTime);
        this.mouse.update();
    }

    draw(timestamp) {
        if (!timestamp) timestamp = 0;
        const deltaTime = (timestamp - this.lastFrameTime) / 1000;
        this.lastFrameTime = timestamp;

        window.requestAnimationFrame(this.draw.bind(this));

        this.update(deltaTime);
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.trigger('beforeDraw');

        this.drawList = helpers.sortEntity(this.drawList);

        for (const entity of this.drawList) {
            entity.draw();
        }
        this.drawList = [];

        this.trigger('afterDraw');

        // If the game is over, draw the overlay on top of the last game state
        if (this.gameOver) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = 'white';
            this.ctx.font = '48px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Game Over', this.canvas.width / 2, this.canvas.height / 2 - 40);
            this.ctx.font = '24px sans-serif';
            this.ctx.fillText('Klicken zum Neustarten', this.canvas.width / 2, this.canvas.height / 2 + 20);
        }
    }

    setGameOver() {
        this.gameOver = true;
    }

    stat(name, value, output) {
        if (value === undefined) return this.stats[name] || false;
        this.stats[name] = value;
        if (output !== undefined) this.output(`#${name}`, value);
        return this;
    }

    output(query, value) {
        if (!this._outputCache[query]) {
            this._outputCache[query] = document.querySelectorAll(query);
        }
        if (this._outputCache[query]) {
            this._outputCache[query].forEach((element) => {
                element.innerHTML = value;
            })
        }
    }

    distance(x1, y1, x2, y2) {
        let a = x1 - x2;
        let b = y1 - y2;
        return Math.sqrt(a * a + b * b);
    }

    intersectRect(r1, r2) {
        return !(r2.left > r1.right ||
            r2.right < r1.left ||
            r2.top > r1.bottom ||
            r2.bottom < r1.top);
    }

    drawCircle(x, y, r, color, fill = true) {
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

    nextWave() {
        // This check is sufficient because before wave 1, any entity must be a tower.
        if (Object.keys(this.mapEntities.list).length === 0) {
            return this;
        }

        this.waveCounter++;
        this.stat('wave', this.waveCounter, true);

        const gameLevel = Math.floor((this.waveCounter -1) / settings.leveling.wavesPerLevel) + 1;
        let waveTemplate = [];

        // Generate wave
        if (this.waveCounter > 0 && this.waveCounter % settings.leveling.wavesPerLevel === 0) {
            // --- Boss Wave ---
            waveTemplate = settings.bossWaveTemplate.map(spawn => ({...spawn, level: gameLevel}));
        } else {
            // --- Normal Wave ---
            const waveInLevel = (this.waveCounter -1) % settings.leveling.wavesPerLevel;
            // Use an exponential curve for progress to make early waves easier and later waves harder
            const levelProgress = Math.pow(waveInLevel / (settings.leveling.wavesPerLevel - 1), 1.3);

            const { minThreat, maxThreat, threatFactor } = settings.leveling.waveGeneration;

            // Scale the whole threat budget based on the game level
            const budgetMultiplier = Math.pow(threatFactor, gameLevel - 1);
            const scaledMinThreat = minThreat * budgetMultiplier;
            const scaledMaxThreat = maxThreat * budgetMultiplier;
            
            const maxThreatForThisWave = scaledMinThreat + ((scaledMaxThreat - scaledMinThreat) * levelProgress);
            
            let currentThreat = 0;
            let attempts = 0;
            const fragmentKeys = Object.keys(settings.waveFragments);

            while (attempts < 100) {
                const suitableFragments = fragmentKeys.filter(key => {
                    return settings.waveFragments[key].threat <= (maxThreatForThisWave - currentThreat);
                });

                if (suitableFragments.length === 0) break;

                const randomFragmentKey = suitableFragments[Math.floor(Math.random() * suitableFragments.length)];
                const fragment = settings.waveFragments[randomFragmentKey];
                
                let fragmentDetails = fragment.details;
                fragmentDetails.threat = fragment.threat;

                if (!Array.isArray(fragmentDetails)) {
                    fragmentDetails = [fragmentDetails];
                }

                fragmentDetails.forEach(spawnDef => {
                    waveTemplate.push({ ...spawnDef, level: gameLevel });
                });

                currentThreat += fragment.threat;
                attempts++;
            }
            this.lastWaveMaxThreat = maxThreatForThisWave;
            this.lastWaveCurrentThreat = currentThreat;
        }
        
        this.lastWaveTemplate = waveTemplate;

        // Spawn enemies from the generated template
        let delay = 0;
        waveTemplate.forEach(spawn => {
            const enemyCount = spawn.count + ((gameLevel - 1) * (spawn.countFactor || 0));
            setTimeout(() => {
                for (let i = 0; i < enemyCount; i++) {
                    setTimeout(() => {
                        this.enemies.create(spawn.enemyType, spawn.level, this.waveCounter);
                    }, i * (spawn.coolDown || 500));
                }
            }, delay);
            delay += spawn.delay || 500;
        });

        return this;
    }

    on(event, fn) {
        if (!this.eventsList[event]) this.eventsList[event] = [];
        this.eventsList[event].push(fn);
        return this;
    }

    off(event, fn) {
        if (!this.eventsList[event]) return this;

        if (fn) {
            const index = this.eventsList[event].indexOf(fn);
            if (index !== -1) {
                this.eventsList[event].splice(index, 1);
            }
        } else {
            delete this.eventsList[event];
        }

        return this;
    }

    trigger(event, deltaTime) {
        if (!this.eventsList[event]) return this;
        for (let i = 0; i < this.eventsList[event].length; i++) {
            this.eventsList[event][i](deltaTime);
        }
        return this;
    }
}

export default Game;