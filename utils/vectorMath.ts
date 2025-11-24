import { Vector3, HALF_GRID, SnakeSegment } from '../types';

export const vec = (x: number, y: number, z: number): Vector3 => ({ x, y, z });

export const add = (a: Vector3, b: Vector3): Vector3 => ({
  x: a.x + b.x,
  y: a.y + b.y,
  z: a.z + b.z,
});

export const sub = (a: Vector3, b: Vector3): Vector3 => ({
  x: a.x - b.x,
  y: a.y - b.y,
  z: a.z - b.z,
});

export const mul = (a: Vector3, s: number): Vector3 => ({
  x: a.x * s,
  y: a.y * s,
  z: a.z * s,
});

export const cross = (a: Vector3, b: Vector3): Vector3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});

export const dot = (a: Vector3, b: Vector3): number => 
  a.x * b.x + a.y * b.y + a.z * b.z;

export const mag = (a: Vector3): number => Math.sqrt(dot(a, a));

export const distSq = (a: Vector3, b: Vector3): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return dx*dx + dy*dy + dz*dz;
};

export const normalize = (a: Vector3): Vector3 => {
  const m = mag(a);
  return m === 0 ? vec(0, 0, 0) : mul(a, 1 / m);
};

export const equals = (a: Vector3, b: Vector3): boolean =>
  a.x === b.x && a.y === b.y && a.z === b.z;

// Check if a position is effectively on the snake
export const isColliding = (pos: Vector3, snake: { pos: Vector3 }[]): boolean => {
  return snake.some((seg) => equals(seg.pos, pos));
};

// Generate random int between min and max (inclusive)
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// Cache of all possible surface positions to optimize generation
let surfaceCache: Vector3[] | null = null;

const getSurfaceCoordinates = (): Vector3[] => {
  if (surfaceCache) return surfaceCache;
  
  const coords: Vector3[] = [];
  const limit = HALF_GRID;
  
  for (let x = -limit; x <= limit; x++) {
    for (let y = -limit; y <= limit; y++) {
      for (let z = -limit; z <= limit; z++) {
        // A point is on the surface if at least one coordinate is at the limit (+-4)
        if (Math.abs(x) === limit || Math.abs(y) === limit || Math.abs(z) === limit) {
          coords.push(vec(x, y, z));
        }
      }
    }
  }
  surfaceCache = coords;
  return coords;
}

// Generate a random valid position on the surface efficiently
export const randomSpawn = (excludeSnake: { pos: Vector3 }[] = []): { pos: Vector3, normal: Vector3 } => {
  const allSurfacePoints = getSurfaceCoordinates();
  
  // Create a Set of occupied string keys for O(1) lookup
  const occupied = new Set<string>();
  excludeSnake.forEach(s => occupied.add(`${s.pos.x},${s.pos.y},${s.pos.z}`));
  
  // Filter available points
  const available = allSurfacePoints.filter(p => !occupied.has(`${p.x},${p.y},${p.z}`));
  
  if (available.length === 0) {
     // Should typically be handled by Game Won state, but fallback safely
     return { pos: vec(0,0,0), normal: vec(0,0,1) }; 
  }

  // Pick random
  const pos = available[Math.floor(Math.random() * available.length)];
  
  // Calculate Normal for this position
  // The normal is the axis which is at the limit
  // If multiple (corners), we can pick any valid one, but ideally the one we "landed" on.
  // For static spawning, prioritizing the axis with the largest absolute value is standard.
  let normal = vec(0, 0, 1);
  const limit = HALF_GRID;
  
  // If it's on a face, use that face normal. If on edge/corner, pick one logic:
  if (pos.x === limit) normal = vec(1, 0, 0);
  else if (pos.x === -limit) normal = vec(-1, 0, 0);
  else if (pos.y === limit) normal = vec(0, 1, 0);
  else if (pos.y === -limit) normal = vec(0, -1, 0);
  else if (pos.z === limit) normal = vec(0, 0, 1);
  else if (pos.z === -limit) normal = vec(0, 0, -1);

  return { pos, normal };
};

// Calculates the next state of the head (position, normal, direction) handling cube folding
export const calculateNextStep = (
  currentPos: Vector3, 
  currentNormal: Vector3, 
  moveDir: Vector3
): { pos: Vector3, normal: Vector3, dir: Vector3 } => {
  
  let nextPos = add(currentPos, moveDir);
  let nextNormal = currentNormal;
  let nextMoveDir = moveDir;

  const limit = HALF_GRID;
  const axes: (keyof Vector3)[] = ['x', 'y', 'z'];

  for (const axis of axes) {
    if (Math.abs(nextPos[axis]) > limit) {
      const sign = Math.sign(nextPos[axis]);
      
      // Determine the new normal (the face we are stepping onto)
      const newNormal = vec(
        axis === 'x' ? sign : 0,
        axis === 'y' ? sign : 0,
        axis === 'z' ? sign : 0
      );

      // Ensure we aren't just moving parallel on the same face (sanity check)
      if (equals(newNormal, currentNormal)) continue;
      
      nextNormal = newNormal;
      
      // When crossing an edge, the new direction is always "inwards" from the edge of the new face.
      // Which effectively is opposite to the OLD normal.
      nextMoveDir = mul(currentNormal, -1);
      
      // Clamp the position to the edge of the current face...
      const correctedPos = { ...nextPos };
      correctedPos[axis] = sign * limit;
      
      // CRITICAL FIX:
      // Instead of stepping *onto* the new face immediately (which creates a gap),
      // we stay at the edge coordinate but switch Normal and Direction.
      // This creates a "Pivot" frame where the head rotates in place at the corner.
      nextPos = correctedPos;
      
      break; 
    }
  }

  return { pos: nextPos, normal: nextNormal, dir: nextMoveDir };
};