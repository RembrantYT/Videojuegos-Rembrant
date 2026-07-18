import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { createBaseScene, makePointerLock, wasdKeys, disposeScene } from '../three/base';

interface GameStats {
  time: number;
  keysFound: number;
  totalKeys: number;
  gameState: 'menu' | 'playing' | 'won' | 'paused';
}

const CELL_SIZE = 4;
const MAZE_W = 12;
const MAZE_H = 12;

type Cell = { walls: { n: boolean; s: boolean; e: boolean; w: boolean }; visited: boolean };

function generateMaze(w: number, h: number): Cell[][] {
  const grid: Cell[][] = [];
  for (let y = 0; y < h; y++) {
    grid[y] = [];
    for (let x = 0; x < w; x++) {
      grid[y][x] = { walls: { n: true, s: true, e: true, w: true }, visited: false };
    }
  }

  // Recursive backtracker
  const stack: Array<[number, number]> = [];
  const start: [number, number] = [0, 0];
  grid[0][0].visited = true;
  stack.push(start);

  while (stack.length > 0) {
    const [cx, cy] = stack[stack.length - 1];
    const neighbors: Array<[number, number, string]> = [];
    if (cy > 0 && !grid[cy - 1][cx].visited) neighbors.push([cx, cy - 1, 'n']);
    if (cy < h - 1 && !grid[cy + 1][cx].visited) neighbors.push([cx, cy + 1, 's']);
    if (cx < w - 1 && !grid[cy][cx + 1].visited) neighbors.push([cx + 1, cy, 'e']);
    if (cx > 0 && !grid[cy][cx - 1].visited) neighbors.push([cx - 1, cy, 'w']);

    if (neighbors.length > 0) {
      const [nx, ny, dir] = neighbors[Math.floor(Math.random() * neighbors.length)];
      grid[cy][cx].walls[dir as keyof Cell['walls']] = false;
      grid[ny][nx].walls = {
        n: grid[ny][nx].walls.n && dir !== 's',
        s: grid[ny][nx].walls.s && dir !== 'n',
        e: grid[ny][nx].walls.e && dir !== 'w',
        w: grid[ny][nx].walls.w && dir !== 'e',
      };
      grid[ny][nx].visited = true;
      stack.push([nx, ny]);
    } else {
      stack.pop();
    }
  }

  return grid;
}

export default function CrystalMaze({ onExit }: { onExit: () => void }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState<GameStats>({
    time: 0,
    keysFound: 0,
    totalKeys: 3,
    gameState: 'menu',
  });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const ctx = createBaseScene(container);
    const { scene, camera, renderer, clock } = ctx;

    scene.background = new THREE.Color(0x050010);
    scene.fog = new THREE.FogExp2(0x0a0020, 0.06);

    // Luces
    scene.add(new THREE.AmbientLight(0x332255, 0.3));
    const torch = new THREE.PointLight(0xff8844, 2, 12, 1.5);
    torch.castShadow = true;
    torch.shadow.mapSize.set(1024, 1024);
    scene.add(torch);

    // Generar laberinto
    const maze = generateMaze(MAZE_W, MAZE_H);
    const offsetX = -(MAZE_W * CELL_SIZE) / 2;
    const offsetZ = -(MAZE_H * CELL_SIZE) / 2;

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x2233aa,
      roughness: 0.3,
      metalness: 0.7,
      emissive: 0x5522aa,
      emissiveIntensity: 0.15,
    });
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x110022,
      roughness: 0.8,
      metalness: 0.2,
      emissive: 0x220044,
      emissiveIntensity: 0.1,
    });

    // Suelo
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(MAZE_W * CELL_SIZE, MAZE_H * CELL_SIZE), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(offsetX + (MAZE_W * CELL_SIZE) / 2, 0, offsetZ + (MAZE_H * CELL_SIZE) / 2);
    floor.receiveShadow = true;
    scene.add(floor);

    // Techo
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(MAZE_W * CELL_SIZE, MAZE_H * CELL_SIZE), floorMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(offsetX + (MAZE_W * CELL_SIZE) / 2, CELL_SIZE, offsetZ + (MAZE_H * CELL_SIZE) / 2);
    scene.add(ceil);

    // Paredes
    const walls: THREE.Vector3[] = [];
    const wallHeight = CELL_SIZE;
    const wallThickness = 0.2;

    function addWall(x: number, z: number, horizontal: boolean) {
      const geo = horizontal
        ? new THREE.BoxGeometry(CELL_SIZE + wallThickness, wallHeight, wallThickness)
        : new THREE.BoxGeometry(wallThickness, wallHeight, CELL_SIZE + wallThickness);
      const mesh = new THREE.Mesh(geo, wallMat);
      mesh.position.set(x, wallHeight / 2, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      walls.push(new THREE.Vector3(x, 0, z));
    }

    for (let y = 0; y < MAZE_H; y++) {
      for (let x = 0; x < MAZE_W; x++) {
        const wx = offsetX + x * CELL_SIZE + CELL_SIZE / 2;
        const wz = offsetZ + y * CELL_SIZE + CELL_SIZE / 2;
        const cell = maze[y][x];
        // Las paredes solo en norte y oeste para evitar duplicados (excepto bordes)
        if (cell.walls.n) addWall(wx, wz - CELL_SIZE / 2, true);
        if (cell.walls.w) addWall(wx - CELL_SIZE / 2, wz, false);
        // Bordes exteriores sur y este
        if (y === MAZE_H - 1 && cell.walls.s) addWall(wx, wz + CELL_SIZE / 2, true);
        if (x === MAZE_W - 1 && cell.walls.e) addWall(wx + CELL_SIZE / 2, wz, false);
      }
    }

    // Cristales decorativos en las esquinas
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0xaa44ff,
      roughness: 0.1,
      metalness: 0.3,
      emissive: 0x8822ff,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.7,
    });
    for (let i = 0; i < 15; i++) {
      const geo = new THREE.OctahedronGeometry(0.3 + Math.random() * 0.2);
      const crystal = new THREE.Mesh(geo, crystalMat);
      const cx = offsetX + Math.floor(Math.random() * MAZE_W) * CELL_SIZE + CELL_SIZE / 2;
      const cz = offsetZ + Math.floor(Math.random() * MAZE_H) * CELL_SIZE + CELL_SIZE / 2;
      crystal.position.set(cx, 1 + Math.random() * 2, cz);
      crystal.userData.baseY = crystal.position.y;
      crystal.userData.phase = Math.random() * Math.PI * 2;
      scene.add(crystal);
    }

    // Llaves
    const keyMat = new THREE.MeshStandardMaterial({
      color: 0xffdd00,
      emissive: 0xffaa00,
      emissiveIntensity: 0.8,
      metalness: 0.9,
      roughness: 0.2,
    });
    const keyLightMat = new THREE.PointLight(0xffaa00, 1.5, 8);
    scene.add(keyLightMat);

    const keys: THREE.Mesh[] = [];
    const keyPositions: Array<[number, number]> = [];
    while (keyPositions.length < 3) {
      const kx = Math.floor(Math.random() * MAZE_W);
      const ky = Math.floor(Math.random() * MAZE_H);
      if (kx < 2 && ky < 2) continue; // no cerca del inicio
      if (keyPositions.some(([px, py]) => px === kx && py === ky)) continue;
      keyPositions.push([kx, ky]);
    }

    keyPositions.forEach(([kx, ky]) => {
      const keyGeo = new THREE.TorusGeometry(0.2, 0.07, 8, 16);
      const key = new THREE.Mesh(keyGeo, keyMat);
      key.position.set(
        offsetX + kx * CELL_SIZE + CELL_SIZE / 2,
        1.2,
        offsetZ + ky * CELL_SIZE + CELL_SIZE / 2
      );
      key.userData.collected = false;
      key.userData.phase = Math.random() * Math.PI * 2;
      scene.add(key);
      keys.push(key);
    });

    // Puerta de salida (en la esquina opuesta)
    const exitX = offsetX + (MAZE_W - 1) * CELL_SIZE + CELL_SIZE / 2;
    const exitZ = offsetZ + (MAZE_H - 1) * CELL_SIZE + CELL_SIZE / 2;
    const doorMat = new THREE.MeshStandardMaterial({
      color: 0x00ffaa,
      emissive: 0x00aa77,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.4,
    });
    const door = new THREE.Mesh(new THREE.PlaneGeometry(CELL_SIZE * 0.8, wallHeight * 0.9), doorMat);
    door.position.set(exitX, wallHeight * 0.45, exitZ + CELL_SIZE / 2 - 0.01);
    scene.add(door);

    const exitLight = new THREE.PointLight(0x00ffaa, 2, 10);
    exitLight.position.set(exitX, 2, exitZ);
    scene.add(exitLight);

    // Player
    const pointer = makePointerLock(camera, renderer.domElement);
    const wasd = wasdKeys();

    camera.position.set(offsetX + CELL_SIZE / 2, 1.6, offsetZ + CELL_SIZE / 2);

    const gs = {
      status: 'menu' as 'menu' | 'playing' | 'won' | 'paused',
      time: 0,
      keysFound: 0,
      totalKeys: 3,
      startTime: 0,
    };

    function checkWallCollision(pos: THREE.Vector3): boolean {
      for (const w of walls) {
        const dx = Math.abs(pos.x - w.x);
        const dz = Math.abs(pos.z - w.z);
        if (dx < CELL_SIZE / 2 + 0.3 && dz < 0.5) return true;
        if (dz < CELL_SIZE / 2 + 0.3 && dx < 0.5) return true;
      }
      return false;
    }

    function startGame() {
      gs.status = 'playing';
      gs.time = 0;
      gs.keysFound = 0;
      gs.startTime = performance.now();
      keys.forEach((k) => {
        k.userData.collected = false;
        k.visible = true;
      });
      camera.position.set(offsetX + CELL_SIZE / 2, 1.6, offsetZ + CELL_SIZE / 2);
      pointer.lock();
      setStats({ time: 0, keysFound: 0, totalKeys: 3, gameState: 'playing' });
    }

    (window as unknown as { __mazeStart: () => void }).__mazeStart = startGame;

    let animId = 0;

    function animate() {
      animId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      const elapsed = performance.now();

      // Animar cristales
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.userData.baseY !== undefined) {
          obj.position.y = obj.userData.baseY + Math.sin(elapsed * 0.001 + obj.userData.phase) * 0.2;
          obj.rotation.y += dt * 0.5;
        }
      });

      // Llaves flotantes
      keys.forEach((k, i) => {
        if (k.userData.collected) return;
        k.rotation.y += dt * 2;
        k.position.y = 1.2 + Math.sin(elapsed * 0.002 + i) * 0.15;
      });

      if (gs.status === 'playing') {
        gs.time = (elapsed - gs.startTime) / 1000;

        // Linterna sigue al jugador
        torch.position.copy(camera.position);

        // Movimiento
        const speed = 4;
        const forward = new THREE.Vector3();
        const right = new THREE.Vector3();
        camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();
        right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

        const move = new THREE.Vector3();
        if (wasd.isDown('KeyW')) move.add(forward);
        if (wasd.isDown('KeyS')) move.sub(forward);
        if (wasd.isDown('KeyA')) move.sub(right);
        if (wasd.isDown('KeyD')) move.add(right);
        move.normalize().multiplyScalar(speed * dt);

        const newPos = camera.position.clone();
        // Intentar X
        newPos.x += move.x;
        if (!checkWallCollision(newPos)) camera.position.x = newPos.x;
        // Intentar Z
        newPos.x = camera.position.x;
        newPos.z += move.z;
        if (!checkWallCollision(newPos)) camera.position.z = newPos.z;

        // Recolectar llaves
        keys.forEach((k) => {
          if (k.userData.collected) return;
          if (k.position.distanceTo(camera.position) < 1.2) {
            k.userData.collected = true;
            k.visible = false;
            gs.keysFound++;
            setStats((s) => ({ ...s, keysFound: gs.keysFound }));
          }
        });

        // Mover luz de llave a la más cercana
        let closest: THREE.Mesh | null = null;
        let minDist = Infinity;
        for (const k of keys) {
          if (k.userData.collected) continue;
          const d = k.position.distanceTo(camera.position);
          if (d < minDist) {
            minDist = d;
            closest = k;
          }
        }
        if (closest) keyLightMat.position.copy(closest.position);

        // Llegar a la puerta
        if (gs.keysFound >= gs.totalKeys && camera.position.distanceTo(new THREE.Vector3(exitX, camera.position.y, exitZ)) < 2) {
          gs.status = 'won';
          document.exitPointerLock();
          setStats((s) => ({ ...s, gameState: 'won' }));
        }

        setStats((s) => ({ ...s, time: gs.time }));
      }

      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(animId);
      pointer.cleanup();
      wasd.cleanup();
      disposeScene(scene);
      ctx.cleanup();
      delete (window as unknown as Record<string, unknown>).__mazeStart;
    };
  }, []);

  const start = () => (window as unknown as { __mazeStart?: () => void }).__mazeStart?.();

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div ref={mountRef} className="w-full h-full" />

      {stats.gameState === 'playing' && (
        <>
          {/* Crosshair sutil */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-violet-400/60 rounded-full" />
          </div>

          {/* HUD */}
          <div className="absolute top-0 left-0 right-0 p-4 pointer-events-none">
            <div className="flex items-center justify-between max-w-6xl mx-auto">
              <div className="glass rounded-xl px-4 py-2.5">
                <div className="text-[10px] text-gray-400 uppercase tracking-wider">Tiempo</div>
                <div className="text-2xl font-bold text-violet-400 hud-text">{formatTime(stats.time)}</div>
              </div>
              <div className="glass rounded-xl px-5 py-2.5 flex items-center gap-3">
                <span className="text-lg">🔑</span>
                <span className="text-2xl font-bold text-amber-400 hud-text">{stats.keysFound}<span className="text-gray-500 text-base">/{stats.totalKeys}</span></span>
              </div>
              <button onClick={() => { document.exitPointerLock(); setStats((s) => ({ ...s, gameState: 'paused' })); }} className="glass rounded-xl px-4 py-2.5 text-gray-300 hover:text-white pointer-events-auto">Pausa</button>
            </div>
          </div>

          {/* Objetivo */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none">
            <div className="glass rounded-xl px-5 py-2 text-sm text-gray-300">
              {stats.keysFound < stats.totalKeys ? (
                <>Encuentra las <span className="text-amber-400 font-bold">{stats.totalKeys - stats.keysFound} llaves</span> restantes</>
              ) : (
                <span className="text-emerald-400 font-bold">¡Ve a la puerta de salida!</span>
              )}
            </div>
          </div>
        </>
      )}

      {stats.gameState !== 'playing' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/85 backdrop-blur-md">
          <div className="text-center max-w-lg px-6 animate-fade-in">
            <h2 className="text-5xl font-black text-violet-400 mb-3 text-glow">CRYSTAL MAZE</h2>
            {stats.gameState === 'won' ? (
              <>
                <p className="text-emerald-400 mb-2 text-lg font-bold">¡HAS ESCAPADO!</p>
                <div className="glass rounded-xl p-6 mb-6 mt-4">
                  <div className="text-gray-400 text-sm uppercase tracking-wider mb-1">Tiempo</div>
                  <div className="text-4xl font-bold text-violet-400">{formatTime(stats.time)}</div>
                </div>
                <button onClick={start} className="btn-primary text-lg px-8 py-3.5 mb-4">JUGAR DE NUEVO</button>
              </>
            ) : stats.gameState === 'paused' ? (
              <>
                <p className="text-gray-400 mb-8">El laberinto te espera...</p>
                <button onClick={start} className="btn-primary text-lg px-8 py-3.5 mb-4">CONTINUAR</button>
              </>
            ) : (
              <>
                <p className="text-gray-400 mb-8">Explora el laberinto de cristal.<br/>Encuentra las 3 llaves y escapa.</p>
                <button onClick={start} className="btn-primary text-lg px-8 py-3.5 mb-4">ENTRAR AL LABERINTO</button>
              </>
            )}
            <div><button onClick={onExit} className="btn-ghost text-sm">Salir al menú</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
