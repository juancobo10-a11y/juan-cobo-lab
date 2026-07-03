import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import Home from './pages/Home';
import Constitucion from './pages/Constitucion';
import Preguntas from './pages/Preguntas';
import PreguntaPage from './pages/PreguntaPage';
import ConversacionesPage from './pages/Conversaciones';
import JuanCobo from './pages/JuanCobo';
import Metodologias from './pages/Metodologias';

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/juan-cobo" component={JuanCobo} />
      <Route path="/metodologias" component={Metodologias} />
      <Route path="/constitucion" component={Constitucion} />
      <Route path="/preguntas" component={Preguntas} />
      <Route path="/preguntas/:id" component={PreguntaPage} />
      <Route path="/conversaciones" component={ConversacionesPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <TooltipProvider>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Router />
      </WouterRouter>
    </TooltipProvider>
  );
}

export default App;
