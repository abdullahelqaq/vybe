import SpotifyWebApi from 'spotify-web-api-js';

let sessionId = null;
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);

export const authEndpoint = 'https://accounts.spotify.com/authorize';

const clientId = "62598dfbbefd46eeb90783eb0b6d0ad9";
const clientSecret = "660c17961ea5435a9efaada516d3f528";
const redirectUri = "http://localhost:3000/authorized";
const scopes = ['user-top-read', 'playlist-read-private'];

let accessToken, refreshToken;

let spotify = new SpotifyWebApi({
  redirectUri: redirectUri,
  clientId: clientId
});

export const authorizationUrl = `${authEndpoint}?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scopes.join("%20")}&response_type=code&show_dialog=true`;

function checkUrlParams() {
  if (urlParams.has('id')) {
    sessionId = urlParams.get('id');
  }
  if (urlParams.has('code')) {
    authenticate(urlParams.get('code'));
  }
}

// Use authorization code to authenticate user
async function authenticate(code) {
  console.log("User authorized, retrieving token");
  const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64')
    },
    mode: 'cors',
    body: new URLSearchParams({
        'code': code,
        'redirect_uri': redirectUri,
        'grant_type': 'authorization_code'
      }
    )
  });
  const tokens = await tokenResponse.json();
  accessToken = tokens.access_token;
  refreshToken = tokens.refresh_token;

  console.log("Token retrieved");
  const uploadResponse = await fetch(`http://localhost:3000/token?id=${sessionId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    mode: 'cors',
    body: JSON.stringify({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token
      }
    )
  });
}

// set seed songs
// TODO: Implement search feature instead of hardcoding three song IDs
export function setSongs() {
  const response = fetch(`http://localhost:3000/setSongs?id=${sessionId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    mode: 'cors',
    body: JSON.stringify({
        songs: [
          {
            id: "7gHs73wELdeycvS48JfIos"
          },
          {
            id: "2DGa7iaidT5s0qnINlwMjJ"
          },
          {
            id: "70YPzqSEwJvAIQ6nMs1cjY"
          }
        ]
      }
    )
  });
  return response;
}

checkUrlParams();