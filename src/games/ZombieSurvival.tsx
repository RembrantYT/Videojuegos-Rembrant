import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { createBaseScene, makePointerLock, wasdKeys, disposeScene } from '../three/base';

interface Zombie {
  mesh: THREE.Group;
  speed: number;
  health: number;
  alive: boolean;
}

interface Bullet {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
}

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

interface GameStats {
  health: number;
  ammo: number;
  maxAmmo: number;
  score: number;
  wave: number;
  zombiesLeft: number;
  reloading: boolean;
  gameState: 'playing' | 'gameover' | 'paused';
}

export default function ZombieSurvival({ onExit }: { onExit: () => void }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState<GameStats>({
    health: 100,
    ammo: 12,
    maxAmmo: 12,
    score: 0,
    wave: 1,
    zombiesLeft: 0,
    reloading: false,
    gameState: 'paused',
  });
  const statsRef = useRef(stats);
  statsRef.current = stats;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const ctx = createBaseScene(container);
    const { scene, camera, renderer, clock } = ctx;

    scene.background = new THREE.Color(0x0a0a12);
    scene.fog = new THREE.FogExp2(0x0a0a12, 0.045);

    // Iluminación atmosférica
    const moonLight = new THREE.DirectionalLight(0x6688ff, 0.4);
    moonLight.position.set(20, 40, 10);
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.set(2048, 2048);
    moonLight.shadow.camera.near = 0.5;
    moonLight.shadow.camera.far = 100;
    moonLight.shadow.camera.left = -50;
    moonLight.shadow.camera.right = 50;
    moonLight.shadow.camera.top = 50;
    moonLight.shadow.camera.bottom = -50;
    scene.add(moonLight);
    scene.add(new THREE.AmbientLight(0x334466, 0.3));

    // Linterna del jugador
    const flashlight = new THREE.SpotLight(0xfff0dd, 2.5, 35, Math.PI / 5, 0.4, 1.5);
    flashlight.castShadow = true;
    flashlight.shadow.mapSize.set(1024, 1024);
    scene.add(flashlight);
    scene.add(flashlight.target);

    // Suelo
    const groundGeo = new THREE.PlaneGeometry(120, 120);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x1a1a22, roughness: 0.95, metalness: 0.05 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Grid pattern en el suelo
    const grid = new THREE.GridHelper(120, 60, 0x223344, 0x111122);
    (grid.material as THREE.Material).opacity = 0.3;
    (grid.material as THREE.Material).transparent = true;
    scene.add(grid);

    // Edificios / obstáculos
    const buildings: THREE.Mesh[] = [];
    const buildingMat = new THREE.MeshStandardMaterial({ color: 0x252530, roughness: 0.8, metalness: 0.2 });
    const buildingPositions = [
      { x: -15, z: -10, w: 6, h: 12, d: 6 },
      { x: 18, z: -8, w: 8, h: 18, d: 6 },
      { x: -20, z: 12, w: 5, h: 8, d: 5 },
      { x: 22, z: 15, w: 7, h: 14, d: 7 },
      { x: 0, z: -25, w: 12, h: 20, d: 6 },
      { x: -30, z: -5, w: 4, h: 10, d: 4 },
      { x: 30, z: -20, w: 6, h: 16, d: 6 },
      { x: 8, z: 20, w: 5, h: 7, d: 8 },
      { x: -12, z: -18, w: 7, h: 11, d: 5 },
    ];
    buildingPositions.forEach((b) => {
      const geo = new THREE.BoxGeometry(b.w, b.h, b.d);
      const mesh = new THREE.Mesh(geo, buildingMat);
      mesh.position.set(b.x, b.h / 2, b.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.isObstacle = true;
      scene.add(mesh);
      buildings.push(mesh);

      // Ventanas brillantes
      for (let i = 0; i < 3; i++) {
        const winGeo = new THREE.PlaneGeometry(1, 1.2);
        const winMat = new THREE.MeshStandardMaterial({
          color: 0xffaa44,
          emissive: 0xff8822,
          emissiveIntensity: 0.6,
          transparent: true,
          opacity: 0.7,
        });
        const win = new THREE.Mesh(winGeo, winMat);
        win.position.set(b.x, 3 + i * 3, b.z + b.d / 2 + 0.01);
        scene.add(win);
      }
    });

    // Barriles
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x884422, roughness: 0.6, metalness: 0.4 });
    for (let i = 0; i < 8; i++) {
      const geo = new THREE.CylinderGeometry(0.6, 0.6, 1.5, 12);
      const barrel = new THREE.Mesh(geo, barrelMat);
      barrel.position.set(
        (Math.random() - 0.5) * 50,
        0.75,
        (Math.random() - 0.5) * 50
      );
      barrel.castShadow = true;
      barrel.userData.isObstacle = true;
      scene.add(barrel);
    }

    // Arma en primera persona
    const gunGroup = new THREE.Group();
    const gunBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.25, 0.9),
      new THREE.MeshStandardMaterial({ color: 0x1a1a22, roughness: 0.4, metalness: 0.8 })
    );
    gunBody.position.set(0, -0.05, -0.3);
    gunGroup.add(gunBody);

    const gunBarrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8),
      new THREE.MeshStandardMaterial({ color: 0x333338, roughness: 0.3, metalness: 0.9 })
    );
    gunBarrel.rotation.x = Math.PI / 2;
    gunBarrel.position.set(0, 0, -0.8);
    gunGroup.add(gunBarrel);

    const gunGrip = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.3, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x222228, roughness: 0.6, metalness: 0.3 })
    );
    gunGrip.position.set(0, -0.25, 0.05);
    gunGroup.add(gunGrip);

    gunGroup.position.set(0.4, -0.35, -0.6);
    camera.add(gunGroup);
    scene.add(camera);

    // Muzzle flash
    const muzzleFlash = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffdd66, transparent: true, opacity: 0 })
    );
    muzzleFlash.position.set(0, 0, -1.1);
    gunGroup.add(muzzleFlash);

    // Muzzle flash light
    const muzzleLight = new THREE.PointLight(0xffaa44, 0, 8);
    muzzleLight.position.set(0, 0, -1.2);
    gunGroup.add(muzzleLight);

    // State de juego local
    const gameState = {
      health: 100,
      ammo: 12,
      maxAmmo: 12,
      score: 0,
      wave: 1,
      zombiesLeft: 0,
      reloading: false,
      reloadTimer: 0,
      status: 'paused' as 'playing' | 'gameover' | 'paused',
      zombies: [] as Zombie[],
      bullets: [] as Bullet[],
      particles: [] as Particle[],
      waveSpawnTimer: 0,
      waveZombieCount: 0,
      waveZombiesSpawned: 0,
      shootCooldown: 0,
      damageFlash: 0,
      playerVelocity: new THREE.Vector3(),
      bobTime: 0,
    };

    // Pointer lock
    const pointer = makePointerLock(camera, renderer.domElement);

    // WASD
    const wasd = wasdKeys();

    // Crear zombie
    function createZombie(): Zombie {
      const group = new THREE.Group();
      const skinColor = 0x4a5d3a;
      const bodyMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.9, metalness: 0 });
      const clothMat = new THREE.MeshStandardMaterial({ color: 0x33221a, roughness: 0.95, metalness: 0 });

      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.35), clothMat);
      torso.position.y = 1.1;
      torso.castShadow = true;
      group.add(torso);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 12), bodyMat);
      head.position.y = 1.75;
      head.castShadow = true;
      group.add(head);

      // Ojos brillantes
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff3300 });
      const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), eyeMat);
      eyeL.position.set(-0.1, 1.78, 0.25);
      group.add(eyeL);
      const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), eyeMat);
      eyeR.position.set(0.1, 1.78, 0.25);
      group.add(eyeR);

      const armL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.7, 0.15), bodyMat);
      armL.position.set(-0.42, 1.1, 0.1);
      armL.rotation.x = -0.5;
      armL.castShadow = true;
      group.add(armL);
      const armR = armL.clone();
      armR.position.x = 0.42;
      group.add(armR);

      const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.75, 0.2), clothMat);
      legL.position.set(-0.15, 0.38, 0);
      legL.castShadow = true;
      group.add(legL);
      const legR = legL.clone();
      legR.position.x = 0.15;
      group.add(legR);

      // Spawn alejado del jugador
      const angle = Math.random() * Math.PI * 2;
      const distance = 25 + Math.random() * 10;
      group.position.set(
        Math.cos(angle) * distance,
        0,
        Math.sin(angle) * distance
      );

      group.userData.legL = legL;
      group.userData.legR = legR;
      group.userData.armL = armL;
      group.userData.armR = armR;
      group.userData.walkPhase = Math.random() * Math.PI * 2;

      scene.add(group);
      return {
        mesh: group,
        speed: 1.2 + gameState.wave * 0.15 + Math.random() * 0.6,
        health: 2 + Math.floor(gameState.wave * 0.5),
        alive: true,
      };
    }

    function startWave() {
      gameState.waveZombieCount = 5 + gameState.wave * 3;
      gameState.waveZombiesSpawned = 0;
      gameState.zombiesLeft = gameState.waveZombieCount;
      gameState.waveSpawnTimer = 0;
      setStats((s) => ({ ...s, wave: gameState.wave, zombiesLeft: gameState.zombiesLeft }));
    }

    function spawnParticles(position: THREE.Vector3, color: number, count: number) {
      for (let i = 0; i < count; i++) {
        const geo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
        const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(position);
        const vel = new THREE.Vector3(
          (Math.random() - 0.5) * 5,
          Math.random() * 4,
          (Math.random() - 0.5) * 5
        );
        scene.add(mesh);
        gameState.particles.push({ mesh, velocity: vel, life: 0.6, maxLife: 0.6 });
      }
    }

    function shoot() {
      if (gameState.status !== 'playing') return;
      if (gameState.reloading) return;
      if (gameState.ammo <= 0) {
        startReload();
        return;
      }
      if (gameState.shootCooldown > 0) return;

      gameState.ammo--;
      gameState.shootCooldown = 0.12;

      // Muzzle flash
      (muzzleFlash.material as THREE.MeshBasicMaterial).opacity = 1;
      muzzleLight.intensity = 3;

      // Raycast
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

      let hitDistance = 100;
      let hitZombie: Zombie | null = null;
      for (const z of gameState.zombies) {
        if (!z.alive) continue;
        const hits = raycaster.intersectObject(z.mesh, true);
        if (hits.length > 0 && hits[0].distance < hitDistance) {
          hitDistance = hits[0].distance;
          hitZombie = z;
        }
      }

      // También checar obstáculos
      for (const b of buildings) {
        const hits = raycaster.intersectObject(b, false);
        if (hits.length > 0 && hits[0].distance < hitDistance) {
          hitDistance = hits[0].distance;
          hitZombie = null;
        }
      }

      if (hitZombie) {
        hitZombie.health--;
        const hitPoint = new THREE.Vector3();
        raycaster.ray.at(hitDistance, hitPoint);
        spawnParticles(hitPoint, 0x88aa44, 8);
        if (hitZombie.health <= 0) {
          hitZombie.alive = false;
          scene.remove(hitZombie.mesh);
          gameState.score += 100 * gameState.wave;
          gameState.zombiesLeft--;
          spawnParticles(hitZombie.mesh.position.clone().setY(1), 0x4a5d3a, 20);
        }
      }

      // Bullet hole effect (línea visible)
      const bulletEnd = new THREE.Vector3();
      raycaster.ray.at(hitDistance, bulletEnd);
      const bulletGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3().copy(muzzleFlash.getWorldPosition(new THREE.Vector3())),
        bulletEnd,
      ]);
      const bulletLine = new THREE.Line(
        bulletGeo,
        new THREE.LineBasicMaterial({ color: 0xffdd66, transparent: true, opacity: 0.5 })
      );
      scene.add(bulletLine);
      setTimeout(() => scene.remove(bulletLine), 80);

      setStats((s) => ({ ...s, ammo: gameState.ammo, score: gameState.score, zombiesLeft: gameState.zombiesLeft }));

      if (gameState.ammo <= 0) {
        startReload();
      }
    }

    function startReload() {
      if (gameState.reloading || gameState.ammo === gameState.maxAmmo) return;
      gameState.reloading = true;
      gameState.reloadTimer = 1.8;
      setStats((s) => ({ ...s, reloading: true }));
    }

    // Mouse click para disparar
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0) shoot();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyR') startReload();
    };
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('keydown', onKeyDown);

    // Iniciar juego
    function startGame() {
      gameState.status = 'playing';
      gameState.health = 100;
      gameState.ammo = 12;
      gameState.score = 0;
      gameState.wave = 1;
      gameState.reloading = false;
      gameState.zombies.forEach((z) => scene.remove(z.mesh));
      gameState.zombies = [];
      gameState.bullets.forEach((b) => scene.remove(b.mesh));
      gameState.bullets = [];
      startWave();
      pointer.lock();
      setStats({
        health: 100,
        ammo: 12,
        maxAmmo: 12,
        score: 0,
        wave: 1,
        zombiesLeft: gameState.waveZombieCount,
        reloading: false,
        gameState: 'playing',
      });
    }

    (window as unknown as { __startZombieGame: () => void }).__startZombieGame = startGame;
    (window as unknown as { __exitZombieGame: () => void }).__exitZombieGame = onExit;

    // Collision check
    function checkCollision(pos: THREE.Vector3): boolean {
      for (const b of buildings) {
        const box = new THREE.Box3().setFromObject(b);
        if (
          pos.x > box.min.x - 0.6 &&
          pos.x < box.max.x + 0.6 &&
          pos.z > box.min.z - 0.6 &&
          pos.z < box.max.z + 0.6
        ) {
          return true;
        }
      }
      // Limite del mapa
      if (Math.abs(pos.x) > 58 || Math.abs(pos.z) > 58) return true;
      return false;
    }

    let animationId = 0;

    function animate() {
      animationId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);

      if (gameState.status === 'playing') {
        // Actualizar flashlight
        flashlight.position.copy(camera.position);
        flashlight.target.position.copy(camera.position).add(
          new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
        );

        // Movimiento del jugador
        const speed = wasd.isDown('ShiftLeft') ? 8 : 4.5;
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

        const newPos = camera.position.clone().add(move);
        if (!checkCollision(newPos)) {
          camera.position.x = newPos.x;
          camera.position.z = newPos.z;
        }
        camera.position.y = 1.6;

        // Bob del arma al caminar
        if (move.lengthSq() > 0) {
          gameState.bobTime += dt * 10;
          gunGroup.position.y = -0.35 + Math.sin(gameState.bobTime) * 0.015;
          gunGroup.position.x = 0.4 + Math.cos(gameState.bobTime * 0.5) * 0.008;
        } else {
          gunGroup.position.y = THREE.MathUtils.lerp(gunGroup.position.y, -0.35, 0.1);
          gunGroup.position.x = THREE.MathUtils.lerp(gunGroup.position.x, 0.4, 0.1);
        }

        // Fade muzzle flash
        if ((muzzleFlash.material as THREE.MeshBasicMaterial).opacity > 0) {
          (muzzleFlash.material as THREE.MeshBasicMaterial).opacity -= dt * 8;
          muzzleLight.intensity = Math.max(0, muzzleLight.intensity - dt * 30);
        }

        // Cooldowns
        if (gameState.shootCooldown > 0) gameState.shootCooldown -= dt;

        // Reload
        if (gameState.reloading) {
          gameState.reloadTimer -= dt;
          if (gameState.reloadTimer <= 0) {
            gameState.reloading = false;
            gameState.ammo = gameState.maxAmmo;
            setStats((s) => ({ ...s, ammo: gameState.maxAmmo, reloading: false }));
          }
        }

        // Spawn zombies
        gameState.waveSpawnTimer += dt;
        const spawnInterval = Math.max(0.8, 2.5 - gameState.wave * 0.15);
        if (gameState.waveZombiesSpawned < gameState.waveZombieCount && gameState.waveSpawnTimer > spawnInterval) {
          gameState.waveSpawnTimer = 0;
          gameState.waveZombiesSpawned++;
          gameState.zombies.push(createZombie());
        }

        // Actualizar zombies
        for (const z of gameState.zombies) {
          if (!z.alive) continue;
          const dir = new THREE.Vector3().subVectors(camera.position, z.mesh.position);
          dir.y = 0;
          const dist = dir.length();
          dir.normalize();

          // Rotar hacia el jugador
          z.mesh.lookAt(camera.position.x, z.mesh.position.y, camera.position.z);

          // Mover
          if (dist > 1.5) {
            const moveZ = dir.clone().multiplyScalar(z.speed * dt);
            const zPos = z.mesh.position.clone().add(moveZ);
            if (!checkCollision(zPos)) {
              z.mesh.position.copy(zPos);
            } else {
              // Intentar rodear
              const perp = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(z.speed * dt);
              const zPos2 = z.mesh.position.clone().add(perp);
              if (!checkCollision(zPos2)) z.mesh.position.copy(zPos2);
            }

            // Animación de caminar
            z.mesh.userData.walkPhase += dt * 6;
            const phase = z.mesh.userData.walkPhase;
            z.mesh.userData.legL.rotation.x = Math.sin(phase) * 0.5;
            z.mesh.userData.legR.rotation.x = -Math.sin(phase) * 0.5;
            z.mesh.userData.armL.rotation.x = -0.5 + Math.sin(phase) * 0.3;
            z.mesh.userData.armR.rotation.x = -0.5 - Math.sin(phase) * 0.3;
          } else {
            // Atacar al jugador
            gameState.health -= 15 * dt;
            gameState.damageFlash = 1;
            z.mesh.userData.armL.rotation.x = Math.sin(performance.now() * 0.01) * 0.8 - 0.8;
            z.mesh.userData.armR.rotation.x = -Math.sin(performance.now() * 0.01) * 0.8 - 0.8;
            if (gameState.health <= 0) {
              gameState.health = 0;
              gameState.status = 'gameover';
              document.exitPointerLock();
              setStats((s) => ({ ...s, health: 0, gameState: 'gameover' }));
            }
          }
        }

        // Limpiar zombies muertos
        gameState.zombies = gameState.zombies.filter((z) => z.alive || z.mesh.parent);

        // Siguiente oleada
        if (gameState.zombiesLeft <= 0 && gameState.waveZombiesSpawned >= gameState.waveZombieCount) {
          gameState.wave++;
          gameState.health = Math.min(100, gameState.health + 25);
          startWave();
        }

        setStats((s) => ({
          ...s,
          health: Math.ceil(gameState.health),
          score: gameState.score,
          zombiesLeft: gameState.zombiesLeft,
        }));
      }

      // Actualizar partículas
      gameState.particles = gameState.particles.filter((p) => {
        p.life -= dt;
        if (p.life <= 0) {
          scene.remove(p.mesh);
          p.mesh.geometry.dispose();
          (p.mesh.material as THREE.Material).dispose();
          return false;
        }
        p.velocity.y -= 9.8 * dt;
        p.mesh.position.add(p.velocity.clone().multiplyScalar(dt));
        (p.mesh.material as THREE.MeshBasicMaterial).opacity = p.life / p.maxLife;
        return true;
      });

      renderer.render(scene, camera);
    }

    animate();

    // Exponer startGame para el botón
    (window as unknown as { __zombieStart: () => void }).__zombieStart = startGame;

    return () => {
      cancelAnimationFrame(animationId);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('keydown', onKeyDown);
      pointer.cleanup();
      wasd.cleanup();
      disposeScene(scene);
      ctx.cleanup();
      delete (window as unknown as Record<string, unknown>).__startZombieGame;
      delete (window as unknown as Record<string, unknown>).__zombieStart;
      delete (window as unknown as Record<string, unknown>).__exitZombieGame;
    };
  }, [onExit]);

  const startGame = () => {
    const fn = (window as unknown as { __zombieStart?: () => void }).__zombieStart;
    if (fn) fn();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div ref={mountRef} className="w-full h-full" />

      {/* Crosshair */}
      {stats.gameState === 'playing' && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="relative">
            <div className="w-1 h-1 bg-emerald-400 rounded-full" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 border border-emerald-400/40 rounded-full" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-3 bg-emerald-400/60 -translate-y-5" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-3 bg-emerald-400/60 translate-y-5" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-0.5 w-3 bg-emerald-400/60 -translate-x-5" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-0.5 w-3 bg-emerald-400/60 translate-x-5" />
          </div>
        </div>
      )}

      {/* HUD superior */}
      {stats.gameState === 'playing' && (
        <div className="absolute top-0 left-0 right-0 p-4 pointer-events-none">
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            <div className="glass rounded-xl px-4 py-2.5 flex items-center gap-4">
              <div>
                <div className="text-[10px] text-gray-400 uppercase tracking-wider">Oleada</div>
                <div className="text-2xl font-bold text-emerald-400 hud-text">{stats.wave}</div>
              </div>
              <div className="w-px h-10 bg-gray-700" />
              <div>
                <div className="text-[10px] text-gray-400 uppercase tracking-wider">Zombies</div>
                <div className="text-2xl font-bold text-rose-400 hud-text">{stats.zombiesLeft}</div>
              </div>
            </div>

            <div className="glass rounded-xl px-5 py-2.5">
              <div className="text-[10px] text-gray-400 uppercase tracking-wider text-center">Puntuación</div>
              <div className="text-3xl font-bold text-amber-400 hud-text text-center">{stats.score.toLocaleString()}</div>
            </div>

            <button
              onClick={() => {
                document.exitPointerLock();
                setStats((s) => ({ ...s, gameState: 'paused' }));
              }}
              className="glass rounded-xl px-4 py-2.5 text-gray-300 hover:text-white transition pointer-events-auto"
            >
              Pausa
            </button>
          </div>
        </div>
      )}

      {/* HUD inferior - Vida y munición */}
      {stats.gameState === 'playing' && (
        <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-none">
          <div className="flex items-end justify-between max-w-6xl mx-auto">
            <div className="glass rounded-xl px-4 py-3 min-w-[200px]">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider">Salud</span>
                <span className="text-sm font-bold text-white">{stats.health}</span>
              </div>
              <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${stats.health}%`,
                    background: stats.health > 50 ? 'linear-gradient(90deg, #10b981, #00e5a8)' : stats.health > 25 ? 'linear-gradient(90deg, #f59e0b, #ffb020)' : 'linear-gradient(90deg, #ef4444, #ff3b5c)',
                  }}
                />
              </div>
            </div>

            <div className="glass rounded-xl px-5 py-3 text-right">
              {stats.reloading ? (
                <div className="text-amber-400 font-bold text-lg animate-pulse">RECARGANDO...</div>
              ) : (
                <div className="flex items-center gap-1.5 justify-end">
                  <span className="text-2xl font-bold text-white hud-text">{stats.ammo}</span>
                  <span className="text-gray-500">/ {stats.maxAmmo}</span>
                </div>
              )}
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">Munición [R]</div>
            </div>
          </div>
        </div>
      )}

      {/* Pantalla de pausa / inicio / game over */}
      {stats.gameState !== 'playing' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="text-center max-w-lg px-6 animate-fade-in">
            {stats.gameState === 'paused' && stats.health > 0 && (
              <>
                <h2 className="text-5xl font-black text-white mb-3 text-glow">ZOMBIE OUTBREAK</h2>
                <p className="text-gray-400 mb-8">La ciudad ha caído. Sobrevive a las hordas.</p>
                <button onClick={startGame} className="btn-primary text-lg px-8 py-3.5 mb-4">
                  {stats.score > 0 ? 'CONTINUAR' : 'COMENZAR PARTIDA'}
                </button>
                <div>
                  <button onClick={onExit} className="btn-ghost text-sm">Salir al menú</button>
                </div>
              </>
            )}
            {stats.gameState === 'gameover' && (
              <>
                <h2 className="text-5xl font-black text-rose-500 mb-3">HAS MUERTO</h2>
                <p className="text-gray-400 mb-2">Las hordas te alcanzaron...</p>
                <div className="glass rounded-xl p-6 mb-6 mt-4">
                  <div className="text-gray-400 text-sm uppercase tracking-wider mb-1">Puntuación Final</div>
                  <div className="text-4xl font-bold text-amber-400">{stats.score.toLocaleString()}</div>
                  <div className="text-gray-500 text-sm mt-2">Oleada alcanzada: {stats.wave}</div>
                </div>
                <button onClick={startGame} className="btn-primary text-lg px-8 py-3.5 mb-4">REINTENTAR</button>
                <div>
                  <button onClick={onExit} className="btn-ghost text-sm">Salir al menú</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
