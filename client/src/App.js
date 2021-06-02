import React, { useState } from 'react';
import './App.css';
import * as spotify from './spotify.js';
import heart_empty from './vectors/heart-empty.svg'
import heart_full from './vectors/heart-full.svg'

import SpotifyPlayer from './player.js';
import Queue from './queue.js'
import Player, { player_controls, renderQueueEntries } from './player_ui.js'
import MoodControl from './mood_control.js'
import Feedback, { feedback_options } from './feedback.js'

// Parse URL
const parsed_url = window.location.href.split("?");
const params = parsed_url[parsed_url.length - 1];
const hash = params
  .split("&")
  .reduce(function (initial, item) {
    if (item) {
      var parts = item.split("=");
      initial[parts[0]] = decodeURIComponent(parts[1]);
    }
    return initial;
  }, {});

class App extends React.Component {

  componentDidMount() {
    // figure out how to set token here
    let _token = hash.token;
    if (_token) {
      // subscribe to SSE 
      // const _sse_source = new EventSource(`http://localhost:3000/updates?id=${hash.id}`);
      const _sse_source = new EventSource(`https://vybemusic.herokuapp.com/updates?id=${hash.id}`);
      _sse_source.onmessage = event => this.updateNewState(event);

      // Set token & songs
      this.setState({
        token: _token,
        sse_source: _sse_source
      });
    }
  }

  constructor(props) {
    super(props);

    this.state = {
      active_page: 0,
      current_song: {},
      current_search: "",
      queue: [],
      current_song_liked: false,
      player_loaded: false,
      player_paused: false,
      modal_show: false,

      search_results: [],
      genre_mode: false,
      clusters_set: false,
    }
  }

  setPlayerLoaded(device_id) {
    this.setState({
      player_loaded: true,
    });
    spotify.setDeviceId(device_id);
  }

  setActivePage(i) {
    this.setState({
      active_page: i,
    })
  }

  setModalShow(val) {
    this.setState({
      modal_show: val,
    });
  }

  updateNewState(event) {
    const newStatus = spotify.processUpdate(JSON.parse(event.data));
    this.setState({
      mood_params: newStatus.preferences,
      queue: newStatus.queue,
      current_song: newStatus.currentSong,
      clusters_set: true,
    });

    var maxIndex = 0;
    for (let i = 0; i < this.state.mood_params.length; i++) {
      if (this.state.mood_params[i].value > this.state.mood_params[maxIndex].value) {
        if (this.state.mood_params[i].name != "Loudness") // ignore loudness as current mood
          maxIndex = i;
      }
    }

    var newMood = "";
    switch (this.state.mood_params[maxIndex].name) {
      case "Acousticness":
        newMood = "Acoustic";
        break;
      case "Danceability":
        newMood = "Dancey";
        break;
      case "Instrumental":
      case "Instrumentalness":
        newMood = "Instrumental";
        break;
      case "Energy":
        newMood = "Energetic";
        break;
      case "Loudness":
        newMood = "Loud";
        break;
      case "Speechiness":
        newMood = "Speechy";
        break;
      case "Tempo":
        newMood = "Upbeat";
        break;
      case "Valence":
        newMood = "Positive";
        break;
      default:
        newMood = "Balanced";
    }
    this.setState({
      mood: newMood
    });
  }

  submitSkipFeedback(feedback) {
    this.setModalShow(false);
    spotify.skipSong(this.state.current_song.track_id, feedback)
      .then(([newCurrentSong, newQueue]) => {
        console.log("Song successfully skippped");
        this.setState({
          current_song: newCurrentSong,
          queue: newQueue,
          current_song_liked: false,
        });
      });
  }

  addSong(id, name, artists) {
    spotify.addSong(id, name, artists)
      .then(([newCurrentSong, newQueue]) => {
        console.log("Song successfully added");
        this.setState({
          current_song: newCurrentSong,
          queue: newQueue
        });
      });
  }

  songFinished() {
    spotify.finishSong(this.state.current_song.track_id, this.state.current_song_liked)
      .then(([newCurrentSong, newQueue]) => {
        console.log("Song successfully finished");
        this.setState({
          current_song: newCurrentSong,
          queue: newQueue,
          current_song_liked: false,
        });
      });
  }

  setGenreMode(isGenreMode) {
    this.setState({
      genre_mode: isGenreMode,
    });
    console.log("new genre mode");
    console.log(isGenreMode);

    spotify.setQueueMode(isGenreMode ? "genre" : "cluster");
  }

  setSongLiked() {
    this.setState({
      current_song_liked: true
    });
    console.log("Song liked");
  }

  setSongUnliked() {
    this.setState({
      current_song_liked: false
    });
    console.log("Song un-liked");
  }

  playerCallback(action) {
    switch (action) {
      case player_controls.PLAY:
        this.setState({
          player_paused: false
        });
        spotify.resumeSong();
        break;

      case player_controls.PAUSE:
        this.setState({
          player_paused: true
        });
        spotify.pauseSong();
        break;

      case player_controls.REWIND:
        spotify.restartSong();
        break;

      case player_controls.SKIP:
        this.setModalShow(true);
        break;

      default:
        console.log("Unknown player action");
    }
  }

  renderDashboardHeader() {
    if (this.state.current_song.track_name == null) {
      return (
        <div>
          <h2 className="Header-Left">Ready for Tunes</h2>
        </div>
      );
    } else {
      return (
        <div>
          <h3 className="Header-Left-Compact">
            Currently Playing
            {this.state.current_song_liked == false && (
              <img
                className="Like-Button"
                src={heart_empty}
                onClick={() => this.setSongLiked()}
                alt="like"
              />
            )}
            {this.state.current_song_liked == true && (
              <img
                className="Like-Button"
                src={heart_full}
                onClick={() => this.setSongUnliked()}
                alt="unlike"
              />
            )}
          </h3>
          <Player
            current_song={this.state.current_song}
            withControls={true}
            paused={this.state.player_paused}
            callback={this.playerCallback.bind(this)}
          />
        </div>
      );
    }
  }

  returnToDashboard() {
    this.setState({
      current_search: "",
    });
    this.setActivePage(0);
  }

  renderQueueWidget() {
    if (this.state.queue.length > 0) {
      return (
        <div className="App-widget" onClick={() => this.setActivePage(1)}>
          <h2>Queue</h2>
          <center>
            <div className="App-widget-wrapper">
              {renderQueueEntries(this.state.queue, 5)}
            </div>
          </center>
        </div>
      );
    } else {
      return (
        <div className="App-widget" onClick={() => this.setActivePage(1)}>
          <h2>Queue</h2>
          <h3>Tap to Add Songs</h3>
        </div>
      );
    }
  }

  renderMoodWidget() {
    if (!this.state.mood) {
      return (
        <div className="App-widget">
          <h2>Mood</h2>
          <h4>Queue more songs for vybe to learn your mood!</h4>
        </div>
      );
    }
    else {
      return (
        <div className="App-widget" onClick={() => this.setActivePage(2)}>
          <h2>Mood</h2>
          <h4>vybe feels that you're</h4>
          <h3>{this.state.mood.toUpperCase()}</h3>
        </div>
      );
    }
  }

  onSearchChange(query) {
    return spotify.search(query);
  }

  render() {

    if (!this.state.token) {
      return (
        <div className="App">
          <div className="App-Login">
            <div className="Login-Wrapper">
              <h1>vybe</h1>
              <h2>Tunes Tailored to You</h2>
              <br /><br />
              <a href={spotify.authorizationUrl}><button className="App-Login-Button">LOGIN</button></a>
              <br /><br /><br /><br /><br /><br />
            </div>
          </div>
        </div>
      );
    } else {
      // logged in
      if (this.state.active_page === 0) {
        return (
          <div className="App">
            {this.renderDashboardHeader()}
            {this.renderQueueWidget()}
            {this.renderMoodWidget()}

            <>
              <Feedback
                show={this.state.modal_show}
                onHide={this.setModalShow.bind(this)}
                callback={this.submitSkipFeedback.bind(this)}
              />
            </>

            <SpotifyPlayer
              accessToken={this.state.token}
              songFinishedCallback={this.songFinished.bind(this)}
              playerLoadedCallback={this.setPlayerLoaded.bind(this)}
              playerLoaded={this.state.player_loaded}
            />
          </div>
        );
      } else if (this.state.active_page === 1) {
        return (
          <div className="App">
            <Queue
              onClick={this.returnToDashboard.bind(this)}
              current_song={this.state.current_song}
              queue={this.state.queue}
              onSearchChange={this.onSearchChange.bind(this)}
              addSong={this.addSong.bind(this)}
              genre_mode={this.state.genre_mode}
              setGenreMode={this.setGenreMode.bind(this)}
              clusters_set={this.state.clusters_set}
            />
          </div>
        );

      } else if (this.state.active_page === 2) {
        return (
          <div className="App">
            <MoodControl
              onClick={this.returnToDashboard.bind(this)}
              mood={this.state.mood}
              params={this.state.mood_params}
            />
          </div>
        );
      }
      else {
        return (
          <div>Current Active Page Index: {this.state.active_page}</div>
        );
      }
    }
  }
}

export default App;
