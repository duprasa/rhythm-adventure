import Phaser from 'phaser';
import { BeatManager } from '../systems/BeatManager';
import { Level } from '../world/Level';
import { GridPhysics } from '../world/GridPhysics';
import { Direction, TILE_SIZE, TileType } from '../utils/Constants';

export class Player {
    private scene: Phaser.Scene;
    private beatManager: BeatManager;
    private level: Level;
    private physics: GridPhysics;
    
    private x: number;
    private y: number;
    private sprite: Phaser.GameObjects.Rectangle;
    
    private isRunning: boolean = false;
    private queuedMove: Direction = Direction.NONE;
    private lastActionBeat: number = 0;
    
    private hp: number = 4;
    private lastSafeX: number;
    private lastSafeY: number;
    private isRespawning: boolean = false;

    private attackStartBeat: number = 0;
    private isCharging: boolean = false;

    // Gamepad State
    private lastButtonState: { [key: string]: boolean } = {};
    private lastDpadState: { up: boolean, down: boolean, left: boolean, right: boolean } = { up: false, down: false, left: false, right: false };

    private readonly TOLERANCE = 150; // ms

    constructor(scene: Phaser.Scene, beatManager: BeatManager, level: Level, x: number, y: number) {
        this.scene = scene;
        this.beatManager = beatManager;
        this.level = level;
        this.physics = new GridPhysics(level);
        this.x = x;
        this.y = y;
        this.lastSafeX = x;
        this.lastSafeY = y;

        // Initial Position
        this.sprite = scene.add.rectangle(
            x * TILE_SIZE + TILE_SIZE / 2,
            y * TILE_SIZE + TILE_SIZE / 2,
            TILE_SIZE - 4,
            TILE_SIZE - 4,
            0x00ffff
        );
        this.sprite.setDepth(2);

        this.setupInput();
        
        this.beatManager.on('beat', (beatCount: number) => this.onBeat(beatCount));
        
        // Gamepad listener for polling in update loop if needed, but we can use scene.input.gamepad events
        // However, standard Gamepad API might be better for consistent polling or use Phaser's event system
        this.scene.input.gamepad?.on('connected', (pad: Phaser.Input.Gamepad.Gamepad) => {
             console.log("Gamepad Connected", pad.id);
        });
    }

    public update(delta: number) {
        this.handleGamepadInput();
    }

    private setupInput() {
        this.scene.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
            if (this.isRespawning) return;

            const moveDir = this.getMoveDirection(event);
            if (moveDir !== Direction.NONE) {
                this.handleMoveInput(moveDir);
            }
            
            const attackDir = this.getAttackDirection(event);
            if (attackDir !== Direction.NONE) {
                if (!this.isCharging) {
                    this.isCharging = true;
                    this.attackStartBeat = this.beatManager.getTotalBeats();
                    this.handleAttackInput(attackDir); // Regular attack on press
                    // Visual: Start Charging
                    this.sprite.setStrokeStyle(4, 0xff00ff);
                }
            }
        });

        this.scene.input.keyboard!.on('keyup', (event: KeyboardEvent) => {
            const attackDir = this.getAttackDirection(event);
            if (attackDir !== Direction.NONE && this.isCharging) {
                this.endCharge(attackDir);
            }
        });
    }
    
    private handleGamepadInput() {
        if (!this.scene.input.gamepad || this.scene.input.gamepad.total === 0) return;
        if (this.isRespawning) return;

        const pad = this.scene.input.gamepad.getPad(0);
        if (!pad) return;

        // Movement (DPad)
        const up = pad.up;
        const down = pad.down;
        const left = pad.left;
        const right = pad.right;

        if (up && !this.lastDpadState.up) this.handleMoveInput(Direction.UP);
        if (down && !this.lastDpadState.down) this.handleMoveInput(Direction.DOWN);
        if (left && !this.lastDpadState.left) this.handleMoveInput(Direction.LEFT);
        if (right && !this.lastDpadState.right) this.handleMoveInput(Direction.RIGHT);

        this.lastDpadState = { up, down, left, right };

        // Attacks (A/B/X/Y) -> Mapped to directions
        // Y (Top) -> Up
        // A (Bottom) -> Down
        // X (Left) -> Left
        // B (Right) -> Right
        // Phaser mapping (Xbox style usually):
        // A = 0, B = 1, X = 2, Y = 3
        // But layouts vary. Let's assume:
        // 3 (Y) -> Up
        // 0 (A) -> Down
        // 2 (X) -> Left
        // 1 (B) -> Right
        
        const Y = pad.buttons[3].pressed;
        const A = pad.buttons[0].pressed;
        const X = pad.buttons[2].pressed;
        const B = pad.buttons[1].pressed;

        this.processButtonAttack(Y, 'Y', Direction.UP);
        this.processButtonAttack(A, 'A', Direction.DOWN);
        this.processButtonAttack(X, 'X', Direction.LEFT);
        this.processButtonAttack(B, 'B', Direction.RIGHT);
    }
    
    private processButtonAttack(pressed: boolean, key: string, dir: Direction) {
        if (pressed && !this.lastButtonState[key]) {
            // Button Down
            if (!this.isCharging) {
                this.isCharging = true;
                this.attackStartBeat = this.beatManager.getTotalBeats();
                this.handleAttackInput(dir);
                this.sprite.setStrokeStyle(4, 0xff00ff);
            }
        } else if (!pressed && this.lastButtonState[key]) {
            // Button Up
            if (this.isCharging) {
               this.endCharge(dir);
            }
        }
        this.lastButtonState[key] = pressed;
    }

    private endCharge(attackDir: Direction) {
        this.isCharging = false;
        this.sprite.setStrokeStyle(0); // Clear stroke
        
        const currentBeat = this.beatManager.getTotalBeats();
        const duration = currentBeat - this.attackStartBeat;
        
        // Check if we are releasing ON the beat (or close to it)
        const isBeat = this.beatManager.isBeat(this.TOLERANCE);

        if (Math.abs(duration - 2) <= 0.5 && isBeat) {
            this.performChargeAttack(attackDir);
        }
    }

    private getMoveDirection(event: KeyboardEvent): Direction {
        switch (event.code) {
            case 'KeyW': return Direction.UP;
            case 'KeyS': return Direction.DOWN;
            case 'KeyA': return Direction.LEFT;
            case 'KeyD': return Direction.RIGHT;
            default: return Direction.NONE;
        }
    }

    private getAttackDirection(event: KeyboardEvent): Direction {
        switch (event.code) {
            case 'ArrowUp': return Direction.UP;
            case 'ArrowDown': return Direction.DOWN;
            case 'ArrowLeft': return Direction.LEFT;
            case 'ArrowRight': return Direction.RIGHT;
            default: return Direction.NONE;
        }
    }

    private handleMoveInput(direction: Direction) {
        const isBeat = this.beatManager.isBeat(this.TOLERANCE);
        const isHalfBeat = this.beatManager.isHalfBeat(this.TOLERANCE);

        if (isBeat) {
            if (this.isRunning) {
                this.move(direction);
                this.lastActionBeat = this.beatManager.getTotalBeats();
            } else {
                // Primed mode
                this.queuedMove = direction;
                this.sprite.setFillStyle(0xffff00); // Yellow for Primed
                this.lastActionBeat = this.beatManager.getTotalBeats();
            }
        } else if (isHalfBeat) {
            if (!this.isRunning && this.queuedMove === direction) {
                // Enter Running Mode
                this.isRunning = true;
                this.move(direction); // Execute the second tap immediately?
                this.sprite.setFillStyle(0xff0000); // Red for Running
                this.queuedMove = Direction.NONE; // Clear queue as we executed
            }
        } else {
            // Miss / Off-beat input
            console.log('Move Miss!');
            this.isRunning = false;
            this.sprite.setFillStyle(0x00ffff); // Reset color
        }
    }

    private handleAttackInput(direction: Direction) {
        const isBeat = this.beatManager.isBeat(this.TOLERANCE);
        
        if (isBeat) {
            const target = this.physics.getTargetPosition(this.x, this.y, direction);
            if (target) {
                console.log(`Attacking ${direction} at ${target.x}, ${target.y}`);
                this.scene.events.emit('player-attack', { x: target.x, y: target.y });
                this.showAttackAnim(direction);
            }
        } else {
            console.log("Attack Miss!");
        }
    }
    
    private performChargeAttack(direction: Direction) {
        console.log("CHARGE ATTACK!");
        const target = this.physics.getTargetPosition(this.x, this.y, direction);
        if (target) {
             this.scene.events.emit('player-attack', { x: target.x, y: target.y, damage: 3 });
             
             // Extended Range
             const target2 = this.physics.getTargetPosition(target.x, target.y, direction);
             if(target2) {
                 this.scene.events.emit('player-attack', { x: target2.x, y: target2.y, damage: 3 });
             }

             // Visual
             this.showChargeAttackAnim(direction);
        }
    }

    private showAttackAnim(direction: Direction) {
        // Visual feedback for attack
        const offset = 20;
        let tx = this.sprite.x;
        let ty = this.sprite.y;
        
        if (direction === Direction.UP) ty -= offset;
        if (direction === Direction.DOWN) ty += offset;
        if (direction === Direction.LEFT) tx -= offset;
        if (direction === Direction.RIGHT) tx += offset;

        const slash = this.scene.add.rectangle(tx, ty, 20, 20, 0xffffff);
        this.scene.tweens.add({
            targets: slash,
            alpha: 0,
            duration: 100,
            onComplete: () => slash.destroy()
        });
    }
    
    private showChargeAttackAnim(direction: Direction) {
        const offset = 40;
        let tx = this.sprite.x;
        let ty = this.sprite.y;
        
        if (direction === Direction.UP) ty -= offset;
        if (direction === Direction.DOWN) ty += offset;
        if (direction === Direction.LEFT) tx -= offset;
        if (direction === Direction.RIGHT) tx += offset;

        const slash = this.scene.add.rectangle(tx, ty, 40, 40, 0xff00ff); // Purple
        this.scene.tweens.add({
            targets: slash,
            scaleX: 2,
            scaleY: 2,
            alpha: 0,
            duration: 300,
            onComplete: () => slash.destroy()
        });
    }

    private onBeat(beatCount: number) {
        if (this.isRespawning) {
            this.completeRespawn();
            return;
        }

        // Execute Queued Move
        if (!this.isRunning && this.queuedMove !== Direction.NONE) {
            this.move(this.queuedMove);
            this.queuedMove = Direction.NONE;
            this.sprite.setFillStyle(0x00ffff); // Back to normal
        }

        // Check momentum loss
        if (this.isRunning) {
            if (beatCount - this.lastActionBeat > 1) {
                this.isRunning = false;
                this.sprite.setFillStyle(0x00ffff);
                console.log('Momentum Lost');
            }
        }
    }

    private move(direction: Direction) {
        const prevX = this.x;
        const prevY = this.y;

        if (this.physics.canMove(this.x, this.y, direction)) {
            const target = this.physics.getTargetPosition(this.x, this.y, direction);
            if (target) {
                this.x = target.x;
                this.y = target.y;
                
                this.updateSpritePosition();
                this.checkTileInteraction(prevX, prevY);
            }
        } else {
            // Bump effect
             const target = this.physics.getTargetPosition(this.x, this.y, direction);
             if(target) {
                this.scene.tweens.add({
                    targets: this.sprite,
                    x: this.sprite.x + (target.x - this.x) * 5,
                    y: this.sprite.y + (target.y - this.y) * 5,
                    duration: 50,
                    yoyo: true
                });
             }
        }
    }

    private updateSpritePosition() {
        this.scene.tweens.add({
            targets: this.sprite,
            x: this.x * TILE_SIZE + TILE_SIZE / 2,
            y: this.y * TILE_SIZE + TILE_SIZE / 2,
            duration: 100,
            ease: 'Quad.easeOut'
        });
    }

    private checkTileInteraction(prevX: number, prevY: number) {
        const tile = this.level.getTileAt(this.x, this.y);
        
        if (tile === TileType.PIT) {
            console.log("Fell in PIT");
            this.takeDamage(1);
            this.startRespawn();
        } else if (tile === TileType.SPIKE) {
            console.log("Hit SPIKE");
            this.takeDamage(1);
            this.x = prevX;
            this.y = prevY;
            this.updateSpritePosition();
        } else if (tile === TileType.AREA_TRANSITION) {
            console.log("Area Transition");
            this.scene.events.emit('area-transition');
        } else {
            if (tile === TileType.FLOOR) {
                this.lastSafeX = this.x;
                this.lastSafeY = this.y;
            }
        }
    }

    public takeDamage(amount: number) {
        this.hp -= amount;
        console.log(`HP: ${this.hp}`);
        this.scene.events.emit('player-hp-change', this.hp);
        if (this.hp <= 0) {
            this.die();
        }
    }

    private startRespawn() {
        this.isRespawning = true;
        this.sprite.setVisible(false);
    }

    private completeRespawn() {
        if (!this.isRespawning) return;
        
        this.x = this.lastSafeX;
        this.y = this.lastSafeY;
        this.isRespawning = false;
        this.sprite.setVisible(true);
        this.updateSpritePosition();
        console.log("Respawned");
    }

    private die() {
        console.log("Player Died");
        this.scene.events.emit('player-died');
    }
    
    public getX() { return this.x; }
    public getY() { return this.y; }
    public getHP() { return this.hp; }
}
