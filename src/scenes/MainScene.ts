import Phaser from 'phaser';
import { BeatManager } from '../systems/BeatManager';
import { Level } from '../world/Level';
import { Player } from '../entities/Player';
import { Enemy, EnemyType } from '../entities/Enemy';
import { HUD } from '../ui/HUD';

export class MainScene extends Phaser.Scene {
    private beatManager!: BeatManager;
    private level!: Level;
    private player!: Player;
    private enemies: Enemy[] = [];
    private hud!: HUD;
    private isGameOver: boolean = false;
    private currentLevelIndex: number = 0;
    private pendingTransition: boolean = false;

    constructor() {
        super('MainScene');
    }

    init(data: { levelIndex?: number }) {
        this.currentLevelIndex = data.levelIndex || 0;
    }

    create() {
        this.isGameOver = false;
        this.pendingTransition = false;

        // 120 BPM
        this.beatManager = new BeatManager(this, 120);
        
        this.level = new Level(this, this.currentLevelIndex);
        this.level.render();
        
        // Initial Player Position depending on level?
        // Simplified: Just use fixed spawn for now, or logic based on level
        let spawnX = 2;
        let spawnY = 2;
        if (this.currentLevelIndex === 1) {
            spawnX = 8;
            spawnY = 12;
        }

        this.player = new Player(this, this.beatManager, this.level, spawnX, spawnY);

        // Add enemies based on level
        this.enemies = [];
        if (this.currentLevelIndex === 0) {
            this.enemies.push(new Enemy(this, this.level, this.player, 4, 4, EnemyType.STATIC));
            this.enemies.push(new Enemy(this, this.level, this.player, 8, 8, EnemyType.WANDERER));
            this.enemies.push(new Enemy(this, this.level, this.player, 10, 4, EnemyType.AGGRESSIVE));
        } else {
             // Different enemies for level 1
             this.enemies.push(new Enemy(this, this.level, this.player, 6, 6, EnemyType.AGGRESSIVE));
        }

        this.hud = new HUD(this, this.beatManager);

        this.beatManager.on('beat', (beatCount: number) => {
            if (this.isGameOver) return;

            if (this.pendingTransition) {
                this.handleTransition();
                return;
            }

            console.log(`Beat ${beatCount}`);
            this.playBeatSound();
            
            // Update Enemies
            this.enemies.forEach(e => e.onBeat(beatCount));
        });

        this.events.on('player-attack', (coords: {x: number, y: number, damage?: number}) => {
            const damage = coords.damage || 1;
            this.enemies.forEach(e => {
                if (!e.isDead && e.getX() === coords.x && e.getY() === coords.y) {
                    e.takeDamage(damage);
                }
            });
        });

        this.events.on('player-died', () => this.handlePlayerDeath());
        
        this.events.on('area-transition', () => {
            console.log("Transition Triggered");
            this.pendingTransition = true;
        });
        
        this.add.text(10, 10, `Area ${this.currentLevelIndex}`, { color: '#ffffff' });
    }

    update(time: number, delta: number) {
        this.beatManager.update(delta);
        this.hud.update(delta);
        this.player.update(delta); // Ensure player updates (for Gamepad)
    }

    private playBeatSound() {
        if (!this.sound || !this.sound.context) return;

        const ctx = this.sound.context as AudioContext;
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.1);
    }
    
    private handleTransition() {
        // Switch level index (0 <-> 1)
        const nextLevel = this.currentLevelIndex === 0 ? 1 : 0;
        this.scene.restart({ levelIndex: nextLevel });
    }

    private handlePlayerDeath() {
        if (this.isGameOver) return;
        this.isGameOver = true;

        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        const text = this.add.text(width / 2, height / 2, 'YOU DIED', {
            fontSize: '64px',
            color: '#ff0000',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5).setDepth(200);

        // Wait 4 beats then restart
        let beatCounter = 0;
        const deathHandler = (beat: number) => {
            beatCounter++;
            if (beatCounter >= 4) {
                this.beatManager.off('beat', deathHandler);
                this.scene.restart({ levelIndex: this.currentLevelIndex }); // Restart same level
            }
        };
        this.beatManager.on('beat', deathHandler);
    }
}
