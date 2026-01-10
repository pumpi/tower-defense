import Debug from './debug.js';
import MapController from './controllers/MapController.js';
import MapEntityManager from './controllers/MapEntityManager.js';
import MouseController from './controllers/MouseController.js';
import EnemiesController from './controllers/EnemiesController.js';
import TowersController from './controllers/TowersController.js';
import settings from './game.settings.js';
import helpers from "./helpers.js";
import optionsIcon from '../img/options.svg';
import Modal from './components/Modal.js';
import Draw from './draw.js';

class Game {
    constructor() {
        helpers.init(this);
        
        // Core properties
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext("2d");
        this.drawer = new Draw(this.ctx);
        this.drawList = [];
        this.stats = {};
        this._outputCache = {};
        this.waveCounter = 0;
        this.gameOver = false;
        this.eventsList = {};
        this.lastFrameTime = 0;
        this.lastWaveTemplate = [];
        this.isPaused = false;
        this.spawnQueue = []; // Queue for enemies to spawn

        // Load the options icon image and define its position/size
        this.optionsIconImage = new Image();
        this.optionsIconImage.src = optionsIcon;
        this.optionsIconPos = {x: this.canvas.width - 40, y: 10, width: 30, height: 30}; // Top-right position

        // Create instances of all controllers, injecting dependencies
        this.mapEntities = new MapEntityManager(this);
        this.map = new MapController(this, this.mapEntities);
        this.mouse = new MouseController(this);
        this.enemies = new EnemiesController(this, this.map, this.mapEntities);
        this.towers = new TowersController(this, this.map, this.mouse, this.mapEntities, this.enemies);
        this.debug = new Debug(this);
        this.modal = new Modal(this);

        // Initialize game settings from defaults
        this.stat('soundEnabled', settings.game.soundEnabled);
        this.stat('showNormalDamage', settings.game.showNormalDamage);

        // Load settings from localStorage or use defaults
        this.loadSettings();

        // UI Listeners
        document.addEventListener('click', (event) => {
            if (this.gameOver) {
                this.resetGame();
                return;
            }
            if (event.target.matches('#buy-tower')) {
                event.preventDefault();
                this.openTowerShopModal();
            }
            if (event.target.matches('#next-wave')) {
                event.preventDefault();
                this.nextWave();
            }
        }, false);
        
        // Listener for Options Icon click on Canvas
        this.canvas.addEventListener('click', (event) => {
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;

            // Check if click is within Options Icon bounds
            if (mouseX >= this.optionsIconPos.x && mouseX <= (this.optionsIconPos.x + this.optionsIconPos.width) &&
                mouseY >= this.optionsIconPos.y && mouseY <= (this.optionsIconPos.y + this.optionsIconPos.height)) {
                this.openSettingsModal();
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.stat('mode') === 'dropTower') {
                this.stat('mode', '');
            }
        });

        // Pause game when tab becomes inactive
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.isPaused = true;
            } else {
                this.isPaused = false;
                // Reset lastFrameTime to prevent huge deltaTime jump
                this.lastFrameTime = performance.now();
            }
        });

        // Initial static setup
        this.output('#towerCosts', settings.towers.laser.costs);
        this.output('#app-version', `v${import.meta.env.VITE_APP_VERSION}`);

        // Start the game
        this.resetGame();

        window.requestAnimationFrame(this.draw.bind(this));
    }

    // --- Settings Management ---
    loadSettings() {
        const storedSettings = JSON.parse(localStorage.getItem('gameSettings')) || {};
        this.stat('soundEnabled', storedSettings.soundEnabled ?? settings.game.soundEnabled);
        this.stat('showNormalDamage', storedSettings.showNormalDamage ?? settings.game.showNormalDamage);
    }

    saveSettings() {
        const currentSettings = {
            soundEnabled: this.stat('soundEnabled'),
            showNormalDamage: this.stat('showNormalDamage'),
        };
        localStorage.setItem('gameSettings', JSON.stringify(currentSettings));
    }

    openSettingsModal() {
        const content = `
            <div>
                <label>
                    <input type="checkbox" id="setting-sound-enabled" ${this.stat('soundEnabled') ? 'checked' : ''}>
                    Sound aktivieren
                </label>
            </div>
            <div>
                <label>
                    <input type="checkbox" id="setting-show-normal-damage" ${this.stat('showNormalDamage') ? 'checked' : ''}>
                    Normale Schadenszahlen anzeigen (Crits immer anzeigen)
                </label>
            </div>
        `;

        this.modal.open('Settings', content);

        document.getElementById('setting-sound-enabled').addEventListener('change', (event) => {
            this.stat('soundEnabled', event.target.checked);
            this.saveSettings();
        });
        document.getElementById('setting-show-normal-damage').addEventListener('change', (event) => {
            this.stat('showNormalDamage', event.target.checked);
            this.saveSettings();
        });
    }

    openTowerShopModal() {
        const coins = this.stat('coins');
        const towerTypes = Object.keys(settings.towers);

        let content = '<div class="tower-shop">';

        towerTypes.forEach(towerType => {
            const tower = settings.towers[towerType];
            const canAfford = coins >= tower.costs;
            const disabledClass = !canAfford ? 'disabled' : '';

            // Generate preview canvas for tower
            const previewId = `tower-preview-${towerType}`;

            // Get tower type specific info
            let statsHTML = `
                <div>Reichweite: ${tower.fireRange}</div>
            `;

            if (tower.minRange) {
                statsHTML = `<div>Reichweite: ${tower.minRange}-${tower.fireRange}</div>`;
            }

            if (tower.slowEffect) {
                statsHTML += `<div>Slow: ${Math.round((1 - tower.slowEffect) * 100)}%</div>`;
            }

            if (tower.damage) {
                statsHTML += `
                    <div>Schaden: ${tower.damage.from}-${tower.damage.to}</div>
                    <div>Feuerrate: ${tower.coolDownTime}s</div>
                `;
            }

            if(tower.dotType) {
                statsHTML += `
                    <h5>Schaden über Zeit</h5>
                    <div>Schaden: ${tower.dotDamage.from}-${tower.dotDamage.to} (${tower.dotType})</div>
                    <div>Dauer: ${tower.dotDuration}s</div>
                `
            }

            if(tower.maxChains) {
                statsHTML += `
                    <h5>Ketten Effekt</h5>
                    <div>Kettenreichweite: ${tower.chainRange}</div>
                    <div>Max Ketten: ${tower.maxChains}</div>
                `
            }

            content += `
                <div class="tower-shop-item ${disabledClass}">
                    <canvas id="${previewId}" width="80" height="80"></canvas>
                    
                    <div class="tower-shop-info">
                        <h4>${tower.label}</h4>
                        ${statsHTML}
                    </div>
                    
                    <div class="tower-shop-buy-container">
                        <div class="tower-shop-item-price">
                            <img src="./img/coin.svg" alt="Coins" title="Coins">
                            ${tower.costs}
                        </div>
                        
                        <button class="btn tower-buy-btn" data-tower-type="${towerType}" data-required-coins="${tower.costs}" data-disable-parent=".tower-shop-item">
                            Kaufen
                        </button>
                    </div>
                </div>
            `;
        });

        content += '</div>';

        this.modal.open('Turm kaufen', content, this);

        // Draw a preview for each tower
        towerTypes.forEach(towerType => {
            const previewCanvas = document.getElementById(`tower-preview-${towerType}`);
            if (previewCanvas) {
                const previewCtx = previewCanvas.getContext('2d');
                const tower = settings.towers[towerType];

                // Clear canvas
                previewCtx.clearRect(0, 0, 80, 80);

                // Draw tower preview
                if (tower.images?.complete) {
                    const sprite = tower.images.sprites[0];
                    // Scale sprite to fit in 80x80 canvas
                    previewCtx.drawImage(
                        tower.images,
                        sprite.x, sprite.y, sprite.w * 2 , sprite.h * 2,
                        0, 0, 80, 80
                    );
                } else {
                    // Fallback: draw circle for gravity tower
                    previewCtx.beginPath();
                    previewCtx.arc(40, 40, 20, 0, 2 * Math.PI);
                    previewCtx.fillStyle = tower.color;
                    previewCtx.fill();
                }
            }
        });

        // Add event listeners for buy buttons
        document.querySelectorAll('.tower-buy-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const towerType = event.target.getAttribute('data-tower-type');
                this.buyTower(towerType);
                this.modal.close();
            });
        });
    }
    // --- End Settings Management ---

    resetGame() {
        this.gameOver = false;
        this.waveCounter = 0;
        this.mapEntities.list = {}; // Reset entities
        this.enemies.enemiesList = []; // Clear the specific enemies list
        this.spawnQueue = []; // Clear spawn queue
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

        // Process spawn queue
        this.processSpawnQueue(deltaTime);

        this.trigger('update', deltaTime);
        this.mouse.update();
    }

    draw(timestamp) {
        if (!timestamp) timestamp = 0;
        const deltaTime = (timestamp - this.lastFrameTime) / 1000;
        this.lastFrameTime = timestamp;

        window.requestAnimationFrame(this.draw.bind(this));

        // Skip update if paused (but still render)
        if (!this.isPaused) {
            this.update(deltaTime);
        }
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.trigger('beforeDraw');

        this.drawList = helpers.sortEntity(this.drawList);

        for (const entity of this.drawList) {
            entity.draw();
        }
        this.drawList = [];

        this.trigger('afterDraw');

        // Draw Options Icon
        if (this.optionsIconImage.complete) {
            this.ctx.drawImage(this.optionsIconImage, this.optionsIconPos.x, this.optionsIconPos.y, this.optionsIconPos.width, this.optionsIconPos.height);
        }

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
        const oldValue = this.stats[name];
        this.stats[name] = value;
        if (output !== undefined) this.output(`#${name}`, value);

        // Trigger event if value changed
        if (oldValue !== value) {
            this.trigger(`stat:${name}`, value);
        }

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

    nextWave() {
        if (Object.keys(this.mapEntities.list).length === 0) return this;

        if (!import.meta.env.DEV && this.enemies.enemiesList.length > 0) {
            return this; // Prevent wave spam in production
        }

        this.waveCounter++;
        this.stat('wave', this.waveCounter, true);

        const gameLevel = Math.floor((this.waveCounter - 1) / settings.leveling.wavesPerLevel) + 1;
        const waveTemplate = this.isBossWave()
            ? this.generateBossWave(gameLevel)
            : this.generateNormalWave(gameLevel);

        this.lastWaveTemplate = waveTemplate;
        this.spawnEnemiesFromTemplate(waveTemplate);

        return this;
    }

    isBossWave() {
        return this.waveCounter > 0 && this.waveCounter % settings.leveling.wavesPerLevel === 0;
    }

    generateBossWave(gameLevel) {
        return settings.bossWaveTemplate.map(spawn => ({ ...spawn, level: gameLevel }));
    }

    generateNormalWave(gameLevel) {
        const waveInLevel = (this.waveCounter - 1) % settings.leveling.wavesPerLevel;
        const levelProgress = Math.pow(waveInLevel / (settings.leveling.wavesPerLevel - 1), 1.7);

        const { minThreat, maxThreat, threatFactor } = settings.leveling.waveGeneration;
        const budgetMultiplier = Math.pow(threatFactor, gameLevel - 1);
        const scaledMinThreat = minThreat * budgetMultiplier;
        const scaledMaxThreat = maxThreat * budgetMultiplier;
        const maxThreatForThisWave = scaledMinThreat + ((scaledMaxThreat - scaledMinThreat) * levelProgress);

        // First pass: use regular fragments
        let waveTemplate = [];
        let currentThreat = this.collectFragments(settings.waveFragments, maxThreatForThisWave, 0, gameLevel, waveTemplate);

        // Second pass: fill remaining threat with fillups
        currentThreat = this.collectFragments(settings.fillUpFragments, maxThreatForThisWave, currentThreat, gameLevel, waveTemplate);

        this.lastWaveMaxThreat = maxThreatForThisWave;
        this.lastWaveCurrentThreat = currentThreat;

        return waveTemplate;
    }

    collectFragments(fragments, maxThreat, currentThreat, gameLevel, waveTemplate) {
        let attempts = 0;
        const fragmentKeys = Object.keys(fragments);

        while (attempts < 100) {
            const suitableFragments = fragmentKeys.filter(key => {
                return fragments[key].threat <= (maxThreat - currentThreat);
            });

            if (suitableFragments.length === 0) break;

            const randomFragmentKey = suitableFragments[Math.floor(Math.random() * suitableFragments.length)];
            const fragment = fragments[randomFragmentKey];

            let fragmentDetails = fragment.details;

            // Normalize to array first
            if (!Array.isArray(fragmentDetails)) {
                fragmentDetails = [fragmentDetails];
            }

            // Add debug info and calculate counts for each spawn definition
            fragmentDetails.forEach(spawnDef => {
                waveTemplate.push({
                    ...spawnDef,
                    name: randomFragmentKey,
                    level: gameLevel,
                    count: spawnDef.count + ((gameLevel - 1) * (spawnDef.countFactor || 0)),
                    threat: fragment.threat
                });
            });

            currentThreat += fragment.threat;
            attempts++;
        }

        return currentThreat;
    }

    spawnEnemiesFromTemplate(waveTemplate) {
        let totalDelay = 0; // in seconds
        const enemySpriteSize = 20;

        waveTemplate.forEach(spawn => {
            // Get enemy definition and calculate speed for this level
            const enemyDef = settings.enemyTypes[spawn.enemyType];
            const speedFactor = enemyDef.levelFactors?.speed ?? settings.leveling.speedFactor;
            const level0 = spawn.level > 0 ? spawn.level - 1 : 0;
            const enemySpeed = enemyDef.baseSpeed * Math.pow(speedFactor, level0);

            // Calculate cooldown based on spacing and speed
            const desiredSpacing = (spawn.spacing || 1) * enemySpriteSize;
            const coolDown = (desiredSpacing / enemySpeed); // in seconds

            // Add all enemies in this wave fragment to spawn queue
            for (let i = 0; i < spawn.count; i++) {
                this.spawnQueue.push({
                    enemyType: spawn.enemyType,
                    level: spawn.level,
                    wave: this.waveCounter,
                    timeUntilSpawn: totalDelay + (i * coolDown)
                });
            }

            // Next wave fragment starts after all enemies are spawned
            totalDelay += spawn.count * coolDown;
        });
    }

    processSpawnQueue(deltaTime) {
        // Decrease time for all items in queue
        for (let i = this.spawnQueue.length - 1; i >= 0; i--) {
            this.spawnQueue[i].timeUntilSpawn -= deltaTime;

            // Spawn if time has come
            if (this.spawnQueue[i].timeUntilSpawn <= 0) {
                const spawn = this.spawnQueue[i];
                this.enemies.create(spawn.enemyType, spawn.level, spawn.wave);
                this.spawnQueue.splice(i, 1); // Remove from queue
            }
        }
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