import logo from './logo.svg';
import './App.css';

export const authEndpoint = 'https://accounts.spotify.com/authorize';

const clientId = "62598dfbbefd46eeb90783eb0b6d0ad9";
const redirectUri = "http://localhost:3000/authorized/";
//TODO: INSERT SCOPES: "https://developer.spotify.com/documentation/general/guides/scopes/
const scopes = [];

const url = `${authEndpoint}?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scopes.join("%20")}&response_type=code&show_dialog=true`;

let sessionId = null;
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);

function setSongs() {
  const response = fetch(`http://localhost:3000/setSongs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    mode: 'cors',
    body: JSON.stringify(
      {
        id: urlParams.get("id"),
        songs: {
          "test_id1": {
            genre: "pop"
          },
          "test_id2": {
            genre: "pop"
          },
          "test_id3": {
            genre: "rock"
          }
        }
      }
    )
  });
  return response.json();
}

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
        <a
          className="btn btn--loginApp-link"
          onClick={setSongs}
        >
          Set Songs
        </a>
      </header>
    </div>
  );
}

export default App;
