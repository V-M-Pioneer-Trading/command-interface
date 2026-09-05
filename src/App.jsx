import { Dashboard } from "./components/layout/Dashboard";

// No login wall (auth-design.md decision 13): the dashboard is public, and the
// operator sign-in lives in the app chrome. There is no SpaceTraders token to
// paste any more — st-gateway holds the only copy (decision 5).
function App() {
  return <Dashboard />;
}

export default App;
