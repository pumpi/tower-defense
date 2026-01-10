import helpers from './helpers';
import laserTowerImage from '../img/tower/laser.png';
import laserAudio from '../audio/laser.mp3';

export default {
    playerLifes: 10,
    coins: 180,

    game: {
        soundEnabled: true,
        showNormalDamage: true,
    },

    towers: {
        laser: {
            label: 'Laser Turm',
            costs: 80,
            color: '#ffff03',
            size: 20,
            fireRange: 110,
            damage: {from: 3, to: 4},
            coolDownTime: 0.6,
            baseCritRate: 5, // Base chance in %
            baseCritDamage: 1.5, // Base multiplier
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
                {cost: 70, fireRange: 120, damage: {from: 6, to: 8}, color: '#2CE85B', critRate: 2, critDamage: 0.1},
                {cost: 180, fireRange: 130, damage: {from: 10, to: 14}, color: '#2CE8B9', critRate: 3, critDamage: 0.2},
                {cost: 250, fireRange: 140, damage: {from: 18, to: 25}, color: '#2A62DB', critRate: 5, critDamage: 0.2}
            ]
        },
        gravity: {
            label: 'Schwerkraft Generator',
            costs: 100,
            color: '#9C27B0',
            size: 20,
            fireRange: 140,
            slowEffect: 0.5, // 50% slow (enemies move at 50% speed)
            /*images: helpers.createImage(laserTowerImage, [ // Placeholder: reuse laser image for now
                {x: 0, y: 0, w: 80, h: 80},
                {x: 0, y: 160, w: 80, h: 80},
                {x: 0, y: 320, w: 80, h: 80},
                {x: 0, y: 480, w: 80, h: 80},
                {x: 0, y: 640, w: 80, h: 80},
                {x: 0, y: 800, w: 80, h: 80}
            ]),
            audio: laserAudio, // Placeholder: reuse laser audio for now */
            upgrades: [
                {cost: 80, fireRange: 160, slowEffect: 0.6, color: '#7B1FA2'},
                {cost: 150, fireRange: 180, slowEffect: 0.7, color: '#6A1B9A'},
                {cost: 220, fireRange: 200, slowEffect: 0.8, color: '#4A148C'}
            ]
        },
        flamethrower: {
            label: 'Flammenwerfer',
            costs: 120,
            color: '#FF6600',
            size: 20,
            fireRange: 100,
            coneAngle: 60, // Degrees for the cone area
            damage: {from: 2, to: 4}, // Initial hit damage
            dotDamage: {from: 1, to: 2}, // Damage over time per tick
            dotDuration: 3, // How long the DoT effect lasts (seconds)
            dotTickRate: 0.5, // Time between DoT ticks (seconds)
            dotType: 'burning', // Type of DoT (burning, poison, bleed, etc.)
            coolDownTime: 0.8,
            baseCritRate: 0, // Flamethrower doesn't crit on initial hit
            baseCritDamage: 1,
            // No image yet - will use fallback circle
            upgrades: [
                {cost: 100, fireRange: 110, coneAngle: 70, damage: {from: 3, to: 5}, dotDamage: {from: 2, to: 3}, dotDuration: 3.5, color: '#FF5500', critRate: 0, critDamage: 0},
                {cost: 200, fireRange: 120, coneAngle: 80, damage: {from: 5, to: 8}, dotDamage: {from: 3, to: 5}, dotDuration: 4, color: '#FF4400', critRate: 0, critDamage: 0},
                {cost: 300, fireRange: 130, coneAngle: 90, damage: {from: 7, to: 12}, dotDamage: {from: 5, to: 7}, dotDuration: 5, color: '#FF0000', critRate: 0, critDamage: 0}
            ]
        },
        tesla: {
            label: 'Tesla Turm',
            costs: 120,
            color: '#00FFFF', // Cyan for electricity
            size: 20,
            fireRange: 120,
            damage: {from: 12, to: 17}, // High initial damage
            coolDownTime: 4.2, // Long cooldown between shots
            baseCritRate: 5,
            baseCritDamage: 1.8,
            maxChains: 3, // Maximum number of chain jumps
            chainRange: 80, // Max distance for chain to next enemy
            chainDamageMultipliers: [1.0, 0.7, 0.5, 0.3], // Damage reduction per chain (100%, 70%, 50%, 30%)
            upgrades: [
                {cost: 100, fireRange: 120, damage: {from: 15, to: 19}, chainRange: 90, color: '#00CCCC', critRate: 3, critDamage: 0.2},
                {cost: 140, fireRange: 150, damage: {from: 18, to: 23}, chainRange: 90, color: '#0099CC', critRate: 4, critDamage: 0.3},
                {cost: 200, fireRange: 175, damage: {from: 22, to: 30}, chainRange: 100, color: '#0066CC', critRate: 5, critDamage: 0.4}
            ]
        },
        plasma: {
            label: 'Plasma Kanone',
            costs: 150,
            color: '#00ff48', // Deep sky blue
            size: 20,
            minRange: 80, // Cannot shoot close targets
            fireRange: 200, // Long range artillery
            explosionRadius: 80, // AoE damage radius (one tile)
            projectileSpeed: 180, // Projectile travel speed
            arcHeight: 80, // Height of ballistic arc
            damage: {from: 15, to: 20}, // High AoE damage
            coolDownTime: 6, // Slower fire rate
            baseCritRate: 3,
            baseCritDamage: 1.5,
            upgrades: [
                {cost: 140, fireRange: 240, explosionRadius: 90, damage: {from: 18, to: 25}, color: '#2aa127', critRate: 2, critDamage: 0.2},
                {cost: 220, fireRange: 280, explosionRadius: 100, damage: {from: 22, to: 28}, color: '#21871e', critRate: 3, critDamage: 0.2},
                {cost: 320, fireRange: 310, explosionRadius: 110, damage: {from: 26, to: 38}, color: '#064e03', critRate: 5, critDamage: 0.3}
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
            baseCritResistance: 5,
            levelFactors: {
                health: 1.6,
                speed: 1.1,
                critResistanceFactor: 1.1,
            }
        },
        'bug': {
            graphic: 'bug',
            baseHealth: 18,
            baseSpeed: 90,
            baseReward: 4,
            baseCritResistance: 2,
            levelFactors: {
                health: 1.5,
                speed: 1.2,
                critResistanceFactor: 1.1,
            }
        },
        'slime': {
            color: '#8A2BE2',
            baseHealth: 100,
            baseSpeed: 30,
            baseReward: 10,
            baseCritResistance: 0, // Slimes are easy to crit
            levelFactors: {
                health: 1.8,
                speed: 1.0,
                critResistanceFactor: 1.05,
            }
        },
        'scout': {
            color: '#FFD700',
            baseHealth: 10,
            baseSpeed: 160,
            baseReward: 3,
            baseCritResistance: 10, // Scouts are dodgy
            levelFactors: {
                health: 1.3,
                speed: 1.05,
                critResistanceFactor: 1.2,
            }
        },
        'boss': {
            graphic: 'wisp',
            color: 'black',
            baseHealth: 400,
            baseSpeed: 40,
            baseReward: 100,
            baseCritResistance: 50, // Bosses are very resistant
            levelFactors: {
                health: 2.5,
                speed: 1.1,
                critResistanceFactor: 1.4,
            }
        }
    },

    // A pool of small, reusable patterns for the dynamic wave generator
    waveFragments: {
        line_of_wisps: { threat: 15, details: { enemyType: 'wisp', count: 5, spacing: 2, countFactor: 1 } },
        lone_slime: { threat: 15, details: { enemyType: 'slime', count: 1, spacing: 2, countFactor: 1 } },
        rush_of_bugs: { threat: 25, details: { enemyType: 'bug', count: 4, spacing: 2.5, countFactor: 1.2 } },
        pair_of_slimes: { threat: 20, details: { enemyType: 'slime', count: 2, spacing: 3, countFactor: 1.2 } },
        scout_rush: { threat: 30, details: { enemyType: 'scout', count: 6, spacing: 2, countFactor: 2 } },
        mixed_pair: { threat: 45, details: [
            { enemyType: 'wisp', count: 5, spacing: 2, countFactor: 1.5 },
            { enemyType: 'bug', count: 5, spacing: 3, countFactor: 1.5 }
        ]}
    },

    // A pool of fillups
    fillUpFragments: {
        fill_up_wisps: { threat: 4, details: { enemyType: 'wisp', count: 2, spacing: 2, countFactor: 1.1 } },
        fill_up_bugs: { threat: 5, details: { enemyType: 'bug', count: 2, spacing: 2.5, countFactor: 1.2 } },
        fill_up_scouts: { threat: 6, details: { enemyType: 'scout', count: 3, spacing: 3, countFactor: 1.6 } }
    },

    // Defines the boss wave
    bossWaveTemplate: [
      { enemyType: 'boss', count: 1, spacing: 0 }
    ]
};