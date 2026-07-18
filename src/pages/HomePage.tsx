import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { ArrowRight, Crosshair, Car, Brain, Sparkles, Zap, Trophy, Users } from 'lucide-react';
import { useStore } from '../store/useStore';
import { games, categories, gamesByCategory } from '../data/games';
import GameCard from '../components/GameCard';
import Navbar from '../components/Navbar';

function HeroBackground() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.z = 8;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // Partículas flotantes
    const particleCount = 300;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    const palette = [
      new THREE.Color(0x00e5a8),
      new THREE.Color(0x4f7cff),
      new THREE.Color(0xff3b5c),
      new THREE.Color(0xa855f7),
    ];

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 15;
      const c = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
      sizes[i] = Math.random() * 0.15 + 0.05;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const points = new THREE.Points(geo, mat);
    scene.add(points);

    // Geometría wireframe rotando
    const wireGeo = new THREE.IcosahedronGeometry(3, 1);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x00e5a8,
      wireframe: true,
      transparent: true,
      opacity: 0.15,
    });
    const wire = new THREE.Mesh(wireGeo, wireMat);
    scene.add(wire);

    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      points.rotation.y += 0.0008;
      points.rotation.x += 0.0003;
      wire.rotation.y += 0.003;
      wire.rotation.x += 0.002;
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement);
      geo.dispose();
      mat.dispose();
      wireGeo.dispose();
      wireMat.dispose();
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0" />;
}

export default function HomePage() {
  const navigate = useStore((s) => s.navigate);
  const featured = games[0];
  const relaxedGames = gamesByCategory('relax');
  const actionGames = gamesByCategory('action');

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Navbar />

      {/* Hero */}
      <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden">
        <HeroBackground />
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--bg)]" />

        <div className="relative z-10 text-center px-6 max-w-4xl animate-fade-in">
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-6">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-gray-300 font-semibold tracking-wide">6 JUEGOS 3D PROFESIONALES EN TU NAVEGADOR</span>
          </div>

          <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-6 leading-[0.95]">
            <span className="block text-white">JUEGA EN</span>
            <span className="block bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent text-glow">
              3 DIMENSIONES
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Acción, carreras, puzzles y relajación. Todo en 3D real, renders inmersivos con iluminación dinámica,
            partículas y física. Sin descargas. Sin límites.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 mb-12">
            <button
              onClick={() => navigate({ page: 'game', gameId: featured.id })}
              className="btn-primary text-lg px-8 py-3.5 group"
            >
              <Zap className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              JUGAR AHORA
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => navigate({ page: 'category', categoryId: 'relax' })}
              className="btn-ghost text-lg px-8 py-3.5"
            >
              ¿Estresado? Desestresate
            </button>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-8 text-center">
            <div>
              <div className="flex items-center gap-1.5 justify-center text-amber-400 mb-1">
                <Trophy className="w-5 h-5" />
                <span className="text-2xl font-bold">{games.length}</span>
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">Juegos</div>
            </div>
            <div className="w-px h-12 bg-gray-800" />
            <div>
              <div className="flex items-center gap-1.5 justify-center text-cyan-400 mb-1">
                <Sparkles className="w-5 h-5" />
                <span className="text-2xl font-bold">3D</span>
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">Tiempo Real</div>
            </div>
            <div className="w-px h-12 bg-gray-800" />
            <div>
              <div className="flex items-center gap-1.5 justify-center text-emerald-400 mb-1">
                <Users className="w-5 h-5" />
                <span className="text-2xl font-bold">{categories.length - 1}</span>
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">Categorías</div>
            </div>
          </div>
        </div>
      </section>

      {/* Categorías */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="section-title mb-3">¿Qué te apetece hoy?</h2>
          <p className="text-gray-400 text-lg">Elige tu estado de ánimo y nosotros te recomendamos el juego perfecto</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {categories.filter((c) => c.id !== 'all').map((cat, i) => {
            const Icon = cat.icon;
            const catGames = gamesByCategory(cat.id);
            return (
              <div
                key={cat.id}
                className="card group cursor-pointer animate-slide-up p-6"
                style={{ animationDelay: `${i * 80}ms` }}
                onClick={() => navigate({ page: 'category', categoryId: cat.id })}
              >
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
                  style={{ background: `${cat.color}1a`, border: `1px solid ${cat.color}40` }}
                >
                  <Icon className="w-7 h-7" style={{ color: cat.color }} />
                </div>
                <h3 className="text-xl font-bold mb-1 group-hover:text-white transition">{cat.name}</h3>
                <p className="text-sm text-gray-400 mb-3">{cat.tagline}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{catGames.length} juegos</span>
                  <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Destacado: ¿Estresado? */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="glass rounded-3xl p-8 md:p-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-20 blur-3xl" style={{ background: 'radial-gradient(circle, #10b981, transparent)' }} />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 mb-4">
                <Crosshair className="w-5 h-5 text-emerald-400" />
                <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider">Zona de relajación</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-black mb-4">¿Estresado?<br/><span className="text-emerald-400">Juega para desestresarte</span></h2>
              <p className="text-gray-300 text-lg mb-8 max-w-2xl">A veces no necesitas más adrenalina. A veces necesitas lo contrario: un jardín zen, burbujas iridiscentes, un espacio sin presión donde solo existir y respirar.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {relaxedGames.map((g, i) => (
                  <GameCard key={g.id} game={g} index={i} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Acción */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="inline-flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-rose-500" />
              <span className="text-xs text-rose-500 font-bold uppercase tracking-wider">Adrenalina máxima</span>
            </div>
            <h2 className="section-title">¿Quieres acción? Los mejores shooter</h2>
          </div>
          <button onClick={() => navigate({ page: 'category', categoryId: 'action' })} className="btn-ghost text-sm hidden sm:flex">
            Ver todos <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {actionGames.map((g, i) => (
            <GameCard key={g.id} game={g} index={i} />
          ))}
        </div>
      </section>

      {/* Todos los juegos */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 mb-8">
          <Car className="w-6 h-6 text-amber-400" />
          <h2 className="section-title">Catálogo completo</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {games.map((g, i) => (
            <GameCard key={g.id} game={g} index={i} />
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <Brain className="w-12 h-12 text-violet-400 mx-auto mb-4" />
          <h2 className="text-3xl md:text-4xl font-black mb-4">¿Listo para sumergirte?</h2>
          <p className="text-gray-400 mb-8 max-w-xl mx-auto">Seis mundos 3D te esperan. Acción, velocidad, puzzles, relajación. Todo rendered en tiempo real en tu navegador.</p>
          <button onClick={() => navigate({ page: 'game', gameId: 'zombie-survival' })} className="btn-primary text-lg px-8 py-3.5">
            <Zap className="w-5 h-5" /> Empezar a jugar
          </button>
        </div>
      </section>

      <footer className="border-t border-[var(--border)] py-8 px-6">
        <div className="max-w-7xl mx-auto text-center text-sm text-gray-500">
          <p>NEXUS3D · Plataforma de videojuegos 3D en el navegador · Hecho con Three.js + React</p>
        </div>
      </footer>
    </div>
  );
}
