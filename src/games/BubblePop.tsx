import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { createBaseScene, disposeScene } from '../three/base';

interface Bubble {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  scale: number;
  phase: number;
  popped: boolean;
}

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  color: THREE.Color;
}

interface GameStats {
  popped: number;
  combo: number;
  gameState: 'menu' | 'playing';
}

const BUBBLE_COLORS = [0x60a5fa, 0xf472b6, 0x34d399, 0xfbbf24, 0xa78bfa, 0xfb7185];

export default function BubblePop({ onExit }: { onExit: () => void }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState<GameStats>({ popped: 0, combo: 0, gameState: 'menu' });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const ctx = createBaseScene(container);
    const { scene, camera, renderer, clock } = ctx;

    scene.background = new THREE.Color(0x0a0a18);
    scene.fog = new THREE.Fog(0x0a0a18, 15, 40);

    scene.add(new THREE.AmbientLight(0x6688ff, 0.6));
    const light1 = new THREE.PointLight(0xff66aa, 1.5, 30);
    light1.position.set(-8, 5, 5);
    scene.add(light1);
    const light2 = new THREE.PointLight(0x66aaff, 1.5, 30);
    light2.position.set(8, -3, 5);
    scene.add(light2);
    const light3 = new THREE.PointLight(0x66ffaa, 1, 30);
    light3.position.set(0, 8, -5);
    scene.add(light3);

    // Fondo degradado (plano grande detrás)
    const bgGeo = new THREE.PlaneGeometry(60, 40);
    const bgMat = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        colorA: { value: new THREE.Color(0x1a0a2e) },
        colorB: { value: new THREE.Color(0x0a1a2e) },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 colorA;
        uniform vec3 colorB;
        varying vec2 vUv;
        void main() {
          float t = sin(vUv.y * 3.14 + time * 0.2) * 0.5 + 0.5;
          vec3 color = mix(colorA, colorB, t);
          float wave = sin(vUv.x * 10.0 + time) * sin(vUv.y * 8.0 - time * 0.5) * 0.05;
          color += vec3(wave);
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });
    const bg = new THREE.Mesh(bgGeo, bgMat);
    bg.position.z = -15;
    scene.add(bg);

    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);

    const bubbles: Bubble[] = [];
    const particles: Particle[] = [];
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const gs = { status: 'menu' as 'menu' | 'playing', popped: 0, combo: 0, comboTimer: 0 };

    function createBubble(): Bubble {
      const color = BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)];
      const size = 0.3 + Math.random() * 0.8;
      const geo = new THREE.SphereGeometry(size, 32, 32);
      const mat = new THREE.MeshPhysicalMaterial({
        color,
        roughness: 0.1,
        metalness: 0,
        transmission: 0.6,
        transparent: true,
        opacity: 0.6,
        clearcoat: 1,
        clearcoatRoughness: 0,
        emissive: color,
        emissiveIntensity: 0.15,
        iridescence: 1,
        iridescenceIOR: 1.3,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 4
      );
      scene.add(mesh);
      return {
        mesh,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.3,
          0.2 + Math.random() * 0.4,
          (Math.random() - 0.5) * 0.1
        ),
        scale: size,
        phase: Math.random() * Math.PI * 2,
        popped: false,
      };
    }

    function spawnPopParticles(pos: THREE.Vector3, color: THREE.Color, count: number) {
      for (let i = 0; i < count; i++) {
        const geo = new THREE.SphereGeometry(0.06 + Math.random() * 0.08, 8, 8);
        const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(pos);
        const angle = (i / count) * Math.PI * 2;
        const speed = 2 + Math.random() * 3;
        const vel = new THREE.Vector3(
          Math.cos(angle) * speed,
          Math.sin(angle) * speed + 1,
          (Math.random() - 0.5) * speed
        );
        scene.add(mesh);
        particles.push({ mesh, velocity: vel, life: 0.8, maxLife: 0.8, color: color.clone() });
      }
    }

    function startGame() {
      gs.status = 'playing';
      gs.popped = 0;
      gs.combo = 0;
      bubbles.forEach((b) => scene.remove(b.mesh));
      bubbles.length = 0;
      for (let i = 0; i < 15; i++) bubbles.push(createBubble());
      setStats({ popped: 0, combo: 0, gameState: 'playing' });
    }

    (window as unknown as { __bubbleStart: () => void }).__bubbleStart = startGame;

    const onMouseMove = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };

    const onClick = () => {
      if (gs.status !== 'playing') return;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(bubbles.map((b) => b.mesh), false);
      if (hits.length > 0) {
        const hitMesh = hits[0].object;
        const bubble = bubbles.find((b) => b.mesh === hitMesh);
        if (bubble && !bubble.popped) {
          bubble.popped = true;
          const color = new THREE.Color();
          (bubble.mesh.material as THREE.MeshPhysicalMaterial).color.copy(color);
          spawnPopParticles(bubble.mesh.position.clone(), color, 12);
          scene.remove(bubble.mesh);
          gs.popped++;
          gs.combo++;
          gs.comboTimer = 1.5;
          setStats((s) => ({ ...s, popped: gs.popped, combo: gs.combo }));
        }
      } else {
        gs.combo = 0;
        setStats((s) => ({ ...s, combo: 0 }));
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mousedown', onClick);

    let animId = 0;

    function animate() {
      animId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = performance.now();

      bgMat.uniforms.time.value = t * 0.001;

      // Luces orbitan
      light1.position.x = Math.cos(t * 0.0005) * 10;
      light2.position.x = Math.sin(t * 0.0007) * 10;
      light3.position.y = 5 + Math.sin(t * 0.0003) * 3;

      if (gs.status === 'playing') {
        // Combo timer
        if (gs.comboTimer > 0) {
          gs.comboTimer -= dt;
          if (gs.comboTimer <= 0) {
            gs.combo = 0;
            setStats((s) => ({ ...s, combo: 0 }));
          }
        }

        // Bubbles flotan
        bubbles.forEach((b) => {
          if (b.popped) return;
          b.mesh.position.x += b.velocity.x * dt + Math.sin(t * 0.001 + b.phase) * 0.01;
          b.mesh.position.y += b.velocity.y * dt;
          b.mesh.position.z += b.velocity.z * dt;
          b.mesh.rotation.y += dt * 0.3;
          b.mesh.scale.setScalar(b.scale * (1 + Math.sin(t * 0.002 + b.phase) * 0.05));

          if (b.mesh.position.y > 6) {
            // Reposicionar abajo
            b.mesh.position.set(
              (Math.random() - 0.5) * 14,
              -5,
              (Math.random() - 0.5) * 4
            );
          }
        });

        // Mantener entre 12-18 burbujas
        const aliveBubbles = bubbles.filter((b) => !b.popped);
        if (aliveBubbles.length < 12) {
          bubbles.push(createBubble());
        }

        // Limpiar popped viejos
        for (let i = bubbles.length - 1; i >= 0; i--) {
          if (bubbles[i].popped) bubbles.splice(i, 1);
        }
      }

      // Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt;
        if (p.life <= 0) {
          scene.remove(p.mesh);
          p.mesh.geometry.dispose();
          (p.mesh.material as THREE.Material).dispose();
          particles.splice(i, 1);
          continue;
        }
        p.velocity.y -= 5 * dt;
        p.mesh.position.add(p.velocity.clone().multiplyScalar(dt));
        (p.mesh.material as THREE.MeshBasicMaterial).opacity = p.life / p.maxLife;
        p.mesh.scale.setScalar(p.life / p.maxLife);
      }

      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('mousedown', onClick);
      disposeScene(scene);
      ctx.cleanup();
      delete (window as unknown as Record<string, unknown>).__bubbleStart;
    };
  }, []);

  const start = () => (window as unknown as { __bubbleStart?: () => void }).__bubbleStart?.();

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div ref={mountRef} className="w-full h-full cursor-crosshair" />

      {stats.gameState === 'playing' && (
        <>
          {/* Crosshair */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-6 h-6 rounded-full border-2 border-white/30" />
            <div className="absolute w-1 h-1 bg-white/60 rounded-full" />
          </div>

          <div className="absolute top-0 left-0 right-0 p-4 pointer-events-none">
            <div className="flex items-center justify-between max-w-4xl mx-auto">
              <div className="glass rounded-xl px-5 py-2.5">
                <div className="text-[10px] text-gray-400 uppercase tracking-wider">Reventadas</div>
                <div className="text-3xl font-bold text-pink-400 hud-text">{stats.popped}</div>
              </div>
              {stats.combo > 1 && (
                <div className="glass rounded-xl px-5 py-2.5 animate-pulse">
                  <div className="text-[10px] text-amber-400 uppercase tracking-wider">Combo</div>
                  <div className="text-3xl font-bold text-amber-400 hud-text">x{stats.combo}</div>
                </div>
              )}
              <button onClick={() => setStats((s) => ({ ...s, gameState: 'menu' }))} className="glass rounded-xl px-4 py-2.5 text-gray-300 hover:text-white pointer-events-auto">Salir</button>
            </div>
          </div>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none">
            <div className="glass rounded-xl px-5 py-2 text-xs text-gray-400">
              Apunta y haz click para reventar burbujas
            </div>
          </div>
        </>
      )}

      {stats.gameState === 'menu' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-md">
          <div className="text-center max-w-lg px-6 animate-fade-in">
            <h2 className="text-5xl font-black mb-3" style={{ background: 'linear-gradient(135deg,#f472b6,#60a5fa,#34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>BUBBLE POP 3D</h2>
            <p className="text-gray-300 mb-8">Revienta burbujas iridiscentes. Sin presión, sin game over, sin límite de tiempo.<br/><span className="text-pink-300">Satisfacción pura para desestresarte.</span></p>
            <button onClick={start} className="btn-primary text-lg px-8 py-3.5 mb-4">EMPEZAR A REVENTAR</button>
            <div><button onClick={onExit} className="btn-ghost text-sm">Salir al menú</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
