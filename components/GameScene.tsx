
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars, RoundedBox, Instance, Instances } from '@react-three/drei';
import * as THREE from 'three';
import { GameStateData, GRID_SIZE, HALF_GRID } from '../types';
import * as V from '../utils/vectorMath';

const CELL_SIZE = 1;

// --- Visual Components ---

const GridLines = () => {
    return (
        <group>
            {/* Main transparent cube body */}
            <mesh>
                <boxGeometry args={[GRID_SIZE, GRID_SIZE, GRID_SIZE]} />
                <meshStandardMaterial color="#020617" transparent opacity={0.9} roughness={0.1} metalness={0.5} />
            </mesh>
            {/* Grid overlay */}
            <gridHelper args={[GRID_SIZE, GRID_SIZE, 0x1e293b, 0x1e293b]} rotation={[Math.PI/2, 0, 0]} position={[0, 0, HALF_GRID + 0.51]} />
            <gridHelper args={[GRID_SIZE, GRID_SIZE, 0x1e293b, 0x1e293b]} rotation={[Math.PI/2, 0, 0]} position={[0, 0, -HALF_GRID - 0.51]} />
            <gridHelper args={[GRID_SIZE, GRID_SIZE, 0x1e293b, 0x1e293b]} rotation={[0, 0, 0]} position={[0, -HALF_GRID - 0.51, 0]} />
            <gridHelper args={[GRID_SIZE, GRID_SIZE, 0x1e293b, 0x1e293b]} rotation={[0, 0, 0]} position={[0, HALF_GRID + 0.51, 0]} />
            <gridHelper args={[GRID_SIZE, GRID_SIZE, 0x1e293b, 0x1e293b]} rotation={[0, 0, Math.PI/2]} position={[HALF_GRID + 0.51, 0, 0]} />
            <gridHelper args={[GRID_SIZE, GRID_SIZE, 0x1e293b, 0x1e293b]} rotation={[0, 0, Math.PI/2]} position={[-HALF_GRID - 0.51, 0, 0]} />
        </group>
    );
};

interface SnakeSegmentMeshProps {
    position: {x:number, y:number, z:number};
    normal: {x:number, y:number, z:number};
    isHead: boolean;
}

const SnakeSegmentMesh: React.FC<SnakeSegmentMeshProps> = ({ position, normal, isHead }) => {
    const offsetPos = new THREE.Vector3(position.x, position.y, position.z).add(
        new THREE.Vector3(normal.x, normal.y, normal.z).multiplyScalar(0.55)
    );

    return (
        <RoundedBox args={[0.9, 0.9, 0.9]} radius={0.1} position={offsetPos}>
            <meshStandardMaterial 
                color="#ffffff" 
                emissive="#ffffff"
                emissiveIntensity={isHead ? 0.8 : 0.3}
                toneMapped={false}
            />
        </RoundedBox>
    );
}

interface FoodMeshProps {
    position: {x:number, y:number, z:number};
    normal: {x:number, y:number, z:number};
}

const FoodMesh: React.FC<FoodMeshProps> = ({ position, normal }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const offsetPos = new THREE.Vector3(position.x, position.y, position.z).add(
        new THREE.Vector3(normal.x, normal.y, normal.z).multiplyScalar(0.55)
    );

    useFrame((state) => {
        if(meshRef.current) {
            const scale = 1 + Math.sin(state.clock.elapsedTime * 10) * 0.1;
            meshRef.current.scale.set(scale, scale, scale);
        }
    });

    return (
        <RoundedBox ref={meshRef} args={[0.95, 0.95, 0.95]} radius={0.1} position={offsetPos}>
            <meshStandardMaterial color="#ef4444" emissive="#dc2626" emissiveIntensity={1.2} toneMapped={false} />
        </RoundedBox>
    );
}

const BackgroundEffect = ({ win }: { win: boolean }) => {
    const { gl } = useThree();
    useFrame(({ clock }) => {
        if (win) {
             // Soft rainbow Shift for Win State (No Flashing)
             const t = clock.getElapsedTime() * 0.2; 
             const h = t % 1;
             const color = new THREE.Color().setHSL(h, 0.6, 0.8);
             gl.setClearColor(color);
        } else {
            // Dark moody rainbow for gameplay
            const t = clock.getElapsedTime() * 0.1;
            const h = (t % 1); // Hue 0-1
            const color = new THREE.Color().setHSL(h, 0.5, 0.02); 
            gl.setClearColor(color);
        }
    });
    return null;
}

// --- Fireworks System ---

const MAX_FIREWORK_PARTICLES = 1500;

const FireworksEffect = () => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const particles = useRef<{
        active: boolean;
        type: 'rocket' | 'spark';
        pos: THREE.Vector3;
        vel: THREE.Vector3;
        life: number;
        maxLife: number;
        color: THREE.Color;
        scale: number;
    }[]>([]);

    // Initialize pool
    if (particles.current.length === 0) {
        for (let i = 0; i < MAX_FIREWORK_PARTICLES; i++) {
            particles.current.push({
                active: false,
                type: 'rocket',
                pos: new THREE.Vector3(),
                vel: new THREE.Vector3(),
                life: 0,
                maxLife: 0,
                color: new THREE.Color(),
                scale: 0
            });
        }
    }

    useFrame((state, delta) => {
        if (!meshRef.current) return;
        
        if (Math.random() < 0.08) { 
             const idx = particles.current.findIndex(p => !p.active);
             if (idx !== -1) {
                 const p = particles.current[idx];
                 p.active = true;
                 p.type = 'rocket';
                 p.pos.set((Math.random() - 0.5) * 30, -25, (Math.random() - 0.5) * 15);
                 p.vel.set((Math.random()-0.5)*2, 15 + Math.random() * 10, (Math.random()-0.5)*2);
                 p.life = 0;
                 p.maxLife = 1.0 + Math.random() * 0.5;
                 p.color.setHSL(Math.random(), 1, 0.6); 
                 p.scale = 0.6;
             }
        }

        const dummy = new THREE.Object3D();
        const color = new THREE.Color();

        particles.current.forEach((p, i) => {
            if (!p.active) {
                dummy.position.set(0, -9999, 0);
                dummy.scale.set(0,0,0);
                dummy.updateMatrix();
                meshRef.current!.setMatrixAt(i, dummy.matrix);
                return;
            }

            p.pos.add(p.vel.clone().multiplyScalar(delta));
            p.life += delta;

            if (p.type === 'rocket') {
                p.vel.y -= 3 * delta; 
                
                if (p.life >= p.maxLife || p.vel.y < 0) {
                    p.active = false; 
                    const sparkCount = 40 + Math.floor(Math.random() * 30);
                    let spawned = 0;
                    for (let j = 0; j < particles.current.length && spawned < sparkCount; j++) {
                        if (!particles.current[j].active) {
                            const s = particles.current[j];
                            s.active = true;
                            s.type = 'spark';
                            s.pos.copy(p.pos);
                            const theta = Math.random() * Math.PI * 2;
                            const phi = Math.acos(2 * Math.random() - 1);
                            const speed = 3 + Math.random() * 8;
                            s.vel.set(
                                speed * Math.sin(phi) * Math.cos(theta),
                                speed * Math.sin(phi) * Math.sin(theta),
                                speed * Math.cos(phi)
                            );
                            s.life = 0;
                            s.maxLife = 1.0 + Math.random();
                            s.color.copy(p.color);
                            s.scale = 0.4;
                            spawned++;
                        }
                    }
                }
            } else {
                p.vel.y -= 9.8 * delta; 
                p.vel.multiplyScalar(0.96); 
                p.scale *= 0.97; 
                
                if (p.life > p.maxLife || p.scale < 0.01) {
                    p.active = false;
                }
            }

            dummy.position.copy(p.pos);
            dummy.scale.setScalar(p.scale);
            dummy.rotation.set(0, 0, 0);
            dummy.updateMatrix();
            meshRef.current!.setMatrixAt(i, dummy.matrix);
            meshRef.current!.setColorAt(i, p.color);
        });

        meshRef.current.instanceMatrix.needsUpdate = true;
        if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    });

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_FIREWORK_PARTICLES]}>
            <boxGeometry args={[0.5, 0.5, 0.5]} />
            <meshStandardMaterial toneMapped={false} emissive="white" emissiveIntensity={2} roughness={0} color="white" />
        </instancedMesh>
    );
}


// --- Explosion System ---

const ExplosionEffect = () => {
    const particleCount = 600; 
    const particles = useRef<any[]>([]);
    
    if (particles.current.length === 0) {
        for(let i=0; i<particleCount; i++) {
            particles.current.push({
                pos: new THREE.Vector3((Math.random()-0.5)*12, (Math.random()-0.5)*12, (Math.random()-0.5)*12),
                vel: new THREE.Vector3((Math.random()-0.5)*0.8, (Math.random()-0.5)*0.8, (Math.random()-0.5)*0.8),
                rot: new THREE.Vector3(Math.random(), Math.random(), Math.random()),
                color: Math.random() > 0.5 ? '#ffffff' : (Math.random() > 0.5 ? '#ef4444' : '#0f172a')
            })
        }
    }

    return (
        <Instances range={particleCount}>
            <boxGeometry args={[0.6, 0.6, 0.6]} />
            <meshStandardMaterial />
            {particles.current.map((p, i) => (
                <ExplosionParticle key={i} data={p} />
            ))}
        </Instances>
    )
}

const ExplosionParticle: React.FC<{ data: any }> = ({ data }) => {
    const ref = useRef<any>(null);
    useFrame((state, delta) => {
        if (ref.current) {
            ref.current.position.add(data.vel);
            ref.current.rotation.x += data.rot.x * delta;
            ref.current.rotation.y += data.rot.y * delta;
            data.vel.multiplyScalar(1.01);
        }
    });
    return (
         <Instance ref={ref} position={data.pos} color={data.color} />
    )
}

const InputHandler = ({ 
    onInput, 
    snakeHead, 
    snakeNormal, 
    worldGroupRef 
}: { 
    onInput: (dir: {x:number, y:number, z:number}) => void, 
    snakeHead: {x:number, y:number, z:number},
    snakeNormal: {x:number, y:number, z:number},
    worldGroupRef: React.RefObject<THREE.Group | null>
}) => {
    const { camera } = useThree();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!worldGroupRef.current) return;
            // Ignore Numpad inputs here (handled in RotationManager)
            if (['8','2','4','6','5','7','9','1','3'].includes(e.key) && e.location === KeyboardEvent.DOM_KEY_LOCATION_NUMPAD) return;

            let screenDir: THREE.Vector3 | null = null;
            const camForward = new THREE.Vector3();
            camera.getWorldDirection(camForward);
            const camUp = camera.up.clone();
            const camRight = new THREE.Vector3().crossVectors(camForward, camUp);

            if (['w', 'W', 'ArrowUp'].includes(e.key)) screenDir = camUp;
            if (['s', 'S', 'ArrowDown'].includes(e.key)) screenDir = camUp.clone().negate();
            if (['a', 'A', 'ArrowLeft'].includes(e.key)) screenDir = camRight.clone().negate();
            if (['d', 'D', 'ArrowRight'].includes(e.key)) screenDir = camRight;

            if (screenDir) {
                const inverseRot = worldGroupRef.current.quaternion.clone().invert();
                const localDir = screenDir.clone().applyQuaternion(inverseRot).normalize();

                const normal = new THREE.Vector3(snakeNormal.x, snakeNormal.y, snakeNormal.z);
                const projected = localDir.clone().sub(normal.clone().multiplyScalar(localDir.dot(normal)));
                projected.normalize();

                const cardinals = [
                    new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0),
                    new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0),
                    new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1)
                ];

                let bestDir = null;
                let maxDot = -Infinity;

                for (const card of cardinals) {
                    if (Math.abs(card.dot(normal)) < 0.1) { 
                        const d = card.dot(projected);
                        if (d > maxDot) {
                            maxDot = d;
                            bestDir = card;
                        }
                    }
                }

                if (bestDir) {
                    onInput(V.vec(bestDir.x, bestDir.y, bestDir.z));
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [camera, snakeNormal, onInput, worldGroupRef]);

    return null;
}

interface RotationManagerProps {
    worldGroupRef: React.RefObject<THREE.Group | null>;
    rotationSpeed: number;
}

const RotationManager: React.FC<RotationManagerProps> = ({ worldGroupRef, rotationSpeed }) => {
    const { gl } = useThree();
    const velocity = useRef(new THREE.Vector3(0.005, 0.005, 0)); 
    const isDragging = useRef(false);
    const lastMouse = useRef({ x: 0, y: 0 });

    // Numpad Controls
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!worldGroupRef.current) return;
            const impulse = 0.05;
            
            // NOTE: X Axis Rotation: +X is Down, -X is Up (Away)
            // NOTE: Y Axis Rotation: +Y is Right, -Y is Left
            
            switch(e.code) {
                // Cardinals
                case 'Numpad8': velocity.current.x -= impulse; break; // Up
                case 'Numpad2': velocity.current.x += impulse; break; // Down
                case 'Numpad4': velocity.current.y -= impulse; break; // Left
                case 'Numpad6': velocity.current.y += impulse; break; // Right
                
                // Diagonals
                case 'Numpad7': // Up-Left (Top-Left)
                    velocity.current.x -= impulse; 
                    velocity.current.y -= impulse; 
                    break;
                case 'Numpad9': // Up-Right (Top-Right)
                    velocity.current.x -= impulse; 
                    velocity.current.y += impulse; 
                    break;
                case 'Numpad1': // Down-Left (Bottom-Left)
                    velocity.current.x += impulse; 
                    velocity.current.y -= impulse; 
                    break;
                case 'Numpad3': // Down-Right (Bottom-Right)
                    velocity.current.x += impulse; 
                    velocity.current.y += impulse; 
                    break;

                case 'Numpad5': velocity.current.set(0,0,0); break; // Stop
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [worldGroupRef]);

    useEffect(() => {
        const canvas = gl.domElement;

        const onDown = (e: PointerEvent) => {
            isDragging.current = true;
            lastMouse.current = { x: e.clientX, y: e.clientY };
            canvas.setPointerCapture(e.pointerId);
        };

        const onMove = (e: PointerEvent) => {
            if (!isDragging.current) return;
            
            const dx = e.clientX - lastMouse.current.x;
            const dy = e.clientY - lastMouse.current.y;
            lastMouse.current = { x: e.clientX, y: e.clientY };

            const sensitivity = 0.0008;
            velocity.current.y += dx * sensitivity;
            velocity.current.x += dy * sensitivity;
        };

        const onUp = (e: PointerEvent) => {
            isDragging.current = false;
            canvas.releasePointerCapture(e.pointerId);
        };

        canvas.addEventListener('pointerdown', onDown);
        canvas.addEventListener('pointermove', onMove);
        canvas.addEventListener('pointerup', onUp);
        
        return () => {
            canvas.removeEventListener('pointerdown', onDown);
            canvas.removeEventListener('pointermove', onMove);
            canvas.removeEventListener('pointerup', onUp);
        };
    }, [gl]);

    useFrame((state, delta) => {
        if (worldGroupRef.current) {
            const baseAutoX = 0.002 * rotationSpeed;
            const baseAutoY = 0.003 * rotationSpeed;

            worldGroupRef.current.rotation.x += velocity.current.x + (rotationSpeed > 0 ? baseAutoX : 0);
            worldGroupRef.current.rotation.y += velocity.current.y + (rotationSpeed > 0 ? baseAutoY : 0);
            worldGroupRef.current.rotation.z += velocity.current.z;

            velocity.current.multiplyScalar(0.95); 
        }
    });

    return null;
}

interface GameSceneProps {
    gameState: GameStateData;
    onAbsoluteInput: (dir: {x:number, y:number, z:number}) => void;
    rotationSpeed: number;
}

const SceneContent: React.FC<GameSceneProps> = ({ gameState, onAbsoluteInput, rotationSpeed }) => {
    const worldGroupRef = useRef<THREE.Group>(null);
    
    const head = gameState.snake.length > 0 ? gameState.snake[0] : { pos: {x:0,y:0,z:0}, normal: {x:0,y:0,z:1} };
    const isWon = gameState.status === 'GAME_WON';

    return (
        <>
            <BackgroundEffect win={isWon} />
            <ambientLight intensity={0.5} />
            <pointLight position={[20, 20, 20]} intensity={1.5} />
            <pointLight position={[-20, -20, -20]} intensity={0.5} />
            
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
            
            <RotationManager worldGroupRef={worldGroupRef} rotationSpeed={rotationSpeed} />

            <InputHandler 
                onInput={onAbsoluteInput} 
                snakeHead={head.pos} 
                snakeNormal={head.normal} 
                worldGroupRef={worldGroupRef}
            />
            
            {isWon && <FireworksEffect />}

            <group ref={worldGroupRef}>
                {isWon ? (
                    <ExplosionEffect />
                ) : (
                    <>
                        <GridLines />
                        {gameState.status !== 'START' && (
                            <>
                                {gameState.snake.map((seg, i) => (
                                    <SnakeSegmentMesh 
                                        key={`snake-${i}`} 
                                        position={seg.pos} 
                                        normal={seg.normal} 
                                        isHead={i === 0} 
                                    />
                                ))}
                                <FoodMesh position={gameState.food.pos} normal={gameState.food.normal} />
                            </>
                        )}
                    </>
                )}
            </group>
        </>
    );
};

export const GameScene: React.FC<GameSceneProps> = (props) => {
    return (
        <Canvas camera={{ position: [0, 0, 25], fov: 40 }} gl={{ toneMapping: THREE.ReinhardToneMapping, toneMappingExposure: 1.2 }}>
            <SceneContent {...props} />
        </Canvas>
    );
};
