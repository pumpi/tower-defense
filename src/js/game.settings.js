import helpers from './helpers';
import laserTowerImage from '../img/tower/laser.png';
import laserAudio from '../audio/laser.mp3';

export default {
    playerLifes: 10,
    coins: 180,

    towers: {
        laser: {
            costs: 80,
            color: '#ffff03',
            size: 20,
            fireRange: 110,
            damage: {from: 3, to: 4},
            coolDownTime: 0.6,
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
                {cost: 70, fireRange: 120, damage: {from: 6, to: 8}, color: '#2CE85B'},
                {cost: 180, fireRange: 130, damage: {from: 10, to: 14}, color: '#2CE8B9'},
                {cost: 250, fireRange: 140, damage: {from: 18, to: 25}, color: '#2A62DB'}
            ]
        }
    },

    mapGrid: 80,

    // Defines how the game's difficulty scales over time
    leveling: {
        wavesPerLevel: 10, // A new "game level" every 10 waves (after each boss)
        healthFactor: 1.4, // Default health multiplier per level
        speedFactor: 1.05, // Default speed multiplier per level
        rewardFactor: 1.2,  // Default reward multiplier per level
        waveGeneration: {
            minThreat: 15, // Threat level for the first wave in a cycle (e.g., wave 1, 11, etc.)
            maxThreat: 100, // Threat level for the last wave before a boss (e.g., wave 9, 19, etc.)
            threatFactor: 1.2, // The budget scales by this factor each game level
        }
    },

    // Defines the core archetypes of enemies
    enemyTypes: {
        'wisp': {
            graphic: 'wisp',
            baseHealth: 24,
            baseSpeed: 50,
            baseReward: 5,
            levelFactors: {
                health: 1.6,
                speed: 1.1,
            }
        },
        'bug': {
            graphic: 'bug',
            baseHealth: 18,
            baseSpeed: 90,
            baseReward: 5,
            levelFactors: {
                health: 1.5,
                speed: 1.2,
            }
        },
        'slime': {
            color: '#8A2BE2',
            baseHealth: 100,
            baseSpeed: 30,
            baseReward: 10,
            levelFactors: {
                health: 1.8,
                speed: 1.0,
            }
        },
        'scout': {
            color: '#FFD700',
            baseHealth: 10,
            baseSpeed: 160,
            baseReward: 8,
            levelFactors: {
                health: 1.3,
                speed: 1.05,
            }
        },
        'boss': {
            graphic: 'wisp',
            color: 'black',
            baseHealth: 400,
            baseSpeed: 40,
            baseReward: 100,
            levelFactors: {
                health: 2.5,
                speed: 1.3,
            }
        }
    },

    // A pool of small, reusable patterns for the dynamic wave generator
    waveFragments: {
        line_of_wisps: { threat: 15, details: { enemyType: 'wisp', count: 5, coolDown: 800, countFactor: 1, delay: 600 } },
        lone_slime: { threat: 15, details: { enemyType: 'slime', count: 1, coolDown: 400, countFactor: 1, delay: 1500 } },
        rush_of_bugs: { threat: 25, details: { enemyType: 'bug', count: 4, coolDown: 300, countFactor: 1.2, delay: 400 } },
        pair_of_slimes: { threat: 20, details: { enemyType: 'slime', count: 2, coolDown: 2200, countFactor: 1.2, delay: 1500 } },
        scout_rush: { threat: 30, details: { enemyType: 'scout', count: 5, coolDown: 200, countFactor: 2, delay: 400 } },
        mixed_pair: { threat: 40, details: [
            { enemyType: 'wisp', count: 5, coolDown: 800, countFactor: 1.5, delay: 500 },
            { enemyType: 'bug', count: 4, coolDown: 500, countFactor: 1.5, delay: 500 }
        ]}
    },
    
    // Defines the boss wave
    bossWaveTemplate: [
      { enemyType: 'boss', count: 1, coolDown: 0 }
    ]
};