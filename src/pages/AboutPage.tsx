import { Gamepad2, Zap, Code2, Cpu } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useStore } from '../store/useStore';

export default function AboutPage() {
  const navigate = useStore((s) => s.navigate);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Navbar />

      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-6">
              <Code2 className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-gray-300 font-semibold tracking-wide">ACERCA DE NEXUS3D</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-black tracking-tighter mb-4">
              Juegos <span className="bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent">3D reales</span> en tu navegador
            </h1>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              NEXUS3D es una plataforma de videojuegos 3D que se ejecutan directamente en el navegador, sin descargas.
              Construida con tecnología WebGL de vanguardia.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <div className="glass rounded-2xl p-6">
              <Cpu className="w-8 h-8 text-emerald-400 mb-3" />
              <h3 className="text-xl font-bold mb-2">Motor 3D en tiempo real</h3>
              <p className="text-gray-400 text-sm">Todos los juegos usan Three.js con renderizado WebGL, iluminación dinámica, sombras, niebla volumétrica y efectos de partículas en tiempo real.</p>
            </div>
            <div className="glass rounded-2xl p-6">
              <Zap className="w-8 h-8 text-amber-400 mb-3" />
              <h3 className="text-xl font-bold mb-2">Sin descargas</h3>
              <p className="text-gray-400 text-sm">Todo corre en el navegador. Sin instalaciones, sin plugins, sin espera. Abre y juega al instante desde cualquier dispositivo moderno.</p>
            </div>
            <div className="glass rounded-2xl p-6">
              <Gamepad2 className="w-8 h-8 text-cyan-400 mb-3" />
              <h3 className="text-xl font-bold mb-2">6 juegos únicos</h3>
              <p className="text-gray-400 text-sm">Desde shooters FPS hasta carreras synthwave, puzzles de laberinto y experiencias de relajación. Cada uno con su propia identidad visual.</p>
            </div>
            <div className="glass rounded-2xl p-6">
              <Code2 className="w-8 h-8 text-violet-400 mb-3" />
              <h3 className="text-xl font-bold mb-2">Código abierto</h3>
              <p className="text-gray-400 text-sm">Construido con React, TypeScript y Three.js. Código limpio y modular listo para GitHub y para que cualquiera pueda aprender y extender.</p>
            </div>
          </div>

          <div className="glass rounded-2xl p-8 mb-12">
            <h3 className="text-2xl font-bold mb-4">Tecnologías</h3>
            <div className="flex flex-wrap gap-3">
              {['React 18', 'TypeScript', 'Three.js', 'WebGL', 'Tailwind CSS', 'Vite', 'Zustand'].map((t) => (
                <span key={t} className="chip">{t}</span>
              ))}
            </div>
          </div>

          <div className="text-center">
            <h3 className="text-2xl font-bold mb-4">¿Listo para jugar?</h3>
            <button onClick={() => navigate({ page: 'home' })} className="btn-primary text-lg px-8 py-3.5">
              <Gamepad2 className="w-5 h-5" /> Explorar juegos
            </button>
          </div>
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
