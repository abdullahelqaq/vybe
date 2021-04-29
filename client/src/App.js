import logo from './logo.svg';
import './App.css';

export const authEndpoint = 'https://accounts.spotify.com/authorize';

const clientId = "62598dfbbefd46eeb90783eb0b6d0ad9";
const redirectUri = "http://localhost:3000/authorized/";
//TODO: INSERT SCOPES: "https://developer.spotify.com/documentation/general/guides/scopes/
const scopes = [];

const url = `${authEndpoint}?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scopes.join("%20")}&response_type=code&show_dialog=true`;

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
          href={url}
        >
          Login to Spotify
        </a>
      </header>
    </div>
  );
}

export default App;
