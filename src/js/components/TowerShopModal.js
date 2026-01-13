import settings from '../game.settings.js';
import coinIcon from '../../img/coin.svg';

class TowerShopModal {
    constructor(game) {
        this.game = game;
    }

    open() {
        const coins = this.game.stat('coins');
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
                statsHTML += `<div>Slow: -${Math.round((1 - tower.slowEffect) * 100)}%</div>`;
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
                        <h4>${tower.label} <span class="question-sign" data-tooltip="${tower.description}">?</span></h4>
                        ${statsHTML}
                    </div>

                    <div class="tower-shop-buy-container">
                        <div class="tower-shop-item-price">
                            <img src="${coinIcon}" alt="Coins" title="Coins">
                            ${tower.costs}
                        </div>

                        <button class="btn btn-buy" data-tower-type="${towerType}" data-required-coins="${tower.costs}" data-disable-parent=".tower-shop-item">
                            Kaufen
                        </button>
                    </div>
                </div>
            `;
        });

        content += '</div>';

        this.game.modal.open('Turm kaufen', content, this.game);

        // Draw previews after modal is rendered
        this.drawPreviews(towerTypes);

        // Setup event listeners
        this.setupEventListeners();
    }

    drawPreviews(towerTypes) {
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
    }

    setupEventListeners() {
        // Add event listeners for buy buttons
        document.querySelectorAll('.modal .btn-buy[data-tower-type]').forEach(button => {
            button.addEventListener('click', (event) => {
                const towerType = event.target.getAttribute('data-tower-type');
                this.buyTower(towerType);
                this.game.modal.close();
            });
        });
    }

    buyTower(towerType) {
        if (this.game.stat('mode') !== 'dropTower') {
            if (this.game.stat('coins') >= settings.towers[towerType].costs) {
                this.game.stat('mode', 'dropTower');
                this.game.stat('selectedTowerType', towerType);
            }
        }
    }
}

export default TowerShopModal;