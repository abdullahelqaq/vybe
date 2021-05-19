import React, { useEffect } from 'react';
import { ScriptCache } from "./ScriptCache.js";

export default class SpotifyPlayer extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      songFinishedCallback: props.songFinishedCallback,
      playerLoadedCallback: props.playerLoadedCallback,
      playerLoaded: props.playerLoaded,
      token: props.accessToken
    };
  }

  componentDidMount() {
    if (!this.state.playerLoaded) {
      new ScriptCache([
        {
          name: "https://sdk.scdn.co/spotify-player.js",
          callback: this.spotifySDKCallback.bind(this)
        }
      ]);
    }
  }

  spotifySDKCallback() {
    window.onSpotifyWebPlaybackSDKReady = async () => {
      const player = new window.Spotify.Player({
        name: 'vybe Player',
        getOAuthToken: cb => { cb(this.state.token); }
      });
      this.setState({ player: player })

      player.addListener('ready', ({ device_id }) => {
        this.setState({
          player: player
        });
        console.log(`Device ID: ${device_id}`);
        this.state.playerLoadedCallback(device_id);
      });

      await player.connect();

      setInterval(this.checkPosition.bind(this), 1000);
    }
  }

  checkPosition() {
    this.state.player.getCurrentState().then(state => {
      if (state && state.position == 0)
        this.state.songFinishedCallback();
    });
  }

  render() {
    return (null);
  }
}