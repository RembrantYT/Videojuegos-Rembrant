import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { createBaseScene, disposeScene } from '../three/base';

interface Enemy {
  mesh: THREE.Group;
  health: number;
  alive: boolean;
  fireCooldown: number;
}

interface Laser {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  fromEnemy: boolean;
  life: number;
}

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

interface Star {
  mesh: THREE.Mesh;
  speed: number;
}

interface GameStats {
  health: number;
  score: number;
  wave: number;
  enemiesLeft: number;
  boost: number;
  gameState: 'menu' | 'playing' | 'gameover';
}

export default function VoidRaider({ onExit }: { onExit: () => void }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState<GameStats>({
    health: 100,
    score: 0,
    wave: 1,
    enemiesLeft: 0,
    boost: 100,
    gameState: 'menu',
  });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const ctx = createBaseScene(container);
    const { scene, camera, renderer, clock } = ctx;

    scene.background = new THREE.Color(0x000208);
    scene.fog = new THREE.Fog(0x000208, 40, 120);

    // Luces
    scene.add(new THREE.AmbientLight(0x3344aa, 0.4));
    const keyLight = new THREE.DirectionalLight(0x6688ff, 0.6);
    keyLight.position.set(5, 10, 5);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0xff4466, 0.3);
    rimLight.position.set(-5, -3, -5);
    scene.add(rimLight);

    // Campo de estrellas
    const stars: Star[] = [];
    const starGeo = new THREE.SphereGeometry(0.3, 6, 6);
    const starMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let i = 0; i < 400; i++) {
      const star = new THREE.Mesh(starGeo, starMat);
      star.position.set(
        (Math.random() - 0.5) * 200,
        (Math.random() - 0.5) * 200,
        (Math.random() - 0.5) * 200
      );
      star.scale.setScalar(Math.random() * 0.8 + 0.2);
      scene.add(star);
      stars.push({ mesh: star, speed: 5 + Math.random() * 15 });
    }

    // Nebulosa
    const nebulaGeo = new THREE.IcosahedronGeometry(80, 2);
    const nebulaMat = new THREE.MeshBasicMaterial({
      color: 0x440088,
      transparent: true,
      opacity: 0.05,
      side: THREE.BackSide,
    });
    const nebula = new THREE.Mesh(nebulaGeo, nebulaMat);
    scene.add(nebula);

    // Nave del jugador
    const shipGroup = new THREE.Group();
    const hullMat = new THREE.MeshStandardMaterial({ color: 0x4488ff, roughness: 0.3, metalness: 0.8, emissive: 0x224488, emissiveIntensity: 0.3 });
    const accentMat = new THREE.MeshStandardMaterial({ color: 0x00e5ff, roughness: 0.2, metalness: 0.9, emissive: 0x00aacc, emissiveIntensity: 0.5 });

    const hull = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.5, 6), hullMat);
    hull.rotation.x = Math.PI / 2;
    shipGroup.add(hull);

    const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 0.5), accentMat);
    wingL.position.set(-0.5, 0, 0.1);
    shipGroup.add(wingL);
    const wingR = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 0.5), accentMat);
    wingR.position.set(0.5, 0, 0.1);
    shipGroup.add(wingR);

    // Thruster glow
    const thrusterMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8 });
    const thruster = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.6, 8), thrusterMat);
    thruster.rotation.x = -Math.PI / 2;
    thruster.position.z = 0.8;
    shipGroup.add(thruster);

    const thrusterLight = new THREE.PointLight(0x00ffff, 2, 6);
    thrusterLight.position.z = 1;
    shipGroup.add(thrusterLight);

    camera.position.set(0, 2, 5);
    camera.lookAt(0, 0, 0);
    scene.add(shipGroup);

    // Crosshair en 3D space
    const crossGeo = new THREE.RingGeometry(0.15, 0.2, 16);
    const crossMat = new THREE.MeshBasicMaterial({ color: 0x00e5a8, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
    const crosshair3D = new THREE.Mesh(crossGeo, crossMat);
    crosshair3D.position.set(0, 0, -10);
    camera.add(crosshair3D);
    scene.add(camera);

    // Game state
    const gs = {
      health: 100,
      score: 0,
      wave: 1,
      enemiesLeft: 0,
      boost: 100,
      boostActive: false,
      status: 'menu' as 'menu' | 'playing' | 'gameover',
      enemies: [] as Enemy[],
      lasers: [] as Laser[],
      particles: [] as Particle[],
      mouseX: 0,
      mouseY: 0,
      fireCooldown: 0,
      waveSpawnTimer: 0,
      waveEnemyCount: 0,
      waveEnemiesSpawned: 0,
      shipTilt: 0,
      invulnTimer: 0,
    };

    function createEnemy(): Enemy {
      const group = new THREE.Group();
      const enemyMat = new THREE.MeshStandardMaterial({
        color: 0xff3355,
        roughness: 0.4,
        metalness: 0.7,
        emissive: 0x880022,
        emissiveIntensity: 0.4,
      });

      const body = new THREE.Mesh(new THREE.OctahedronGeometry(0.6), enemyMat);
      group.add(body);

      const wing = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.3), enemyMat);
      group.add(wing);

      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xff0000 })
      );
      eye.position.z = 0.4;
      group.add(eye);

      const angle = Math.random() * Math.PI * 2;
      const dist = 30 + Math.random() * 20;
      group.position.set(
        Math.cos(angle) * dist * 0.3,
        (Math.random() - 0.5) * 10,
        -dist
      );

      scene.add(group);
      return {
        mesh: group,
        health: 2 + Math.floor(gs.wave * 0.4),
        alive: true,
        fireCooldown: 1 + Math.random() * 2,
      };
    }

    function createLaser(from: THREE.Vector3, dir: THREE.Vector3, fromEnemy: boolean, color: number): Laser {
      const geo = new THREE.CylinderGeometry(0.08, 0.08, 1.5, 6);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(from);
      mesh.lookAt(from.clone().add(dir));
      mesh.rotateX(Math.PI / 2);
      scene.add(mesh);
      return {
        mesh,
        velocity: dir.clone().multiplyScalar(fromEnemy ? 30 : 80),
        fromEnemy,
        life: 2,
      };
    }

    function spawnExplosion(pos: THREE.Vector3, color: number, count: number) {
      for (let i = 0; i < count; i++) {
        const geo = new THREE.SphereGeometry(0.1 + Math.random() * 0.15, 6, 6);
        const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(pos);
        const vel = new THREE.Vector3(
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10
        );
        scene.add(mesh);
        gs.particles.push({ mesh, velocity: vel, life: 0.8, maxLife: 0.8 });
      }
      // Flash
      const flashLight = new THREE.PointLight(color, 5, 10);
      flashLight.position.copy(pos);
      scene.add(flashLight);
      setTimeout(() => scene.remove(flashLight), 150);
    }

    function fireLaser() {
      if (gs.fireCooldown > 0 || gs.status !== 'playing') return;
      gs.fireCooldown = 0.15;
      const origin = shipGroup.position.clone();
      origin.z -= 0.8;
      const dir = new THREE.Vector3(0, 0, -1);
      gs.lasers.push(createLaser(origin, dir, false, 0x00ffaa));
    }

    function startWave() {
      gs.waveEnemyCount = 4 + gs.wave * 2;
      gs.waveEnemiesSpawned = 0;
      gs.enemiesLeft = gs.waveEnemyCount;
      gs.waveSpawnTimer = 0;
      setStats((s) => ({ ...s, wave: gs.wave, enemiesLeft: gs.enemiesLeft }));
    }

    function startGame() {
      gs.status = 'playing';
      gs.health = 100;
      gs.score = 0;
      gs.wave = 1;
      gs.boost = 100;
      gs.enemies.forEach((e) => scene.remove(e.mesh));
      gs.enemies = [];
      gs.lasers.forEach((l) => scene.remove(l.mesh));
      gs.lasers = [];
      shipGroup.position.set(0, 0, 0);
      startWave();
      setStats({
        health: 100,
        score: 0,
        wave: 1,
        enemiesLeft: gs.waveEnemyCount,
        boost: 100,
        gameState: 'playing',
      });
    }

    (window as unknown as { __voidStart: () => void }).__voidStart = startGame;

    // Input
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (gs.status === 'playing' && gs.boost > 0) {
          gs.boostActive = true;
          fireLaser();
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') gs.boostActive = false;
    };
    const onMouseMove = (e: MouseEvent) => {
      gs.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      gs.mouseY = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    const onMouseDown = () => {
      if (gs.status === 'playing') fireLaser();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);

    let animId = 0;

    function animate() {
      animId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);

      // Rotar nebulosa
      nebula.rotation.y += dt * 0.02;

      // Estrellas siempre se mueven
      const starSpeed = gs.status === 'playing' ? (gs.boostActive ? 60 : 25) : 8;
      stars.forEach((s) => {
        s.mesh.position.z += starSpeed * dt * s.speed * 0.1;
        if (s.mesh.position.z > 50) {
          s.mesh.position.z = -150;
          s.mesh.position.x = (Math.random() - 0.5) * 200;
          s.mesh.position.y = (Math.random() - 0.5) * 200;
        }
      });

      if (gs.status === 'playing') {
        // Nave sigue al mouse
        const targetX = gs.mouseX * 8;
        const targetY = gs.mouseY * 5;
        shipGroup.position.x = THREE.MathUtils.lerp(shipGroup.position.x, targetX, 0.1);
        shipGroup.position.y = THREE.MathUtils.lerp(shipGroup.position.y, targetY, 0.1);
        gs.shipTilt = THREE.MathUtils.lerp(gs.shipTilt, -gs.mouseX * 0.5, 0.1);
        shipGroup.rotation.z = gs.shipTilt;
        shipGroup.rotation.y = -gs.mouseX * 0.3;
        shipGroup.rotation.x = gs.mouseY * 0.2;

        // Cámara sigue la nave
        camera.position.x = THREE.MathUtils.lerp(camera.position.x, shipGroup.position.x * 0.5, 0.08);
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, shipGroup.position.y * 0.5 + 2, 0.08);
        camera.lookAt(shipGroup.position.x * 0.3, shipGroup.position.y * 0.3, -5);

        // Thruster effect
        thruster.scale.z = gs.boostActive ? 2.5 : 1 + Math.sin(performance.now() * 0.02) * 0.3;
        thrusterLight.intensity = gs.boostActive ? 5 : 2;

        // Boost
        if (gs.boostActive && gs.boost > 0) {
          gs.boost = Math.max(0, gs.boost - 30 * dt);
        } else {
          gs.boost = Math.min(100, gs.boost + 15 * dt);
        }

        if (gs.fireCooldown > 0) gs.fireCooldown -= dt;
        if (gs.invulnTimer > 0) gs.invulnTimer -= dt;

        // Auto-fire si se mantiene el click (simplificado: fire en cooldown bajo)
        // Spawn enemies
        gs.waveSpawnTimer += dt;
        const spawnInt = Math.max(0.8, 2.5 - gs.wave * 0.1);
        if (gs.waveEnemiesSpawned < gs.waveEnemyCount && gs.waveSpawnTimer > spawnInt) {
          gs.waveSpawnTimer = 0;
          gs.waveEnemiesSpawned++;
          gs.enemies.push(createEnemy());
        }

        // Update enemies
        for (const e of gs.enemies) {
          if (!e.alive) continue;
          // Mover hacia el jugador
          const dir = new THREE.Vector3().subVectors(shipGroup.position, e.mesh.position).normalize();
          const speed = 4 + gs.wave * 0.3;
          e.mesh.position.add(dir.multiplyScalar(speed * dt));
          e.mesh.lookAt(shipGroup.position);
          e.mesh.rotation.z += dt * 2;

          // Fire
          e.fireCooldown -= dt;
          if (e.fireCooldown <= 0 && e.mesh.position.z > -25) {
            e.fireCooldown = 2 + Math.random() * 2;
            const fireDir = new THREE.Vector3().subVectors(shipGroup.position, e.mesh.position).normalize();
            gs.lasers.push(createLaser(e.mesh.position.clone(), fireDir, true, 0xff3355));
          }

          // Collision con jugador
          if (e.mesh.position.distanceTo(shipGroup.position) < 1.2 && gs.invulnTimer <= 0) {
            gs.health -= 20;
            gs.invulnTimer = 1;
            spawnExplosion(shipGroup.position.clone(), 0xff3355, 15);
            e.alive = false;
            scene.remove(e.mesh);
            gs.enemiesLeft--;
            if (gs.health <= 0) {
              gs.health = 0;
              gs.status = 'gameover';
              setStats((s) => ({ ...s, health: 0, gameState: 'gameover' }));
            }
          }
        }
        gs.enemies = gs.enemies.filter((e) => e.alive);

        // Update lasers
        gs.lasers = gs.lasers.filter((l) => {
          l.life -= dt;
          if (l.life <= 0) {
            scene.remove(l.mesh);
            return false;
          }
          l.mesh.position.add(l.velocity.clone().multiplyScalar(dt));
          if (l.mesh.position.z > 30 || l.mesh.position.z < -80) {
            scene.remove(l.mesh);
            return false;
          }

          if (!l.fromEnemy) {
            for (const e of gs.enemies) {
              if (!e.alive) continue;
              if (l.mesh.position.distanceTo(e.mesh.position) < 0.9) {
                e.health--;
                scene.remove(l.mesh);
                spawnExplosion(l.mesh.position.clone(), 0x00ffaa, 6);
                if (e.health <= 0) {
                  e.alive = false;
                  scene.remove(e.mesh);
                  gs.score += 150 * gs.wave;
                  gs.enemiesLeft--;
                  spawnExplosion(e.mesh.position.clone(), 0xff4466, 25);
                }
                return false;
              }
            }
          } else {
            if (l.mesh.position.distanceTo(shipGroup.position) < 0.8 && gs.invulnTimer <= 0) {
              gs.health -= 10;
              gs.invulnTimer = 0.5;
              scene.remove(l.mesh);
              spawnExplosion(l.mesh.position.clone(), 0xff3355, 8);
              if (gs.health <= 0) {
                gs.health = 0;
                gs.status = 'gameover';
                setStats((s) => ({ ...s, health: 0, gameState: 'gameover' }));
              }
              return false;
            }
          }
          return true;
        });

        // Wave complete
        if (gs.enemiesLeft <= 0 && gs.waveEnemiesSpawned >= gs.waveEnemyCount) {
          gs.wave++;
          gs.health = Math.min(100, gs.health + 20);
          startWave();
        }

        setStats((s) => ({
          ...s,
          health: Math.ceil(gs.health),
          score: gs.score,
          boost: Math.round(gs.boost),
          enemiesLeft: gs.enemiesLeft,
          wave: gs.wave,
        }));
      }

      // Particles
      gs.particles = gs.particles.filter((p) => {
        p.life -= dt;
        if (p.life <= 0) {
          scene.remove(p.mesh);
          p.mesh.geometry.dispose();
          (p.mesh.material as THREE.Material).dispose();
          return false;
        }
        p.mesh.position.add(p.velocity.clone().multiplyScalar(dt));
        p.velocity.multiplyScalar(0.96);
        (p.mesh.material as THREE.MeshBasicMaterial).opacity = p.life / p.maxLife;
        return true;
      });

      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      disposeScene(scene);
      ctx.cleanup();
      delete (window as unknown as Record<string, unknown>).__voidStart;
    };
  }, []);

  const start = () => {
    (window as unknown as { __voidStart?: () => void }).__voidStart?.();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div ref={mountRef} className="w-full h-full" />

      {stats.gameState === 'playing' && (
        <>
          {/* Crosshair */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="relative w-12 h-12">
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-cyan-400 rounded-full" />
              <div className="absolute inset-0 border-2 border-cyan-400/30 rounded-full" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-3 bg-cyan-400/60" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0.5 h-3 bg-cyan-400/60" />
              <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 w-3 bg-cyan-400/60" />
              <div className="absolute right-0 top-1/2 -translate-y-1/2 h-0.5 w-3 bg-cyan-400/60" />
            </div>
          </div>

          {/* HUD superior */}
          <div className="absolute top-0 left-0 right-0 p-4 pointer-events-none">
            <div className="flex items-center justify-between max-w-6xl mx-auto">
              <div className="glass rounded-xl px-4 py-2.5 flex gap-4 items-center">
                <div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider">Oleada</div>
                  <div className="text-2xl font-bold text-cyan-400 hud-text">{stats.wave}</div>
                </div>
                <div className="w-px h-10 bg-gray-700" />
                <div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider">Enemigos</div>
                  <div className="text-2xl font-bold text-rose-400 hud-text">{stats.enemiesLeft}</div>
                </div>
              </div>
              <div className="glass rounded-xl px-5 py-2.5">
                <div className="text-[10px] text-gray-400 uppercase tracking-wider text-center">Puntuación</div>
                <div className="text-3xl font-bold text-amber-400 hud-text text-center">{stats.score.toLocaleString()}</div>
              </div>
              <button
                onClick={() => setStats((s) => ({ ...s, gameState: 'menu' }))}
                className="glass rounded-xl px-4 py-2.5 text-gray-300 hover:text-white pointer-events-auto"
              >
                Pausa
              </button>
            </div>
          </div>

          {/* HUD inferior */}
          <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-none">
            <div className="flex items-end justify-between max-w-6xl mx-auto">
              <div className="glass rounded-xl px-4 py-3 min-w-[200px]">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider">Casco</span>
                  <span className="text-sm font-bold text-white">{stats.health}%</span>
                </div>
                <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${stats.health}%`, background: stats.health > 50 ? 'linear-gradient(90deg,#22d3ee,#00e5a8)' : 'linear-gradient(90deg,#f59e0b,#ff3b5c)' }} />
                </div>
              </div>
              <div className="glass rounded-xl px-5 py-3 text-right">
                <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Boost [ESPACIO]</div>
                <div className="h-2.5 w-32 bg-gray-800 rounded-full overflow-hidden ml-auto">
                  <div className="h-full rounded-full transition-all" style={{ width: `${stats.boost}%`, background: 'linear-gradient(90deg,#4f7cff,#a855f7)' }} />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {stats.gameState !== 'playing' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="text-center max-w-lg px-6 animate-fade-in">
            <h2 className="text-5xl font-black text-cyan-400 mb-3 text-glow">VOID RAIDER</h2>
            {stats.gameState === 'gameover' ? (
              <>
                <p className="text-rose-400 mb-2 text-lg font-bold">NAVE DESTRUIDA</p>
                <div className="glass rounded-xl p-6 mb-6 mt-4">
                  <div className="text-gray-400 text-sm uppercase tracking-wider mb-1">Puntuación Final</div>
                  <div className="text-4xl font-bold text-amber-400">{stats.score.toLocaleString()}</div>
                  <div className="text-gray-500 text-sm mt-2">Oleada alcanzada: {stats.wave}</div>
                </div>
                <button onClick={start} className="btn-primary text-lg px-8 py-3.5 mb-4">REINTENTAR</button>
              </>
            ) : (
              <>
                <p className="text-gray-400 mb-8">Combate espacial en el vacío infinito.<br/>Mueve el ratón para pilotar. Click para disparar.</p>
                <button onClick={start} className="btn-primary text-lg px-8 py-3.5 mb-4">INICIAR MISIÓN</button>
              </>
            )}
            <div><button onClick={onExit} className="btn-ghost text-sm">Salir al menú</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
