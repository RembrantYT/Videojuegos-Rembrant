import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { createBaseScene, disposeScene } from '../three/base';

interface Obstacle {
  mesh: THREE.Mesh;
  lane: number;
  type: 'car' | 'cone';
}

interface GameStats {
  speed: number;
  score: number;
  distance: number;
  nitro: number;
  health: number;
  gameState: 'menu' | 'playing' | 'gameover';
}

const LANE_WIDTH = 3;
const LANES = [-LANE_WIDTH, 0, LANE_WIDTH];

export default function NeonRacer({ onExit }: { onExit: () => void }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState<GameStats>({
    speed: 0,
    score: 0,
    distance: 0,
    nitro: 100,
    health: 3,
    gameState: 'menu',
  });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const ctx = createBaseScene(container);
    const { scene, camera, renderer, clock } = ctx;

    scene.background = new THREE.Color(0x0a0220);
    scene.fog = new THREE.Fog(0x1a0a40, 30, 90);

    // Sunset synthwave lighting
    const ambient = new THREE.AmbientLight(0x8844aa, 0.5);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xff66aa, 0.8);
    sun.position.set(0, 20, -30);
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0x4488ff, 0.4);
    fill.position.set(5, 10, 5);
    scene.add(fill);

    // Suelo con grid neón
    const roadGeo = new THREE.PlaneGeometry(20, 400, 20, 200);
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x0d0420,
      roughness: 0.3,
      metalness: 0.7,
      emissive: 0x220044,
      emissiveIntensity: 0.2,
    });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.z = -150;
    scene.add(road);

    // Grid lines (neón)
    const gridGeo = new THREE.BufferGeometry();
    const gridPoints: number[] = [];
    for (let i = -200; i <= 0; i += 4) {
      gridPoints.push(-10, 0.01, i, 10, 0.01, i);
    }
    for (let x = -10; x <= 10; x += 2) {
      gridPoints.push(x, 0.01, -200, x, 0.01, 0);
    }
    gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(gridPoints, 3));
    const gridMat = new THREE.LineBasicMaterial({ color: 0xff22aa, transparent: true, opacity: 0.4 });
    const grid = new THREE.LineSegments(gridGeo, gridMat);
    scene.add(grid);

    // Lane dividers (líneas de carril)
    const laneDividers: THREE.Mesh[] = [];
    for (let i = 0; i < 40; i++) {
      const div = new THREE.Mesh(
        new THREE.PlaneGeometry(0.15, 2),
        new THREE.MeshBasicMaterial({ color: 0xffdd44, transparent: true, opacity: 0.7 })
      );
      div.rotation.x = -Math.PI / 2;
      div.position.set(-1.5, 0.02, -i * 8);
      scene.add(div);
      laneDividers.push(div);

      const div2 = div.clone();
      div2.position.x = 1.5;
      scene.add(div2);
      laneDividers.push(div2);
    }

    // Montañas en el horizonte (synthwave)
    const mountainMat = new THREE.MeshStandardMaterial({ color: 0x1a0a3a, roughness: 1, emissive: 0x440088, emissiveIntensity: 0.1 });
    for (let i = 0; i < 20; i++) {
      const w = 15 + Math.random() * 25;
      const h = 8 + Math.random() * 25;
      const m = new THREE.Mesh(new THREE.ConeGeometry(w / 2, h, 4), mountainMat);
      m.position.set(-60 + i * 8 + Math.random() * 6, h / 2 - 2, -120);
      m.rotation.y = Math.random() * Math.PI;
      scene.add(m);
    }

    // Sol synthwave
    const sunGeo = new THREE.CircleGeometry(15, 64);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xff4488, transparent: true, opacity: 0.6 });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunMesh.position.set(0, 12, -160);
    scene.add(sunMesh);

    // Líneas horizontales del sol (synthwave)
    for (let i = 0; i < 6; i++) {
      const line = new THREE.Mesh(
        new THREE.PlaneGeometry(32, 0.4),
        new THREE.MeshBasicMaterial({ color: 0x0a0220, transparent: true, opacity: 1 })
      );
      line.position.set(0, 5 + i * 3, -159);
      scene.add(line);
    }

    // Coche del jugador
    const carGroup = new THREE.Group();
    const carBodyMat = new THREE.MeshStandardMaterial({ color: 0x00e5ff, roughness: 0.2, metalness: 0.9, emissive: 0x004466, emissiveIntensity: 0.5 });

    const carBody = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.4, 2.6), carBodyMat);
    carBody.position.y = 0.4;
    carBody.castShadow = true;
    carGroup.add(carBody);

    const carTop = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 1.3), new THREE.MeshStandardMaterial({ color: 0x111133, roughness: 0.1, metalness: 1, emissive: 0x003355, emissiveIntensity: 0.3 }));
    carTop.position.set(0, 0.85, -0.1);
    carGroup.add(carTop);

    // Ruedas con neón
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x110011, roughness: 0.8, metalness: 0.3 });
    const neonMat = new THREE.MeshBasicMaterial({ color: 0xff22aa });
    const wheelPositions = [
      [-0.75, 0.3, 0.9], [0.75, 0.3, 0.9], [-0.75, 0.3, -0.9], [0.75, 0.3, -0.9]
    ];
    wheelPositions.forEach(([x, y, z]) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.3, 12), wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, y, z);
      carGroup.add(wheel);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.05, 6, 16), neonMat);
      ring.rotation.y = Math.PI / 2;
      ring.position.set(x, y, z);
      carGroup.add(ring);
    });

    // Faros
    const headlightMat = new THREE.MeshBasicMaterial({ color: 0xffffaa });
    const hl1 = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), headlightMat);
    hl1.position.set(-0.45, 0.4, 1.3);
    carGroup.add(hl1);
    const hl2 = hl1.clone();
    hl2.position.x = 0.45;
    carGroup.add(hl2);

    const headLight = new THREE.SpotLight(0xffffaa, 3, 30, Math.PI / 6, 0.5, 1);
    headLight.position.set(0, 0.5, 1.3);
    headLight.target.position.set(0, 0, 15);
    carGroup.add(headLight);
    carGroup.add(headLight.target);

    // Glow debajo del coche
    const underglow = new THREE.PointLight(0xff22aa, 2, 5);
    underglow.position.set(0, 0, 0);
    carGroup.add(underglow);

    carGroup.position.set(0, 0, 0);
    scene.add(carGroup);

    camera.position.set(0, 3.5, 7);
    camera.lookAt(0, 0, -5);

    const gs = {
      speed: 0,
      maxSpeed: 2.5,
      score: 0,
      distance: 0,
      nitro: 100,
      nitroActive: false,
      health: 3,
      status: 'menu' as 'menu' | 'playing' | 'gameover',
      currentLane: 1,
      targetLane: 1,
      obstacles: [] as Obstacle[],
      spawnTimer: 0,
      invulnTimer: 0,
      roadOffset: 0,
    };

    function spawnObstacle() {
      const lane = Math.floor(Math.random() * 3);
      const isCar = Math.random() > 0.4;

      if (isCar) {
        const enemyMat = new THREE.MeshStandardMaterial({
          color: Math.random() > 0.5 ? 0xff3355 : 0xffaa00,
          roughness: 0.2,
          metalness: 0.8,
          emissive: 0x440022,
          emissiveIntensity: 0.4,
        });
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.4, 2.6), enemyMat);
        body.position.y = 0.4;
        const top = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 1.3), new THREE.MeshStandardMaterial({ color: 0x220011, roughness: 0.1, metalness: 1 }));
        top.position.set(0, 0.85, -0.1);
        body.add(top);
        // Luces traseras rojas
        const tail = new THREE.Mesh(new THREE.SphereGeometry(0.1), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
        tail.position.set(-0.4, 0.4, -1.3);
        body.add(tail);
        const tail2 = tail.clone();
        tail2.position.x = 0.4;
        body.add(tail2);

        body.position.x = LANES[lane];
        body.position.z = -100;
        scene.add(body);
        gs.obstacles.push({ mesh: body, lane, type: 'car' });
      } else {
        const coneMat = new THREE.MeshStandardMaterial({ color: 0xff6600, roughness: 0.5, metalness: 0.3, emissive: 0x882200, emissiveIntensity: 0.3 });
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.7, 8), coneMat);
        cone.position.set(LANES[lane], 0.35, -100);
        cone.castShadow = true;
        scene.add(cone);
        gs.obstacles.push({ mesh: cone, lane, type: 'cone' });
      }
    }

    function startGame() {
      gs.status = 'playing';
      gs.speed = 0.8;
      gs.score = 0;
      gs.distance = 0;
      gs.nitro = 100;
      gs.health = 3;
      gs.currentLane = 1;
      gs.targetLane = 1;
      gs.obstacles.forEach((o) => scene.remove(o.mesh));
      gs.obstacles = [];
      carGroup.position.x = 0;
      setStats({ speed: 80, score: 0, distance: 0, nitro: 100, health: 3, gameState: 'playing' });
    }

    (window as unknown as { __racerStart: () => void }).__racerStart = startGame;

    const onKeyDown = (e: KeyboardEvent) => {
      if (gs.status !== 'playing') return;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        gs.targetLane = Math.max(0, gs.targetLane - 1);
      } else if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        gs.targetLane = Math.min(2, gs.targetLane + 1);
      } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        if (gs.nitro > 0) gs.nitroActive = true;
      } else if (e.code === 'Space') {
        e.preventDefault();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') gs.nitroActive = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    let animId = 0;

    function animate() {
      animId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);

      // Sol siempre pulsa
      sunMesh.scale.y = 1 + Math.sin(performance.now() * 0.001) * 0.02;

      if (gs.status === 'playing') {
        // Velocidad gradual
        const targetSpeed = gs.nitroActive && gs.nitro > 0 ? gs.maxSpeed * 1.8 : gs.maxSpeed;
        gs.speed = THREE.MathUtils.lerp(gs.speed, targetSpeed, 0.02);
        gs.distance += gs.speed * dt * 10;
        gs.score += Math.floor(gs.speed * dt * 10);

        // Nitro
        if (gs.nitroActive && gs.nitro > 0) {
          gs.nitro = Math.max(0, gs.nitro - 25 * dt);
          if (gs.nitro <= 0) gs.nitroActive = false;
        } else {
          gs.nitro = Math.min(100, gs.nitro + 8 * dt);
        }

        // Cambio de carril suave
        const targetX = LANES[gs.targetLane];
        carGroup.position.x = THREE.MathUtils.lerp(carGroup.position.x, targetX, 0.15);
        carGroup.rotation.z = THREE.MathUtils.lerp(carGroup.rotation.z, (gs.targetLane - 1) * -0.15, 0.1);

        // Mover road y grid
        gs.roadOffset = (gs.roadOffset + gs.speed * dt * 60) % 8;
        laneDividers.forEach((d) => {
          d.position.z += gs.speed * dt * 60;
          if (d.position.z > 10) d.position.z -= 320;
        });
        grid.position.z = (grid.position.z + gs.speed * dt * 30) % 4;

        // Underglow cambia de color
        underglow.color.setHSL((performance.now() * 0.0003) % 1, 1, 0.5);

        // Spawn obstacles
        gs.spawnTimer += dt;
        const spawnRate = Math.max(0.4, 1.5 - gs.speed * 0.3);
        if (gs.spawnTimer > spawnRate) {
          gs.spawnTimer = 0;
          spawnObstacle();
          // A veces dos
          if (Math.random() > 0.7) spawnObstacle();
        }

        // Update obstacles
        gs.obstacles = gs.obstacles.filter((o) => {
          o.mesh.position.z += gs.speed * dt * 60;
          if (o.mesh.position.z > 10) {
            scene.remove(o.mesh);
            return false;
          }

          // Collision
          if (gs.invulnTimer <= 0 && Math.abs(o.mesh.position.z - carGroup.position.z) < 2 && Math.abs(o.mesh.position.x - carGroup.position.x) < 1.2) {
            gs.health--;
            gs.invulnTimer = 1.5;
            gs.speed *= 0.4;
            // Flash
            carGroup.visible = false;
            setTimeout(() => { carGroup.visible = true; }, 100);
            setTimeout(() => { carGroup.visible = false; }, 200);
            setTimeout(() => { carGroup.visible = true; }, 300);

            if (gs.health <= 0) {
              gs.status = 'gameover';
              setStats((s) => ({ ...s, health: 0, gameState: 'gameover' }));
            }
            scene.remove(o.mesh);
            return false;
          }
          return true;
        });

        if (gs.invulnTimer > 0) {
          gs.invulnTimer -= dt;
          carGroup.visible = Math.floor(performance.now() / 100) % 2 === 0;
        } else {
          carGroup.visible = true;
        }

        setStats({
          speed: Math.round(gs.speed * 60),
          score: gs.score,
          distance: Math.round(gs.distance),
          nitro: Math.round(gs.nitro),
          health: gs.health,
          gameState: 'playing',
        });
      }

      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      disposeScene(scene);
      ctx.cleanup();
      delete (window as unknown as Record<string, unknown>).__racerStart;
    };
  }, []);

  const start = () => (window as unknown as { __racerStart?: () => void }).__racerStart?.();

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div ref={mountRef} className="w-full h-full" />

      {stats.gameState === 'playing' && (
        <>
          {/* HUD superior */}
          <div className="absolute top-0 left-0 right-0 p-4 pointer-events-none">
            <div className="flex items-center justify-between max-w-6xl mx-auto">
              <div className="glass rounded-xl px-4 py-2.5">
                <div className="text-[10px] text-gray-400 uppercase tracking-wider">Velocidad</div>
                <div className="text-3xl font-bold text-cyan-400 hud-text">{stats.speed}<span className="text-sm text-gray-500 ml-1">km/h</span></div>
              </div>
              <div className="glass rounded-xl px-5 py-2.5">
                <div className="text-[10px] text-gray-400 uppercase tracking-wider text-center">Puntuación</div>
                <div className="text-3xl font-bold text-amber-400 hud-text text-center">{stats.score.toLocaleString()}</div>
              </div>
              <button onClick={() => setStats((s) => ({ ...s, gameState: 'menu' }))} className="glass rounded-xl px-4 py-2.5 text-gray-300 hover:text-white pointer-events-auto">Pausa</button>
            </div>
          </div>

          {/* HUD inferior */}
          <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-none">
            <div className="flex items-end justify-between max-w-6xl mx-auto">
              <div className="glass rounded-xl px-4 py-3">
                <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Vidas</div>
                <div className="flex gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className={`w-4 h-4 rounded-full ${i < stats.health ? 'bg-rose-500' : 'bg-gray-700'}`} />
                  ))}
                </div>
              </div>
              <div className="glass rounded-xl px-4 py-3 text-right">
                <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Distancia</div>
                <div className="text-xl font-bold text-violet-400">{stats.distance}m</div>
              </div>
              <div className="glass rounded-xl px-4 py-3 text-right">
                <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">NITRO [SHIFT]</div>
                <div className="h-2.5 w-28 bg-gray-800 rounded-full overflow-hidden ml-auto">
                  <div className="h-full rounded-full transition-all" style={{ width: `${stats.nitro}%`, background: 'linear-gradient(90deg,#f472b6,#a855f7)' }} />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {stats.gameState !== 'playing' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="text-center max-w-lg px-6 animate-fade-in">
            <h2 className="text-5xl font-black mb-3" style={{ background: 'linear-gradient(135deg,#ff22aa,#00e5ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>NEON RACER</h2>
            {stats.gameState === 'gameover' ? (
              <>
                <p className="text-rose-400 mb-2 text-lg font-bold">¡ACCIDENTE!</p>
                <div className="glass rounded-xl p-6 mb-6 mt-4">
                  <div className="text-gray-400 text-sm uppercase tracking-wider mb-1">Puntuación Final</div>
                  <div className="text-4xl font-bold text-amber-400">{stats.score.toLocaleString()}</div>
                  <div className="text-gray-500 text-sm mt-2">{stats.distance}m recorridos</div>
                </div>
                <button onClick={start} className="btn-primary text-lg px-8 py-3.5 mb-4">REINTENTAR</button>
              </>
            ) : (
              <>
                <p className="text-gray-400 mb-8">Conduce a toda velocidad por la autopista neón.<br/>A/D para cambiar de carril. Shift para nitro.</p>
                <button onClick={start} className="btn-primary text-lg px-8 py-3.5 mb-4">ARRANCAR</button>
              </>
            )}
            <div><button onClick={onExit} className="btn-ghost text-sm">Salir al menú</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
