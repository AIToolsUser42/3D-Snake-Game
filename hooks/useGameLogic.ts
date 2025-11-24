
import { useState, useEffect, useCallback, useRef } from 'react';
import { GameStateData, SnakeSegment, Vector3, HALF_GRID } from '../types';
import * as V from '../utils/vectorMath';
import { audio } from '../utils/audio';

// Total Surface Voxel Count for 9x9x9 shell is 9^3 - 7^3 = 386.
// Set WIN_SCORE slightly lower to ensure it's achievable comfortably.
const WIN_SCORE = 380; 
const BASE_TICK_RATE = 200; // Base speed in ms

const INITIAL_STATE: GameStateData = {
  snake: [],
  food: { pos: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 0, z: 1 } },
  direction: { x: 0, y: 1, z: 0 },
  nextDirection: { x: 0, y: 1, z: 0 },
  score: 0,
  highScore: 0,
  status: 'START',
  elapsedTime: 0,
};

// Check for collision.
const isSelfCollide = (targetPos: Vector3, targetNormal: Vector3, body: SnakeSegment[]) => {
  return body.some((seg, index) => {
    if (V.equals(seg.pos, targetPos)) {
       // If checking against the very first segment (current head), 
       // allow overlap ONLY if normals are different (Pivot step).
       if (index === 0 && !V.equals(seg.normal, targetNormal)) {
         return false;
       }
       return true;
    }
    return false;
  });
};

// --- AI Helpers ---

// BFS to find shortest distance to food
const getDistanceToFood = (startPos: Vector3, startNormal: Vector3, foodPos: Vector3, body: SnakeSegment[]): number => {
    const queue: { pos: Vector3, normal: Vector3, dist: number }[] = [{ pos: startPos, normal: startNormal, dist: 0 }];
    const visited = new Set<string>();
    visited.add(`${startPos.x},${startPos.y},${startPos.z}`);
    
    // Create a body lookup set for O(1) collision checks during BFS
    const bodySet = new Set(body.map(s => `${s.pos.x},${s.pos.y},${s.pos.z}`));
    
    // Optimization: Limit BFS depth to avoid performance spikes
    let iterations = 0;
    const MAX_ITERATIONS = 1000;

    while (queue.length > 0) {
        iterations++;
        if (iterations > MAX_ITERATIONS) return 9999; // Too far/complex

        const curr = queue.shift()!;
        if (V.equals(curr.pos, foodPos)) return curr.dist;

        // Explore neighbors (Forward, Left, Right relative to current normal)
        // We simulate moves from this hypothetical position
        // Current 'forward' direction isn't tracked in BFS state, so we check all 4 cardinal directions on the surface
        // Actually, simpler: From a surface pixel, there are 4 neighbors.
        // We use calculateNextStep with 4 cardinal directions relative to normal.
        
        const cardinals = [
            V.vec(1,0,0), V.vec(-1,0,0), V.vec(0,1,0), V.vec(0,-1,0), V.vec(0,0,1), V.vec(0,0,-1)
        ];
        
        // Filter cardinals that are perpendicular to normal (tangent to surface)
        const validDirs = cardinals.filter(d => Math.abs(V.dot(d, curr.normal)) < 0.1);

        for (const dir of validDirs) {
            const next = V.calculateNextStep(curr.pos, curr.normal, dir);
            const key = `${next.pos.x},${next.pos.y},${next.pos.z}`;
            
            if (!visited.has(key) && !bodySet.has(key)) {
                visited.add(key);
                queue.push({ pos: next.pos, normal: next.normal, dist: curr.dist + 1 });
            }
        }
    }
    return 9999; // Unreachable
};

// Flood Fill to count reachable space (Survival Heuristic)
const countReachableSpace = (startPos: Vector3, startNormal: Vector3, body: SnakeSegment[]): number => {
    const queue: { pos: Vector3, normal: Vector3 }[] = [{ pos: startPos, normal: startNormal }];
    const visited = new Set<string>();
    visited.add(`${startPos.x},${startPos.y},${startPos.z}`);
    const bodySet = new Set(body.map(s => `${s.pos.x},${s.pos.y},${s.pos.z}`));
    
    let count = 0;
    const MAX_DEPTH = 200; // Look ahead limit

    while (queue.length > 0 && count < MAX_DEPTH) {
        const curr = queue.shift()!;
        count++;

        const cardinals = [
            V.vec(1,0,0), V.vec(-1,0,0), V.vec(0,1,0), V.vec(0,-1,0), V.vec(0,0,1), V.vec(0,0,-1)
        ];
        const validDirs = cardinals.filter(d => Math.abs(V.dot(d, curr.normal)) < 0.1);

        for (const dir of validDirs) {
            const next = V.calculateNextStep(curr.pos, curr.normal, dir);
            const key = `${next.pos.x},${next.pos.y},${next.pos.z}`;
            
            if (!visited.has(key) && !bodySet.has(key)) {
                visited.add(key);
                queue.push(next);
            }
        }
    }
    return count;
}


export const useGameLogic = (speedMultiplier: number = 1) => {
  const [data, setData] = useState<GameStateData>(INITIAL_STATE);
  const [autoPlay, setAutoPlay] = useState(false);
  
  const dataRef = useRef(data);
  dataRef.current = data;
  const autoPlayRef = useRef(autoPlay);
  autoPlayRef.current = autoPlay;

  // Audio Side Effects
  useEffect(() => {
    if (data.status === 'PLAYING') {
        audio.startBGM();
    } else {
        audio.stopBGM();
    }

    if (data.status === 'GAME_OVER') {
        audio.playGameOver();
    } else if (data.status === 'GAME_WON') {
        audio.playWin();
    }
  }, [data.status]);

  const initGame = useCallback(() => {
    // Audio is started by status change effect, but ensure context is resumed on user interaction
    audio.playClick(); 

    const startPos = V.vec(0, -2, 4);
    const startNormal = V.vec(0, 0, 1);
    const startSnake: SnakeSegment[] = [{ pos: startPos, normal: startNormal }];
    
    const food = V.randomSpawn(startSnake);

    setData(prev => ({
      ...INITIAL_STATE,
      highScore: prev.highScore,
      snake: startSnake,
      food: food,
      direction: V.vec(0, 1, 0),
      nextDirection: V.vec(0, 1, 0),
      status: 'PLAYING',
      elapsedTime: 0
    }));
  }, []);

  const triggerGameOver = useCallback(() => {
    audio.playClick();
    setData(prev => ({ ...prev, status: 'GAME_OVER' }));
  }, []);

  // Timer Effect
  useEffect(() => {
    if (data.status !== 'PLAYING') return;
    const timer = setInterval(() => {
        setData(prev => ({ ...prev, elapsedTime: prev.elapsedTime + 1 }));
    }, 1000);
    return () => clearInterval(timer);
  }, [data.status]);

  const handleRelativeInput = useCallback((action: 'LEFT' | 'RIGHT') => {
    if (dataRef.current.status !== 'PLAYING') return;
    if (autoPlayRef.current) return; // Disable manual input during auto play

    audio.playClick();

    const { normal } = dataRef.current.snake[0];
    const currentDir = dataRef.current.nextDirection;

    let newDir = V.vec(0,0,0);
    if (action === 'LEFT') {
        newDir = V.cross(normal, currentDir);
    } else {
        newDir = V.cross(currentDir, normal);
    }
    
    setData(prev => ({ ...prev, nextDirection: newDir }));
  }, []);

  const handleAbsoluteInput = useCallback((desiredDir: Vector3) => {
    if (dataRef.current.status !== 'PLAYING') return;
    if (autoPlayRef.current) return; // Disable manual input during auto play

    const { normal } = dataRef.current.snake[0];
    const currentDir = dataRef.current.nextDirection;

    if (Math.abs(V.dot(desiredDir, normal)) > 0.1) return;
    if (V.equals(desiredDir, V.mul(currentDir, -1))) return;

    setData(prev => ({ ...prev, nextDirection: desiredDir }));
  }, []);

  useEffect(() => {
    if (data.status !== 'PLAYING') return;
    if (speedMultiplier === 0) return; // Pause

    const interval = BASE_TICK_RATE / speedMultiplier;

    const tick = setInterval(() => {
      const current = dataRef.current;
      const head = current.snake[0];
      let moveDir = current.nextDirection;

      // --- AUTO PLAY AI ---
      if (autoPlayRef.current) {
          const { normal } = head;
          // Possible moves: Left, Right, Forward (relative to current motion)
          // We must derive them from current moveDir and normal
          const leftDir = V.cross(normal, current.direction); // Left relative to motion
          const rightDir = V.cross(current.direction, normal); // Right relative to motion
          const forwardDir = current.direction;
          
          const potentialMoves = [forwardDir, leftDir, rightDir];
          
          let bestMove = forwardDir;
          let bestScore = -Infinity;

          for (const dir of potentialMoves) {
              const nextState = V.calculateNextStep(head.pos, head.normal, dir);
              
              // 1. Safety Check: Immediate Death?
              // NOTE: When predicting, we must ignore the TAIL because it will move forward (unless we just ate, but usually it moves)
              // To be safe, we assume tail doesn't move (conservative) OR strict check against length-1
              const effectiveBody = current.snake.slice(0, -1);
              if (isSelfCollide(nextState.pos, nextState.normal, effectiveBody)) {
                  continue; // Skip suicide
              }

              // 2. Score the move
              const dist = getDistanceToFood(nextState.pos, nextState.normal, current.food.pos, effectiveBody);
              const space = countReachableSpace(nextState.pos, nextState.normal, effectiveBody);

              // Weights:
              // - Prioritize Distance heavily (10000x)
              // - Space is tiebreaker
              // - If dist is 9999 (unreachable), Space becomes the primary factor
              
              let score = 0;
              if (dist < 9999) {
                  // Primary goal: Reach food. 
                  // Score = Max - Dist. 
                  score = 1000000 - (dist * 1000) + space;
              } else {
                  // Secondary goal: Survive.
                  score = space; 
              }

              if (score > bestScore) {
                  bestScore = score;
                  bestMove = dir;
              }
          }
          
          // Apply AI Decision
          moveDir = bestMove;
      }

      // Calculate next step based on decided direction
      const { pos: nextPos, normal: nextNormal, dir: nextMoveDir } = V.calculateNextStep(head.pos, head.normal, moveDir);

      // Check Collision
      const eating = V.equals(nextPos, current.food.pos);
      const collisionBody = eating ? current.snake : current.snake.slice(0, -1);

      if (isSelfCollide(nextPos, nextNormal, collisionBody)) {
           setData(prev => ({ ...prev, status: 'GAME_OVER' }));
           return;
      }

      const newHead: SnakeSegment = { pos: nextPos, normal: nextNormal };
      let newSnake = [newHead, ...current.snake];
      
      if (!eating) {
        newSnake.pop(); 
      } else {
        audio.playEat(); // Play sound
        const newScore = current.score + 1;
        const newHighScore = Math.max(newScore, current.highScore);
        
        if (newScore >= WIN_SCORE) {
            setData(prev => ({
                ...prev,
                score: newScore,
                highScore: newHighScore,
                status: 'GAME_WON'
            }));
            return;
        }

        const nextFood = V.randomSpawn(newSnake);
        setData(prev => ({
            ...prev,
            score: newScore,
            highScore: newHighScore,
            food: nextFood
        }));
      }

      setData(prev => ({
        ...prev,
        snake: newSnake,
        direction: nextMoveDir, 
        nextDirection: nextMoveDir // Sync buffer
      }));

    }, interval);

    return () => clearInterval(tick);
  }, [data.status, speedMultiplier, autoPlay]); // Added autoPlay dependency to refresh tick logic if mode changes

  return {
    ...data,
    autoPlay,
    setAutoPlay,
    initGame,
    handleRelativeInput,
    handleAbsoluteInput,
    triggerGameOver
  };
};
