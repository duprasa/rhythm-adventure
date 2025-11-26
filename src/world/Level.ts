import Phaser from 'phaser';
import { TILE_SIZE, TileType, GRID_WIDTH, GRID_HEIGHT } from '../utils/Constants';

export class Level {
    private scene: Phaser.Scene;
    private tiles: TileType[][];
    private graphics: Phaser.GameObjects.Graphics;

    constructor(scene: Phaser.Scene, levelIndex: number = 0) {
        this.scene = scene;
        this.tiles = [];
        this.graphics = scene.add.graphics();
        
        this.generateLevel(levelIndex);
    }

    private generateLevel(index: number) {
        // Initialize empty grid
        for (let y = 0; y < GRID_HEIGHT; y++) {
            this.tiles[y] = [];
            for (let x = 0; x < GRID_WIDTH; x++) {
                if (x === 0 || x === GRID_WIDTH - 1 || y === 0 || y === GRID_HEIGHT - 1) {
                    this.tiles[y][x] = TileType.WALL;
                } else {
                    this.tiles[y][x] = TileType.FLOOR;
                }
            }
        }

        if (index === 0) {
            // Level 0: Original
            this.tiles[5][5] = TileType.PIT;
            this.tiles[5][8] = TileType.SPIKE;
            this.tiles[8][5] = TileType.WALL;
            // Exit at Bottom
            this.tiles[GRID_HEIGHT-2][GRID_WIDTH/2] = TileType.AREA_TRANSITION; 
        } else {
            // Level 1: Test Area
            // Some different layout
            this.tiles[4][4] = TileType.WALL;
            this.tiles[4][12] = TileType.WALL;
            this.tiles[12][4] = TileType.WALL;
            this.tiles[12][12] = TileType.WALL;
            
            // Exit at Top
            this.tiles[1][GRID_WIDTH/2] = TileType.AREA_TRANSITION;
        }
    }

    public render() {
        this.graphics.clear();
        
        for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                const type = this.tiles[y][x];
                const px = x * TILE_SIZE;
                const py = y * TILE_SIZE;

                let color = 0x000000;
                switch (type) {
                    case TileType.FLOOR: color = 0x444444; break;
                    case TileType.WALL: color = 0x888888; break;
                    case TileType.PIT: color = 0x111111; break;
                    case TileType.SPIKE: color = 0xaa0000; break;
                    case TileType.SLIDING_BOX: color = 0x8b4513; break;
                    case TileType.AREA_TRANSITION: color = 0x00ff00; break;
                }

                this.graphics.fillStyle(color);
                this.graphics.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                this.graphics.lineStyle(1, 0x222222);
                this.graphics.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
            }
        }
    }

    public getTileAt(x: number, y: number): TileType | null {
        if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) return null;
        return this.tiles[y][x];
    }

    public setTileAt(x: number, y: number, type: TileType) {
        if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) return;
        this.tiles[y][x] = type;
        this.render();
    }
    
    public loadLevelData(data: TileType[][]) {
        this.tiles = data;
        this.render();
    }
}
