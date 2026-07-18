import { useStore } from './store/useStore';
import HomePage from './pages/HomePage';
import CategoryPage from './pages/CategoryPage';
import GamePage from './pages/GamePage';
import AboutPage from './pages/AboutPage';

function App() {
  const route = useStore((s) => s.route);

  switch (route.page) {
    case 'category':
      return <CategoryPage />;
    case 'game':
      return <GamePage />;
    case 'about':
      return <AboutPage />;
    default:
      return <HomePage />;
  }
}

export default App;
