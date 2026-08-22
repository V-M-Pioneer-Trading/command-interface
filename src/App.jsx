import { Dashboard } from "./components/layout/Dashboard";

// No login wall (auth-design.md decision 13): the dashboard always renders.
// Anonymous visitors get the public observability surface; gated controls
// render disabled and visible rather than hidden, so what exists and what's
// gated is never ambiguous. Operator sign-in and the game token are both
// small affordances in AgentBar's chrome, not a precondition for the page.
function App() {
  return <Dashboard />;
}

export default App;
