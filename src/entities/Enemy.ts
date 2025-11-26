import Phaser from 'phaser';
import { Level } from '../world/Level';
import { GridPhysics } from '../world/GridPhysics';
import { Direction, TILE_SIZE } from '../utils/Constants';
import { Player } from './Player';

export enum EnemyType {
    STATIC = 0,
    WANDERER = 1,
    AGGRESSIVE = 2
}

export class Enemy {
    private scene: Phaser.Scene;
    private level: Level;
    private physics: GridPhysics;
    private player: Player; 
    
    private x: number;
    private y: number;
    private sprite: Phaser.GameObjects.Rectangle;
    private type: EnemyType;
    public isDead: boolean = false;

    constructor(scene: Phaser.Scene, level: Level, player: Player, x: number, y: number, type: EnemyType) {
        this.scene = scene;
        this.level = level;
        this.physics = new GridPhysics(level);
        this.player = player;
        this.x = x;
        this.y = y;
        this.type = type;

        let color = 0xff00ff;
        if (type === EnemyType.STATIC) color = 0x888888; // Grey
        if (type === EnemyType.WANDERER) color = 0x00ff00; // Green
        if (type === EnemyType.AGGRESSIVE) color = 0xff0000; // Red

        this.sprite = scene.add.rectangle(
            x * TILE_SIZE + TILE_SIZE / 2,
            y * TILE_SIZE + TILE_SIZE / 2,
            TILE_SIZE - 8,
            TILE_SIZE - 8,
            color
        );
        
        // Z-index above floor but below player?
        this.sprite.setDepth(1);
        this.player['sprite'].setDepth(2); // Hacky, should expose sprite or depth
    }

    public onBeat(beatCount: number) {
        if (this.isDead) return;

        if (this.type === EnemyType.STATIC) return;

        if (this.type === EnemyType.WANDERER) {
            this.moveRandomly();
        } else if (this.type === EnemyType.AGGRESSIVE) {
             // Logic: if adjacent to player for 1 beat -> Attack
             // Simplified: If adjacent, Attack. Else Move Randomly.
             if (this.isAdjacentToPlayer()) {
                 // Attack visual
                 this.scene.tweens.add({
                     targets: this.sprite,
                     scaleX: 1.2,
                     scaleY: 1.2,
                     yoyo: true,
                     duration: 100
                 });
                 this.player.takeDamage(1);
             } else {
                 this.moveRandomly();
             }
        }
        
        this.checkPlayerCollision();
    }

    private moveRandomly() {
        const dirs = [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT];
        // Try 4 times to find a valid move
        for (let i = 0; i < 4; i++) {
            const dir = dirs[Math.floor(Math.random() * dirs.length)];
            if (this.physics.canMove(this.x, this.y, dir)) {
                const target = this.physics.getTargetPosition(this.x, this.y, dir);
                if (target) {
                    // Don't walk into player
                    if (target.x === this.player.getX() && target.y === this.player.getY()) {
                        // Do nothing, or attack?
                        continue;
                    }
                    
                    // Don't walk into other enemies (need a check, but ignoring for now)
                    
                    this.x = target.x;
                    this.y = target.y;
                    this.updateSprite();
                    return; 
                }
            }
        }
    }
    
    private isAdjacentToPlayer(): boolean {
        const dx = Math.abs(this.x - this.player.getX());
        const dy = Math.abs(this.y - this.player.getY());
        return (dx + dy) === 1;
    }

    private checkPlayerCollision() {
        if (this.x === this.player.getX() && this.y === this.player.getY()) {
             this.player.takeDamage(1);
        }
    }

    private updateSprite() {
        this.scene.tweens.add({
            targets: this.sprite,
            x: this.x * TILE_SIZE + TILE_SIZE / 2,
            y: this.y * TILE_SIZE + TILE_SIZE / 2,
            duration: 100,
            ease: 'Quad.easeOut'
        });
    }

    public takeDamage(amount: number) {
        this.isDead = true;
        this.sprite.destroy();
        console.log("Enemy died");
    }
    
    public getX() { return this.x; }
    public getY() { return this.y; }
}

