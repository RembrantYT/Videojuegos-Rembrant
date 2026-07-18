import { ArrowLeft } from 'lucide-react';
import Navbar from '../components/Navbar';
import GameCard from '../components/GameCard';
import { useStore } from '../store/useStore';
import { getCategory, gamesByCategory, categories } from '../data/games';

export default function CategoryPage() {
  const route = useStore((s) => s.route);
  const navigate = useStore((s) => s.navigate);
  const categoryId = route.categoryId ?? 'all';
  const category = getCategory(categoryId);
  const catGames = gamesByCategory(categoryId);
  const Icon = category?.icon ?? categories[0].icon;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Navbar />

      {/* Header */}
      <div
        className="relative pt-32 pb-16 px-6 overflow-hidden"
        style={{ background: `radial-gradient(ellipse at top, ${category?.color}22 0%, transparent 70%)` }}
      >
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="max-w-7xl mx-auto relative z-10">
          <button onClick={() => navigate({ page: 'home' })} className="flex items-center gap-2 text-gray-400 hover:text-white transition mb-6 text-sm">
            <ArrowLeft className="w-4 h-4" /> Volver al inicio
          </button>

          <div className="flex items-center gap-4 mb-3">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: `${category?.color}1a`, border: `1px solid ${category?.color}40` }}
            >
              <Icon className="w-8 h-8" style={{ color: category?.color }} />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight">{category?.name}</h1>
              <p className="text-gray-400 text-lg">{category?.tagline}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-4">
            <span className="chip">{catGames.length} juegos disponibles</span>
          </div>
        </div>
      </div>

      {/* Juegos */}
      <section className="py-12 px-6 max-w-7xl mx-auto">
        {catGames.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {catGames.map((g, i) => (
              <GameCard key={g.id} game={g} index={i} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-gray-500">
            <p className="text-lg">No hay juegos en esta categoría todavía.</p>
          </div>
        )}
      </section>

      {/* Otras categorías */}
      <section className="py-12 px-6 max-w-7xl mx-auto">
        <h3 className="text-xl font-bold mb-5 text-gray-300">Explora otras categorías</h3>
        <div className="flex flex-wrap gap-3">
          {categories.filter((c) => c.id !== categoryId).map((c) => {
            const CatIcon = c.icon;
            return (
              <button
                key={c.id}
                onClick={() => navigate({ page: 'category', categoryId: c.id })}
                className="flex items-center gap-2 glass rounded-xl px-4 py-2.5 hover:border-emerald-400/50 transition group"
              >
                <CatIcon className="w-4 h-4" style={{ color: c.color }} />
                <span className="text-sm font-semibold">{c.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      <footer className="border-t border-[var(--border)] py-8 px-6 mt-12">
        <div className="max-w-7xl mx-auto text-center text-sm text-gray-500">
          <p>NEXUS3D · Plataforma de videojuegos 3D en el navegador</p>
        </div>
      </footer>
    </div>
  );
}
