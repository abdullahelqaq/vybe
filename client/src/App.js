import logo from './logo.svg';
import './App.css';
import * as spotify from './spotify.js';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          vybe
        </p>
        <a
          className="btn btn--loginApp-link"
          href={spotify.authorizationUrl}
        >
          Login to Spotify
        </a>
        <a
          className="btn btn--loginApp-link"
          onClick={spotify.setSongs}
        >
          Set Songs
        </a>
      </header>
    </div>
  );
}

export default App;
