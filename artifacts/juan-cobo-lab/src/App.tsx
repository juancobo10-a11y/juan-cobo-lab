import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import Home from './pages/Home';
import Constitucion from './pages/Constitucion';
import Preguntas from './pages/Preguntas';

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/constitucion" component={Constitucion} />
      <Route path="/preguntas" component={Preguntas} />
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
