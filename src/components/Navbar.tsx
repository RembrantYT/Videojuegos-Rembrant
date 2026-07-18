import { Gamepad2 } from 'lucide-react';
import { useStore } from '../store/useStore';

export default function Navbar() {
  const navigate = useStore((s) => s.navigate);
  const route = useStore((s) => s.route);

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 glass border-b border-[var(--border)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <button onClick={() => navigate({ page: 'home' })} className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Gamepad2 className="w-5 h-5 text-black" strokeWidth={2.5} />
          </div>
          <span className="text-xl font-black tracking-tight">
            NEXUS<span className="text-emerald-400">3D</span>
          </span>
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate({ page: 'home' })}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${route.page === 'home' ? 'text-emerald-400 bg-emerald-400/10' : 'text-gray-400 hover:text-white'}`}
          >
            Inicio
          </button>
          <button
            onClick={() => navigate({ page: 'category', categoryId: 'action' })}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${route.page === 'category' && route.categoryId === 'action' ? 'text-rose-400 bg-rose-400/10' : 'text-gray-400 hover:text-white'}`}
          >
            Acción
          </button>
          <button
            onClick={() => navigate({ page: 'category', categoryId: 'racing' })}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition hidden sm:block ${route.page === 'category' && route.categoryId === 'racing' ? 'text-amber-400 bg-amber-400/10' : 'text-gray-400 hover:text-white'}`}
          >
            Carreras
          </button>
          <button
            onClick={() => navigate({ page: 'category', categoryId: 'relax' })}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${route.page === 'category' && route.categoryId === 'relax' ? 'text-emerald-400 bg-emerald-400/10' : 'text-gray-400 hover:text-white'}`}
          >
            Relajación
          </button>
          <button
            onClick={() => navigate({ page: 'about' })}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-400 hover:text-white transition hidden sm:block"
          >
            Acerca de
          </button>
        </div>
      </div>
    </nav>
  );
}
