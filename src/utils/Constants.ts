export const TILE_SIZE = 32;
export const GRID_WIDTH = 16;
export const GRID_HEIGHT = 16;

export enum TileType {
    FLOOR = 0,
    WALL = 1,
    PIT = 2,
    SPIKE = 3,
    SLIDING_BOX = 4,
    AREA_TRANSITION = 5
}

export enum Direction {
    NONE = 'none',
    UP = 'up',
    DOWN = 'down',
    LEFT = 'left',
    RIGHT = 'right'
}

