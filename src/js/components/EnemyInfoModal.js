import settings from '../game.settings.js';
import coinIcon from '../../img/coin.svg';

class EnemyInfoModal {
    constructor(game) {
        this.game = game;
    }

    open() {
        const currentLevel = Math.floor(this.game.waveCounter / settings.leveling.wavesPerLevel);
        const enemyTypes = Object.keys(settings.enemyTypes);

        let content = '<div class="info-grid">';

        enemyTypes.forEach(enemyType => {
            const enemy = settings.enemyTypes[enemyType];

            // Calculate stats for current level (same logic as in Enemy constructor)
            const level0 = currentLevel > 0 ? currentLevel - 1 : 0;
            const healthFactor = enemy.levelFactors?.health ?? settings.leveling.healthFactor;
            const speedFactor = enemy.levelFactors?.speed ?? settings.leveling.speedFactor;
            const rewardFactor = enemy.levelFactors?.reward ?? settings.leveling.rewardFactor;
            const critResistanceFactor = enemy.levelFactors?.critResistanceFactor ?? 1.1;

            const currentHealth = Math.round(enemy.baseHealth * Math.pow(healthFactor, level0));
            const currentSpeed = Math.round(enemy.baseSpeed * Math.pow(speedFactor, level0));
            const currentReward = Math.round(enemy.baseReward * Math.pow(rewardFactor, level0));
            const currentCritResistance = Math.round(enemy.baseCritResistance * Math.pow(critResistanceFactor, level0));

            // Generate preview canvas for enemy
            const previewId = `enemy-preview-${enemyType}`;

            let statsHTML = `
                <div>Leben: ${currentHealth}</div>
                <div>Geschwindigkeit: ${currentSpeed}</div>
                <div>Belohnung: ${currentReward} <img src="${coinIcon}" alt="Coins" class="coin-icon"></div>
                <div>Crit-Resistenz: ${currentCritResistance}%</div>
            `;

            content += `
                <div class="info-card">
                    <canvas id="${previewId}" width="80" height="80"></canvas>

                    <div class="info-card-content">
                        <h4>${enemy.label || enemyType} <span class="question-sign" data-tooltip="${enemy.description || ''}">?</span></h4>
                        ${statsHTML}
                    </div>
                </div>
            `;
        });

        content += '</div>';

        this.game.modal.open(`Gegner Info (Level ${currentLevel + 1})`, content, this.game);

        // Draw previews after modal is rendered
        this.drawPreviews(enemyTypes);
    }

    drawPreviews(enemyTypes) {
        enemyTypes.forEach(enemyType => {
            const previewCanvas = document.getElementById(`enemy-preview-${enemyType}`);
            if (previewCanvas) {
                const previewCtx = previewCanvas.getContext('2d');
                const enemy = settings.enemyTypes[enemyType];

                // Clear canvas
                previewCtx.clearRect(0, 0, 80, 80);

                // Draw enemy preview
                if (enemy.images?.complete) {
                    const img = enemy.images;
                    const sprite = img.sprites[2]; // Use direction 2 (down)

                    const frameX = sprite.frames[0]; // Frame is just the X coordinate (a number)
                    previewCtx.drawImage(
                        img,
                        frameX, sprite.y, sprite.w * 2, sprite.h * 2, // Source
                        20, 20, 40, 40 // Destination
                    );
                } else {
                    // Fallback: draw circle with enemy color
                    previewCtx.beginPath();
                    previewCtx.arc(40, 40, 20, 0, 2 * Math.PI);
                    previewCtx.fillStyle = enemy.color || '#888';
                    previewCtx.fill();
                }
            }
        });
    }
}

export default EnemyInfoModal;