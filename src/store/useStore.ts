import { create } from 'zustand';
import type { CategoryId, GameId } from '../data/games';

interface Route {
  page: 'home' | 'category' | 'game' | 'about';
  categoryId?: CategoryId;
  gameId?: GameId;
}

interface AppState {
  route: Route;
  navigate: (route: Route) => void;
  scores: Record<string, number>;
  setScore: (gameId: string, score: number) => void;
}

function parseHash(): Route {
  const hash = window.location.hash.replace(/^#\/?/, '');
  const parts = hash.split('/');
  if (parts[0] === 'category' && parts[1]) {
    return { page: 'category', categoryId: parts[1] as CategoryId };
  }
  if (parts[0] === 'game' && parts[1]) {
    return { page: 'game', gameId: parts[1] as GameId };
  }
  if (parts[0] === 'about') {
    return { page: 'about' };
  }
  return { page: 'home' };
}

function toHash(route: Route): string {
  switch (route.page) {
    case 'category':
      return `#/category/${route.categoryId}`;
    case 'game':
      return `#/game/${route.gameId}`;
    case 'about':
      return `#/about`;
    default:
      return '#/';
  }
}

export const useStore = create<AppState>((set, get) => ({
  route: typeof window !== 'undefined' ? parseHash() : { page: 'home' },
  navigate: (route) => {
    window.location.hash = toHash(route);
    set({ route });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },
  scores: {},
  setScore: (gameId, score) => {
    const prev = get().scores[gameId] ?? 0;
    if (score > prev) {
      set({ scores: { ...get().scores, [gameId]: score } });
    }
  },
}));

if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    setTimeout(() => useStore.setState({ route: parseHash() }), 0);
  });
}
