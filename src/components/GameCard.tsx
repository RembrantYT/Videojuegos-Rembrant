import { Play, ChevronRight } from 'lucide-react';
import type { Game } from '../data/games';
import { useStore } from '../store/useStore';

export default function GameCard({ game, index = 0 }: { game: Game; index?: number }) {
  const navigate = useStore((s) => s.navigate);
  const score = useStore((s) => s.scores[game.id] ?? 0);

  return (
    <div
      className="card group cursor-pointer animate-slide-up"
      style={{ animationDelay: `${index * 60}ms` }}
      onClick={() => navigate({ page: 'game', gameId: game.id })}
    >
      {/* Preview visual */}
      <div
        className="relative h-44 overflow-hidden flex items-center justify-center"
        style={{
          background: `radial-gradient(circle at 50% 40%, ${game.color}33 0%, #0a0b14 70%)`,
        }}
      >
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div
          className="text-7xl group-hover:scale-125 transition-transform duration-500 animate-float"
          style={{ filter: `drop-shadow(0 0 20px ${game.glow})` }}
        >
          {game.emoji}
        </div>
        <div className="absolute top-3 left-3 flex gap-1.5">
          <span className="chip" style={{ background: `${game.color}1a`, color: game.color, borderColor: `${game.color}40` }}>
            {game.difficulty}
          </span>
        </div>
        {score > 0 && (
          <div className="absolute top-3 right-3 glass rounded-lg px-2.5 py-1 text-xs">
            <span className="text-gray-400">Mejor: </span>
            <span className="text-amber-400 font-bold">{score.toLocaleString()}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
          <div className="flex gap-1">
            {game.tags.map((t) => (
              <span key={t} className="text-[10px] text-gray-400 bg-black/40 px-2 py-0.5 rounded">{t}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="text-lg font-bold mb-1 group-hover:text-emerald-400 transition">{game.title}</h3>
        <p className="text-sm text-gray-400 mb-3 line-clamp-2">{game.tagline}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">{game.players}</span>
          <div className="flex items-center gap-1 text-emerald-400 text-sm font-semibold group-hover:gap-2 transition-all">
            <Play className="w-4 h-4" />
            <span>Jugar</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
