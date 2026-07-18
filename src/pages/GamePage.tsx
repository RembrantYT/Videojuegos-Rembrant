import { useState, Suspense, lazy, type FC, type LazyExoticComponent } from 'react';
import { ArrowLeft, Play, Gamepad2, Target, Zap, Shield } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useStore } from '../store/useStore';
import { getGame } from '../data/games';

const ZombieSurvival = lazy(() => import('../games/ZombieSurvival'));
const VoidRaider = lazy(() => import('../games/VoidRaider'));
const NeonRacer = lazy(() => import('../games/NeonRacer'));
const CrystalMaze = lazy(() => import('../games/CrystalMaze'));
const ZenGarden = lazy(() => import('../games/ZenGarden'));
const BubblePop = lazy(() => import('../games/BubblePop'));

const gameComponents: Record<string, LazyExoticComponent<FC<{ onExit: () => void }>>> = {
  ZombieSurvival,
  VoidRaider,
  NeonRacer,
  CrystalMaze,
  ZenGarden,
  BubblePop,
};

export default function GamePage() {
  const route = useStore((s) => s.route);
  const navigate = useStore((s) => s.navigate);
  const score = useStore((s) => s.scores[route.gameId ?? ''] ?? 0);
  const [playing, setPlaying] = useState(false);

  const game = getGame(route.gameId ?? 'zombie-survival');
  if (!game) return null;

  const GameComponent = gameComponents[game.component];
  const handleExit = () => {
    setPlaying(false);
    navigate({ page: 'home' });
  };

  if (playing && GameComponent) {
    return (
      <div className="fixed inset-0 z-50">
        <Suspense fallback={<div className="w-full h-full bg-black flex items-center justify-center text-gray-400">Cargando juego...</div>}>
          <GameComponent onExit={handleExit} />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Navbar />

      {/* Hero del juego */}
      <div
        className="relative pt-32 pb-16 px-6 overflow-hidden min-h-[70vh] flex items-center"
        style={{ background: `radial-gradient(ellipse at top, ${game.color}22 0%, transparent 70%)` }}
      >
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute inset-0 scanline opacity-20" />

        <div className="max-w-7xl mx-auto relative z-10 w-full">
          <button onClick={() => navigate({ page: 'home' })} className="flex items-center gap-2 text-gray-400 hover:text-white transition mb-6 text-sm">
            <ArrowLeft className="w-4 h-4" /> Volver al catálogo
          </button>

          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="chip" style={{ background: `${game.color}1a`, color: game.color, borderColor: `${game.color}40` }}>
                  {game.difficulty}
                </span>
                <span className="text-xs text-gray-500">{game.players}</span>
                {score > 0 && (
                  <span className="text-xs text-amber-400 glass rounded-lg px-2 py-0.5">
                    Mejor puntuación: {score.toLocaleString()}
                  </span>
                )}
              </div>

              <h1 className="text-5xl md:text-6xl font-black tracking-tighter mb-3">{game.title}</h1>
              <p className="text-xl text-gray-300 mb-6">{game.tagline}</p>
              <p className="text-gray-400 leading-relaxed mb-8">{game.description}</p>

              <button
                onClick={() => setPlaying(true)}
                className="btn-primary text-lg px-8 py-4 group"
                style={{ background: `linear-gradient(135deg, ${game.color}, ${game.color}cc)` }}
              >
                <Play className="w-6 h-6 group-hover:scale-110 transition-transform" />
                JUGAR AHORA
              </button>
            </div>

            {/* Preview visual */}
            <div
              className="relative aspect-video rounded-2xl overflow-hidden glass flex items-center justify-center"
              style={{ background: `radial-gradient(circle at 50% 50%, ${game.color}33 0%, #0a0b14 70%)` }}
            >
              <div className="absolute inset-0 grid-bg opacity-40" />
              <div
                className="text-9xl animate-float"
                style={{ filter: `drop-shadow(0 0 30px ${game.glow})` }}
              >
                {game.emoji}
              </div>
              <div className="absolute bottom-4 left-4 right-4 flex gap-2 flex-wrap">
                {game.tags.map((t) => (
                  <span key={t} className="text-[10px] text-gray-400 bg-black/50 px-2 py-0.5 rounded backdrop-blur">{t}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Características */}
      <section className="py-16 px-6 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Controles */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Gamepad2 className="w-5 h-5 text-emerald-400" />
              <h2 className="text-xl font-bold">Controles</h2>
            </div>
            <div className="space-y-2.5">
              {game.controls.map((c, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-emerald-400/60" />
                  <span className="text-gray-300">{c}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Características */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-amber-400" />
              <h2 className="text-xl font-bold">Características</h2>
            </div>
            <div className="space-y-2.5">
              {game.features.map((f, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-amber-400/60" />
                  <span className="text-gray-300">{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Info rápida */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="glass rounded-xl p-4 text-center">
            <Target className="w-6 h-6 text-rose-400 mx-auto mb-2" />
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Dificultad</div>
            <div className="font-bold">{game.difficulty}</div>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <Shield className="w-6 h-6 text-blue-400 mx-auto mb-2" />
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Formato</div>
            <div className="font-bold text-sm">3D / WebGL</div>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <Gamepad2 className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Jugadores</div>
            <div className="font-bold text-sm">{game.players}</div>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <Zap className="w-6 h-6 text-amber-400 mx-auto mb-2" />
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Categoría</div>
            <div className="font-bold text-sm capitalize">{game.category}</div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--border)] py-8 px-6 mt-12">
        <div className="max-w-7xl mx-auto text-center text-sm text-gray-500">
          <p>NEXUS3D · {game.title} · Powered by Three.js</p>
        </div>
      </footer>
    </div>
  );
}
