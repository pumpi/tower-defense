import settings from '../game.settings.js';

class SettingsModal {
    constructor(game) {
        this.game = game;
    }

    open() {
        const content = `
            <div>
                <label>
                    <input type="checkbox" id="setting-sound-enabled" ${this.game.stat('soundEnabled') ? 'checked' : ''}>
                    Sound aktivieren
                </label>
            </div>
            <div>
                <label>
                    <input type="checkbox" id="setting-show-normal-damage" ${this.game.stat('showNormalDamage') ? 'checked' : ''}>
                    Normale Schadenszahlen anzeigen (Crits immer anzeigen)
                </label>
            </div>
        `;

        this.game.modal.open(`Einstellungen`, content, this.game);

        document.getElementById('setting-sound-enabled').addEventListener('change', (event) => {
            this.game.stat('soundEnabled', event.target.checked);
            this.game.saveSettings();
        });

        document.getElementById('setting-show-normal-damage').addEventListener('change', (event) => {
            this.game.stat('showNormalDamage', event.target.checked);
            this.game.saveSettings();
        });
    }


}

export default SettingsModal;