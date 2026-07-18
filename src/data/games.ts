import { Gamepad2, Crosshair, Car, Brain, Swords } from 'lucide-react';

export type GameId =
  | 'zombie-survival'
  | 'neon-racer'
  | 'crystal-maze'
  | 'void-raider'
  | 'zen-garden'
  | 'bubble-pop';

export type CategoryId = 'all' | 'action' | 'relax' | 'puzzle' | 'racing';

export interface Category {
  id: CategoryId;
  name: string;
  tagline: string;
  icon: typeof Gamepad2;
  color: string;
  accent: string;
}

export interface Game {
  id: GameId;
  title: string;
  tagline: string;
  description: string;
  category: CategoryId;
  controls: string[];
  features: string[];
  difficulty: 'Casual' | 'Medio' | 'Intenso' | 'Extremo';
  players: string;
  tags: string[];
  color: string;
  glow: string;
  emoji: string;
  component: string;
}

export const categories: Category[] = [
  {
    id: 'all',
    name: 'Todos',
    tagline: 'Explora el catálogo completo',
    icon: Gamepad2,
    color: '#00e5a8',
    accent: 'from-emerald-400 to-cyan-400',
  },
  {
    id: 'action',
    name: 'Acción & Shooter',
    tagline: '¿Quieres acción? Dispara, esquiva y sobrevive',
    icon: Crosshair,
    color: '#ff3b5c',
    accent: 'from-rose-500 to-red-500',
  },
  {
    id: 'racing',
    name: 'Carreras',
    tagline: 'Velocidad y adrenalina pura',
    icon: Car,
    color: '#4f7cff',
    accent: 'from-blue-500 to-indigo-500',
  },
  {
    id: 'puzzle',
    name: 'Puzzles & Aventura',
    tagline: 'Desafía tu mente en mundos 3D',
    icon: Brain,
    color: '#a855f7',
    accent: 'from-violet-500 to-fuchsia-500',
  },
  {
    id: 'relax',
    name: 'Relajación',
    tagline: '¿Estresado? Juega para desestresarte',
    icon: Swords,
    color: '#10b981',
    accent: 'from-emerald-500 to-teal-500',
  },
];

export const games: Game[] = [
  {
    id: 'zombie-survival',
    title: 'Zombie Outbreak',
    tagline: 'Sobrevive a la horda. Dispara para vivir.',
    description:
      'Una ciudad en ruinas. Hordas de muertos vivientes se acercan en la oscuridad. Tu única esperanza es tu puntería y tu munición. Sobrevive oleada tras oleada en este shooter en primera persona con gráficos 3D inmersivos, iluminación dinámica y enemigos con IA de persecución.',
    category: 'action',
    controls: ['WASD para moverte', 'Mouse para mirar', 'Click izquierdo para disparar', 'R para recargar', 'Shift para correr'],
    features: ['Shooter en primera persona 3D', 'Sistema de oleadas progresivas', 'IA de enemigos con pathfinding', 'Efectos de partículas y muzzle flash', 'HUD con vida, munición y puntuación'],
    difficulty: 'Intenso',
    players: '1 jugador',
    tags: ['FPS', 'Survival', 'Horror'],
    color: '#ff3b5c',
    glow: 'rgba(255, 59, 92, 0.4)',
    emoji: '🧟',
    component: 'ZombieSurvival',
  },
  {
    id: 'void-raider',
    title: 'Void Raider',
    tagline: 'Combate espacial en el vacío infinito.',
    description:
      'Pilota tu nave de combate a través de campos de asteroides y flotas enemigas. Dispara láseres, esquiva debris espacial y destruye naves enemigas en este shooter 3D de espacio profundo con efectos de partículas, estrellas y nebulosas.',
    category: 'action',
    controls: ['Mouse para mover la nave', 'Click para disparar láser', 'Espacio para boost de velocidad', 'Esc para pausar'],
    features: ['Combate espacial 3D completo', 'Campo de estrellas con profundidad', 'Oleadas de naves enemigas', 'Sistema de power-ups', 'Efectos de explosiones'],
    difficulty: 'Medio',
    players: '1 jugador',
    tags: ['Space', 'Shooter', 'Arcade'],
    color: '#4f7cff',
    glow: 'rgba(79, 124, 255, 0.4)',
    emoji: '🚀',
    component: 'VoidRaider',
  },
  {
    id: 'neon-racer',
    title: 'Neon Racer',
    tagline: 'Velocidad infinita en autopistas neón.',
    description:
      'Conduce a velocidad extrema por una autopista synthwave sin fin. Esquiva el tráfico, recolecta boosts y alcanza la máxima velocidad en este endless runner 3D con estética retro-neón, suelo reflectante y un horizonte de puesta de sol synthwave.',
    category: 'racing',
    controls: ['A/D o flechas para cambiar de carril', 'Espacio para saltar', 'Shift para nitro', 'Esc para pausar'],
    features: ['Endless runner 3D', 'Estética synthwave/neón', 'Sistema de obstáculos dinámicos', 'Boost de nitro', 'Suelo reflectante con grid'],
    difficulty: 'Medio',
    players: '1 jugador',
    tags: ['Racing', 'Endless', 'Synthwave'],
    color: '#ffb020',
    glow: 'rgba(255, 176, 32, 0.4)',
    emoji: '🏎️',
    component: 'NeonRacer',
  },
  {
    id: 'crystal-maze',
    title: 'Crystal Maze 3D',
    tagline: 'Explora el laberinto. Encuentra la salida.',
    description:
      'Sumérgete en un laberinto 3D de cristal y niebla. Explora pasillos iluminados por antorchas, encuentra la llave dorada que abre la salida y escapa antes de perderte para siempre. Un puzzle de exploración en primera persona con atmósfera envolvente.',
    category: 'puzzle',
    controls: ['WASD para moverte', 'Mouse para mirar', 'Click para interactuar', 'M para ver el mapa', 'Esc para pausar'],
    features: ['Laberinto 3D procedural', 'Exploración en primera persona', 'Niebla volumétrica', 'Sistema de llaves y puertas', 'Minimapa generado dinámicamente'],
    difficulty: 'Medio',
    players: '1 jugador',
    tags: ['Maze', 'Exploration', 'Puzzle'],
    color: '#a855f7',
    glow: 'rgba(168, 85, 247, 0.4)',
    emoji: '🔮',
    component: 'CrystalMaze',
  },
  {
    id: 'zen-garden',
    title: 'Zen Garden',
    tagline: 'Relájate. Respira. Encuentra la calma.',
    description:
      'Un jardín zen interactivo en 3D. Camina por un paisaje sereno con cerezos flotantes, partículas de luz y sonido ambiental. Toca las campanas para crear armonía, recolecta pétalos de flor y observa el atardecer. El juego perfecto para desestresarte.',
    category: 'relax',
    controls: ['WASD para caminar', 'Mouse para mirar', 'Click para tocar campanas', 'Espacio para meditar'],
    features: ['Mundo 3D relajante', 'Partículas de luz flotantes', 'Cerezos animados', 'Sin presión ni enemigos', 'Atardecer dinámico'],
    difficulty: 'Casual',
    players: '1 jugador',
    tags: ['Zen', 'Relax', 'Meditation'],
    color: '#10b981',
    glow: 'rgba(16, 185, 129, 0.4)',
    emoji: '🌸',
    component: 'ZenGarden',
  },
  {
    id: 'bubble-pop',
    title: 'Bubble Pop 3D',
    tagline: 'Revienta burbujas. Simple y satisfactorio.',
    description:
      'Burbujas 3D flotan alrededor tuyo en un campo de relajación. Apunta y reviéntalas con efectos satisfactorios de partículas y sonido. Sin presión, sin enemigos, sin game over. Solo satisfacción pura para desestresarte después de un largo día.',
    category: 'relax',
    controls: ['Mouse para apuntar', 'Click para reventar burbujas', 'Espacio para generar más', 'Esc para salir'],
    features: ['Física de burbujas 3D', 'Efectos de partículas al reventar', 'Sin压力 ni game over', 'Audio relajante', 'Colores pastel suaves'],
    difficulty: 'Casual',
    players: '1 jugador',
    tags: ['Casual', 'Relax', 'Satisfying'],
    color: '#f472b6',
    glow: 'rgba(244, 114, 182, 0.4)',
    emoji: '🫧',
    component: 'BubblePop',
  },
];

export function getGame(id: GameId): Game | undefined {
  return games.find((g) => g.id === id);
}

export function getCategory(id: CategoryId): Category | undefined {
  return categories.find((c) => c.id === id);
}

export function gamesByCategory(cat: CategoryId): Game[] {
  if (cat === 'all') return games;
  return games.filter((g) => g.category === cat);
}
