import { useAuth } from "./context/AuthContext";
import { LoginScreen } from "./components/login/LoginScreen";
import { Dashboard } from "./components/layout/Dashboard";

function App() {
  const { token } = useAuth();
  return token ? <Dashboard /> : <LoginScreen />;
}

export default App;
