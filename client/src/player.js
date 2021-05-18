import React from 'react';
import {ScriptCache} from "./ScriptCache.js";

export default class SpotifyPlayer extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      deviceIdCallback: props.deviceIdCallback,
      token: props.accessToken
    };

    new ScriptCache([{
      name: "https://sdk.scdn.co/spotify-player.js",
      callback: () => {
        window.onSpotifyWebPlaybackSDKReady = () => {
          const player = new window.Spotify.Player({
            name: 'vybe Player',
            getOAuthToken: cb => { cb(this.state.token); }
          });
          this.setState({ player: player })
          player.addListener('ready', ({ device_id }) => {
            console.log(`Device ID: ${device_id}`);
            this.setState({
              deviceId: device_id
            });
            this.state.deviceIdCallback(device_id);
          });
          player.connect();
        }
      }
    }])
  }

  render() {
    return (null);
  }
}