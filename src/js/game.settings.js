import helpers from './helpers';
import game from './game';
import laserTowerImage from '../img/tower/laser.png';
import laserAudio from '../audio/laser.mp3';

export default {
    playerLifes: 10,	// Lebenspunkte des Spielers
    coins: 180,         // Initiale anzahl an coins

    towers: {
        laser: {
            costs: 80,		            // Kosten für einen Tower (in Coins)
            color: '#ffff03',           // Farbe der Türme (ist fix)
            size: 20,		            // Größe der Türme (fixer Radius)
            fireRange: 110,		        // Anfängliche Reichweite eines Turms (kann per Upgrade für alle Türme erhöht werden)
            damage: {from: 3, to: 4},   // Anfänglicher Schaden den ein Turm bewirkt (kann per Upgrade für alle Türme erhöht werden)
            coolDownTime: 16,	        // Anfängliche Schussverzögerung eines Turms (kann per Upgrade für alle Türme erhöht werden)
            images: helpers.createImage(laserTowerImage, [
                {x: 0, y: 0, w: 80, h: 80},
                {x: 0, y: 160, w: 80, h: 80},
                {x: 0, y: 320, w: 80, h: 80},
                {x: 0, y: 480, w: 80, h: 80},
                {x: 0, y: 640, w: 80, h: 80},
                {x: 0, y: 800, w: 80, h: 80}
            ]),
            audio: laserAudio,
            upgrades: [
                {cost: 120, fireRange: 120, damage: {from: 7, to: 11}, color: '#2CE85B'},
                {cost: 190, fireRange: 130, damage: {from: 14, to: 21}, color: '#2CE8B9'},
                {cost: 280, fireRange: 140, damage: {from: 23, to: 34}, color: '#2A62DB'}
            ]
        }

    },

    mapGrid: 80,

    enemyMinSize: 3,
    enemyLevelIncAt: 15,
    enemyLevels: [
        {speed: 1.5, health: 20, color: 'rgb(250,0,0)'},
        {speed: 2, health: 35, color: 'rgb(200,0,0)'},
        {speed: 3, health: 50, color: 'rgb(150,0,0)'},
        {speed: 4, health: 80, color: 'rgb(100,0,0)'},
        {speed: 3, health: 100, color: 'rgb(50,0,0)'},
        {speed: 2, health: 150, color: 'rgb(30,30,30)'},
        {speed: 2, health: 120, color: 'rgb(15,15,15)'},
        {speed: 5, health: 160, color: 'rgb(0,0,0)'}, // <== Endgegner
    ],

    /**
     * jedes tamplate enhält ein objekt pro spawn welle
     * jedes objekt beinhaltet folgende Variablen für die konfiguration
     * @param int count         - Anzahl der zu spawnenden Gegner
     * @param int waveFactor    - Multiplikator für die zusätzlichen gegner je welle
     * @param int coolDown      - Abstand der gegner in millisekunden
     * @param int level         - Level des gegners
     * @param int delay         - Verzögerung zum nächsten Template nach Vollendung des aktuellen
     * @param int delayFactor   - Dieser factor bestimmt wieviel des delays in den Abstand für den Spawn der nächsten Welle mit einfließt
     *                            Beispeil ein Faktor von 0.5 setzt den nächsten Teil der Welle in der Hälfte aller vorherigen Spawns ein
     */
    waves: [
        {
            name: 'A lot small enemies',
            template: [
                {count: 4, waveFactor: 1, coolDown: 800, level: 0, delay: 0, delayFactor: 0.5},
                {count: 0, waveFactor: 0.4, coolDown: 500, level: 1, delay: 0, delayFactor: 0}
            ]
        }
    ]
};