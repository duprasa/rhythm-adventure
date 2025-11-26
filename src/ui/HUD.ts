import Phaser from 'phaser';
import { BeatManager } from '../systems/BeatManager';

export class HUD {
    private scene: Phaser.Scene;
    private beatManager: BeatManager;
    
    // Health
    private healthContainer: Phaser.GameObjects.Container;
    private healthBlocks: Phaser.GameObjects.Rectangle[] = [];
    
    // Rhythm
    private rhythmContainer: Phaser.GameObjects.Container;
    private beatBars: Phaser.GameObjects.Rectangle[] = [];
    private inputMarkers: Phaser.GameObjects.Text[] = []; // Use text for inputs (Arrows/WASD)
    private centerLine: Phaser.GameObjects.Rectangle;
    
    private readonly CENTER_X = 400;
    private readonly Y_POS = 550;
    private readonly LOOKAHEAD_BEATS = 4; // How many beats to show on screen (right side)
    private speed: number = 0;

    constructor(scene: Phaser.Scene, beatManager: BeatManager) {
        this.scene = scene;
        this.beatManager = beatManager;

        // Health UI
        this.healthContainer = scene.add.container(20, 20);
        for (let i = 0; i < 4; i++) {
            const block = scene.add.rectangle(i * 40, 0, 30, 30, 0xff0000);
            block.setOrigin(0, 0);
            this.healthBlocks.push(block);
            this.healthContainer.add(block);
        }
        
        this.scene.events.on('player-hp-change', (hp: number) => this.updateHealth(hp));

        // Rhythm UI
        this.rhythmContainer = scene.add.container(0, this.Y_POS);
        
        // Background for rhythm bar
        const bg = scene.add.rectangle(400, 0, 800, 60, 0x222222);
        this.rhythmContainer.add(bg);
        
        // Center Line (The Target)
        this.centerLine = scene.add.rectangle(this.CENTER_X, 0, 4, 60, 0xffffff);
        this.rhythmContainer.add(this.centerLine);

        // Calculate Speed
        // We want a beat spawned at X=800 to reach X=CENTER_X in LOOKAHEAD_BEATS * BeatDuration
        const duration = this.beatManager.getBeatDuration() * this.LOOKAHEAD_BEATS;
        this.speed = (800 - this.CENTER_X) / duration; // px / ms

        // Listeners
        this.beatManager.on('beat', () => this.onBeat());
        
        // Listen for inputs to spawn markers
        this.scene.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
             this.handleInput(event);
        });
    }

    private updateHealth(hp: number) {
        this.healthBlocks.forEach((block, index) => {
            if (index < hp) {
                block.setFillStyle(0xff0000);
                block.setVisible(true);
            } else {
                block.setVisible(false);
            }
        });
    }

    private onBeat() {
        this.spawnBeatBar();
        
        // Animate Center Line
        this.scene.tweens.add({
            targets: this.centerLine,
            scaleY: 1.5,
            scaleX: 1.5,
            duration: 50,
            yoyo: true,
            ease: 'Quad.easeInOut'
        });
    }

    private spawnBeatBar() {
        // Spawn at Right Edge (800) and move Left towards Center (400)
        // This makes Right = Future, Center = Now, Left = Past
        const bar = this.scene.add.rectangle(800, 0, 4, 40, 0xaaaaaa);
        this.rhythmContainer.add(bar);
        this.beatBars.push(bar);
    }

    private handleInput(event: KeyboardEvent) {
        // Show input on the bar
        let text = '';
        if (event.code === 'ArrowUp' || event.code === 'KeyW') text = '↑';
        else if (event.code === 'ArrowDown' || event.code === 'KeyS') text = '↓';
        else if (event.code === 'ArrowLeft' || event.code === 'KeyA') text = '←';
        else if (event.code === 'ArrowRight' || event.code === 'KeyD') text = '→';
        else return;

        // Spawn at Center
        const marker = this.scene.add.text(this.CENTER_X, 0, text, { 
            fontSize: '24px', 
            color: '#ffff00' 
        });
        marker.setOrigin(0.5);
        this.rhythmContainer.add(marker);
        this.inputMarkers.push(marker);
    }

    public update(delta: number) {
        // Move Beat Bars (Right -> Left)
        for (let i = this.beatBars.length - 1; i >= 0; i--) {
            const bar = this.beatBars[i];
            bar.x -= this.speed * delta;
            
            // Remove if off screen (Left side)
            if (bar.x < 0) {
                bar.destroy();
                this.beatBars.splice(i, 1);
            }
        }

        // Move Input Markers (Center -> Left)
        for (let i = this.inputMarkers.length - 1; i >= 0; i--) {
            const marker = this.inputMarkers[i];
            marker.x -= this.speed * delta;
            
            if (marker.x < 0) {
                marker.destroy();
                this.inputMarkers.splice(i, 1);
            }
        }
    }
}
