import { Level } from './Level';
import { Direction, TileType, GRID_WIDTH, GRID_HEIGHT } from '../utils/Constants';

export class GridPhysics {
    private level: Level;

    constructor(level: Level) {
        this.level = level;
    }

    public canMove(x: number, y: number, direction: Direction): boolean {
        const target = this.getTargetPosition(x, y, direction);
        if (!target) return false;

        const tile = this.level.getTileAt(target.x, target.y);
        
        // Check if tile is walkable (Walls are not)
        // Enemies might have different rules, but for now assume basic wall check
        if (tile === TileType.WALL) return false;
        if (tile === null) return false; // Out of bounds

        return true;
    }

    public getTargetPosition(x: number, y: number, direction: Direction): { x: number, y: number } | null {
        let dx = 0;
        let dy = 0;
        switch (direction) {
            case Direction.UP: dy = -1; break;
            case Direction.DOWN: dy = 1; break;
            case Direction.LEFT: dx = -1; break;
            case Direction.RIGHT: dx = 1; break;
            default: return null;
        }

        const nx = x + dx;
        const ny = y + dy;

        if (nx < 0 || nx >= GRID_WIDTH || ny < 0 || ny >= GRID_HEIGHT) return null;

        return { x: nx, y: ny };
    }
}

