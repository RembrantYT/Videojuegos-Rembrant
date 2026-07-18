import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { createBaseScene, makePointerLock, wasdKeys, disposeScene } from '../three/base';

interface GameStats {
  petals: number;
  bells: number;
  gameState: 'menu' | 'playing';
}

export default function ZenGarden({ onExit }: { onExit: () => void }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState<GameStats>({ petals: 0, bells: 0, gameState: 'menu' });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const ctx = createBaseScene(container);
    const { scene, camera, renderer, clock } = ctx;

    scene.background = new THREE.Color(0xffd9a0);
    scene.fog = new THREE.Fog(0xffd9a0, 30, 80);

    // Luz cálida de atardecer
    scene.add(new THREE.AmbientLight(0xffe0b0, 0.6));
    const sun = new THREE.DirectionalLight(0xffaa66, 0.8);
    sun.position.set(20, 15, -20);
    scene.add(sun);
    const fill = new THREE.HemisphereLight(0xffcc88, 0x442200, 0.4);
    scene.add(fill);

    // Suelo de arena
    const sandMat = new THREE.MeshStandardMaterial({ color: 0xddc090, roughness: 0.95, metalness: 0 });
    const sand = new THREE.Mesh(new THREE.PlaneGeometry(60, 60, 60, 60), sandMat);
    sand.rotation.x = -Math.PI / 2;
    sand.receiveShadow = true;
    scene.add(sand);

    // Patrones en la arena (ríos de arena)
    const patternMat = new THREE.MeshBasicMaterial({ color: 0xc4a870, transparent: true, opacity: 0.5 });
    for (let i = 0; i < 8; i++) {
      const geo = new THREE.RingGeometry(2 + i * 2, 2.1 + i * 2, 64);
      const ring = new THREE.Mesh(geo, patternMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.01;
      scene.add(ring);
    }

    // Cerezos
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.9 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0xffb0c8, roughness: 0.7, emissive: 0xff88aa, emissiveIntensity: 0.1, transparent: true, opacity: 0.9 });
    const treePositions = [
      { x: -8, z: -6 }, { x: 10, z: 4 }, { x: -12, z: 8 }, { x: 6, z: -10 }, { x: 14, z: -4 }
    ];
    treePositions.forEach((p) => {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 3, 8), trunkMat);
      trunk.position.set(p.x, 1.5, p.z);
      trunk.castShadow = true;
      scene.add(trunk);

      const canopy = new THREE.Mesh(new THREE.SphereGeometry(1.8, 16, 16), leafMat);
      canopy.position.set(p.x, 3.5, p.z);
      canopy.castShadow = true;
      canopy.userData.swayPhase = Math.random() * Math.PI * 2;
      canopy.userData.baseY = canopy.position.y;
      scene.add(canopy);
    });

    // Piedras
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.8 });
    for (let i = 0; i < 10; i++) {
      const s = 0.3 + Math.random() * 0.5;
      const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(s), stoneMat);
      stone.position.set((Math.random() - 0.5) * 50, s * 0.3, (Math.random() - 0.5) * 50);
      stone.castShadow = true;
      scene.add(stone);
    }

    // Estanque
    const waterMat = new THREE.MeshStandardMaterial({ color: 0x4488aa, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.7, emissive: 0x224466, emissiveIntensity: 0.3 });
    const pond = new THREE.Mesh(new THREE.CircleGeometry(4, 32), waterMat);
    pond.rotation.x = -Math.PI / 2;
    pond.position.set(0, 0.05, 8);
    scene.add(pond);

    // Campanas (interactivas)
    const bellMat = new THREE.MeshStandardMaterial({ color: 0xddaa44, roughness: 0.3, metalness: 0.9, emissive: 0x886622, emissiveIntensity: 0.4 });
    const bellLightMat = new THREE.PointLight(0xffdd88, 0, 8);
    scene.add(bellLightMat);
    const bells: THREE.Mesh[] = [];
    const bellPositions = [
      { x: -4, z: -4 }, { x: 5, z: -2 }, { x: -6, z: 6 }, { x: 8, z: 5 }, { x: 0, z: 14 }
    ];
    bellPositions.forEach((p) => {
      const bell = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 16), bellMat);
      bell.position.set(p.x, 1.5 + Math.random(), p.z);
      bell.userData.ringPhase = 0;
      bell.userData.active = false;
      scene.add(bell);
      bells.push(bell);

      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 1.5, 8), stoneMat);
      base.position.set(p.x, 0.75, p.z);
      scene.add(base);
    });

    // Pétalos flotantes (partículas)
    const petals: THREE.Mesh[] = [];
    const petalMat = new THREE.MeshStandardMaterial({ color: 0xffb0c8, transparent: true, opacity: 0.85, side: THREE.DoubleSide, emissive: 0xff88aa, emissiveIntensity: 0.2 });
    for (let i = 0; i < 60; i++) {
      const petal = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.2), petalMat);
      petal.position.set((Math.random() - 0.5) * 50, 2 + Math.random() * 8, (Math.random() - 0.5) * 50);
      petal.userData.speed = 0.3 + Math.random() * 0.4;
      petal.userData.phaseX = Math.random() * Math.PI * 2;
      petal.userData.phaseZ = Math.random() * Math.PI * 2;
      petal.userData.baseY = petal.position.y;
      scene.add(petal);
      petals.push(petal);
    }

    // Partículas de luz
    const lightParticleMat = new THREE.MeshBasicMaterial({ color: 0xffdd88, transparent: true, opacity: 0.5 });
    for (let i = 0; i < 30; i++) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), lightParticleMat.clone());
      p.position.set((Math.random() - 0.5) * 40, 1 + Math.random() * 5, (Math.random() - 0.5) * 40);
      p.userData.speed = 0.2 + Math.random() * 0.3;
      p.userData.phase = Math.random() * Math.PI * 2;
      scene.add(p);
    }

    const pointer = makePointerLock(camera, renderer.domElement);
    const wasd = wasdKeys();
    camera.position.set(0, 1.6, 0);

    const gs = { status: 'menu' as 'menu' | 'playing', petals: 0, bells: 0 };

    const raycaster = new THREE.Raycaster();

    function startGame() {
      gs.status = 'playing';
      gs.petals = 0;
      gs.bells = 0;
      bells.forEach((b) => { b.userData.active = false; });
      pointer.lock();
      setStats({ petals: 0, bells: 0, gameState: 'playing' });
    }

    (window as unknown as { __zenStart: () => void }).__zenStart = startGame;

    const onClick = () => {
      if (gs.status !== 'playing') return;
      raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
      const hits = raycaster.intersectObjects(bells, false);
      if (hits.length > 0) {
        const bell = hits[0].object as THREE.Mesh;
        if (!bell.userData.active) {
          bell.userData.active = true;
          bell.userData.ringPhase = 1;
          gs.bells++;
          bellLightMat.color.setHex(0xffdd88);
          bellLightMat.intensity = 3;
          bellLightMat.position.copy(bell.position);
          setTimeout(() => { bellLightMat.intensity = 0; }, 1000);
          setStats((s) => ({ ...s, bells: gs.bells }));
        }
      }
    };
    renderer.domElement.addEventListener('mousedown', onClick);

    let animId = 0;

    function animate() {
      animId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = performance.now();

      // Mover pétalos
      petals.forEach((p) => {
        p.position.x += Math.sin(t * 0.001 + p.userData.phaseX) * 0.02;
        p.position.z += Math.cos(t * 0.0008 + p.userData.phaseZ) * 0.02;
        p.position.y -= p.userData.speed * dt;
        p.rotation.z += dt * 0.5;
        if (p.position.y < 0.1) {
          p.position.y = 8 + Math.random() * 3;
          p.position.x = (Math.random() - 0.5) * 50;
          p.position.z = (Math.random() - 0.5) * 50;
        }
      });

      // Partículas de luz flotan
      scene.children.forEach((obj) => {
        if (obj instanceof THREE.Mesh && obj.userData.phase !== undefined && obj.userData.baseY === undefined) {
          obj.position.y += Math.sin(t * 0.001 + obj.userData.phase) * 0.01;
          (obj.material as THREE.MeshBasicMaterial).opacity = 0.3 + Math.sin(t * 0.002 + obj.userData.phase) * 0.2;
        }
      });

      // Balanceo de copas
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.userData.swayPhase !== undefined) {
          obj.rotation.z = Math.sin(t * 0.0008 + obj.userData.swayPhase) * 0.03;
        }
      });

      // Campanas tiemblan al tocarlas
      bells.forEach((b) => {
        if (b.userData.ringPhase > 0) {
          b.userData.ringPhase -= dt * 1.5;
          b.position.x = (bellPositions[bells.indexOf(b)].x) + Math.sin(t * 0.02) * 0.1 * b.userData.ringPhase;
        }
      });

      if (gs.status === 'playing') {
        // Movimiento lento y relajante
        const speed = 2.5;
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
        camera.position.add(move);
        camera.position.y = 1.6;

        // Límites
        const limit = 28;
        camera.position.x = Math.max(-limit, Math.min(limit, camera.position.x));
        camera.position.z = Math.max(-limit, Math.min(limit, camera.position.z));

        gs.petals += dt * 1.5;
        setStats((s) => ({ ...s, petals: Math.floor(gs.petals) }));
      }

      // Atardecer dinámico
      const hue = ((Math.sin(t * 0.0001) + 1) / 2) * 0.08;
      scene.background = new THREE.Color().setHSL(hue, 0.7, 0.65);

      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(animId);
      renderer.domElement.removeEventListener('mousedown', onClick);
      pointer.cleanup();
      wasd.cleanup();
      disposeScene(scene);
      ctx.cleanup();
      delete (window as unknown as Record<string, unknown>).__zenStart;
    };
  }, []);

  const start = () => (window as unknown as { __zenStart?: () => void }).__zenStart?.();

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div ref={mountRef} className="w-full h-full" />

      {stats.gameState === 'playing' && (
        <>
          {/* Crosshair suave */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-3 h-3 rounded-full border border-emerald-300/40" />
          </div>

          {/* HUD minimalista */}
          <div className="absolute top-0 right-0 p-4 pointer-events-none">
            <button onClick={() => setStats((s) => ({ ...s, gameState: 'menu' }))} className="glass rounded-xl px-4 py-2.5 text-gray-300 hover:text-white pointer-events-auto">Salir</button>
          </div>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none">
            <div className="glass rounded-xl px-6 py-3 flex gap-6">
              <div className="text-center">
                <div className="text-[10px] text-gray-400 uppercase tracking-wider">Pétalos</div>
                <div className="text-xl font-bold text-pink-300">{stats.petals}</div>
              </div>
              <div className="w-px bg-gray-700" />
              <div className="text-center">
                <div className="text-[10px] text-gray-400 uppercase tracking-wider">Campanas</div>
                <div className="text-xl font-bold text-amber-300">{stats.bells}/5</div>
              </div>
            </div>
          </div>

          <div className="absolute top-1/2 left-6 -translate-y-1/2 pointer-events-none max-w-[180px]">
            <div className="glass rounded-xl px-4 py-3 text-xs text-gray-400">
              <p className="text-emerald-300 font-semibold mb-1">Respira profundo...</p>
              <p>Caminata lenta. Sin prisa. Toca las campanas para crear armonía.</p>
            </div>
          </div>
        </>
      )}

      {stats.gameState === 'menu' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="text-center max-w-lg px-6 animate-fade-in">
            <h2 className="text-5xl font-black mb-3" style={{ background: 'linear-gradient(135deg,#ff88aa,#10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>ZEN GARDEN</h2>
            <p className="text-gray-300 mb-8">Un espacio de calma. Camina entre cerezos flotantes, toca campanas, observa el atardecer.<br/><span className="text-emerald-300">Sin presión. Sin enemigos. Solo paz.</span></p>
            <button onClick={start} className="btn-primary text-lg px-8 py-3.5 mb-4">ENTRAR AL JARDÍN</button>
            <div><button onClick={onExit} className="btn-ghost text-sm">Salir al menú</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
