export type Vector3 = { x: number; y: number; z: number };

export interface SnakeSegment {
  pos: Vector3;
  normal: Vector3;
}

export type GameState = 'START' | 'PLAYING' | 'GAME_OVER' | 'GAME_WON';

export interface GameStateData {
  snake: SnakeSegment[];
  food: SnakeSegment; // Food has pos and normal (face)
  direction: Vector3;
  nextDirection: Vector3; // Buffer for input
  score: number;
  highScore: number;
  status: GameState;
  elapsedTime: number; // Duration in seconds
}

export const GRID_SIZE = 9;
export const HALF_GRID = 4; // -4 to 4 range