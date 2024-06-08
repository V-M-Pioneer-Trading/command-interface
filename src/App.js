import "./App.css";

function App() {
  return (
    <div className="App">
      <div className="section section-login">
        <div className="section-login__input-field"></div>
        <button className="button-login">Login</button>
      </div>
      <div className="section section-userInfo">
        <h1 className="header-1">User Info</h1>
        <div className="section-field section-userInfo__field"></div>
      </div>
      <div className="section section-fleet">
        <h1 className="header-1">Fleet</h1>
        <div className="section-field section-userInfo__fleet"></div>
      </div>
      <div className="section section-systemInfo">
        <h1 className="header-1">Current System Info</h1>
        <div className="section-field section-userInfo__systemInfo"></div>
      </div>
    </div>
  );
}

export default App;
