import React from 'react';
import './App.css';
import * as spotify from './spotify.js';
import Slider from '@material-ui/core/Slider';
import play_button from './vectors/play-button.svg'
import next_button from './vectors/next-button.svg'
import rewind_button from './vectors/rewind-button.svg'
import pause_button from './vectors/pause-button.svg'

// Parse URL
const parsed_url = window.location.href.split("?");
const params = parsed_url[parsed_url.length - 1];
const hash = params
  .split("&")
  .reduce(function(initial, item) {
    if (item) {
      var parts = item.split("=");
      initial[parts[0]] = decodeURIComponent(parts[1]);
    }
    return initial;
  }, {});

function renderQueueEntries(songs, count=-1) {
  var rows = []
  var limit = songs.length;

  if (count !== -1 && count < songs.length) {
    limit = count;
  }

  for (let i = 0; i < limit; i++) {
    rows.push(
      <p key={i}><b>{songs[i].track_name}</b> / {songs[i].artist_name}</p>
    );
  }
  return rows;
}

class Queue extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      input_active: false,
    };
  }

  stopExitClick(e) {
    e.stopPropagation();
    this.setState({
      input_active: true
    });
  }

  checkExitClick() {
    if (!this.state.input_active) {
      this.props.onClick();
    } else {
      this.setState({
        input_active: false,
      });
    }
  }

  stopExitClick(e) {
    e.stopPropagation();
    this.setState({
      input_active: true
    });
  }

  checkExitClick() {
    console.log("here");
    if (!this.state.input_active) {
      console.log("leaving");
      this.props.onClick();
    } else {
      this.setState({
        input_active: false,
      });
    }
  }

  render() {
    if (this.props.queue.length === 0) {
      return (
        <div className="Queue" onClick={this.checkExitClick.bind(this)}>
          <div className="Queue-Empty">
            <h2>Add Songs to Queue</h2>
            <input
              onClick={this.stopExitClick.bind(this)}
              className="Search"
              type="text"
              placeholder="Search.."
            />
          </div>
        </div>
      );
    } else {
      return (
        <div className="Queue" onClick={this.checkExitClick.bind(this)}>
          <div className="Queue-Header">
            <input
              onClick={this.stopExitClick.bind(this)}
              className="Search"
              type="text"
              placeholder="Search.."
            />
            <Player current_song={this.props.current_song} />
          </div>
          <div className="Queue-Body">
            <h2 className="Header-Left">Queue</h2>
            {renderQueueEntries(this.props.queue)}
          </div>
        </div>
      );
    }
  }
}

class MoodControl extends React.Component {

  renderParamSliders(params) {
    var sliders = []
    for (let i = 0; i < params.length; i++) {
      sliders.push(
        <div key={i}>
          <h4>{params[i].name}</h4>
          <p />
          <Slider
            disabled
            orientation="vertical"
            style={{height: "50px", color: "white", display: "table", margin: "0 auto"}}
            max={1}
            value={params[i].value}
          />
        </div>
      );
    }
    return sliders;
  }

  render () {
    return (
      <div className="Queue" onClick={() => this.props.onClick()}>
        <h2 className="Header-Left">{this.props.mood}</h2>
        <div className="Param-Grid">
          {this.renderParamSliders(this.props.params)}
        </div>
      </div>
    );
    
  }
}

const player_controls = {
  PLAY: 0,
  PAUSE: 1,
  REWIND: 2,
  SKIP: 3
}

function Player(props) {
  return (
    <div className="Player">
      <h1>{props.current_song.track_name}</h1>
      <b><p>{props.current_song.artist_name}</p></b>
      {props.withControls && (
        <center>
          <div className="Player-Grid">
            <div className="Player-Button-Wrapper">
              <img
                className="Player-Button"
                src={rewind_button}
                onClick={() => props.callback(player_controls.REWIND)}
                alt="rewind"
              />
            </div>
            {props.paused === true && (
              <div className="Player-Button-Wrapper">
                <img
                  className="Player-Button-Big"
                  src={play_button}
                  onClick={() => props.callback(player_controls.PLAY)}
                  alt="play"  
                />
              </div>
            )}
            {props.paused === false && (
              <div className="Player-Button-Wrapper">
                <img
                  className="Player-Button-Big"
                  src={pause_button}
                  onClick={() => props.callback(player_controls.PAUSE)}
                  alt="pause"  
                />
              </div>
            )}
            <div className="Player-Button-Wrapper">
              <img
                className="Player-Button"
                src={next_button}
                onClick={() => props.callback(player_controls.SKIP)}
                alt="skip"
              />
            </div>
          </div>
        </center>
      )}
    </div>
  );
}

class App extends React.Component {

  componentDidMount() {
    // figure out how to set token here
    let _token = hash.code;
    if (_token) {
      // Set token & songs
      this.setState({
        token: _token
      });

      spotify.setSongs();

    }
  }

  constructor(props) {
    super(props);

    this.state = {

      token: "DELETE ME",

      active_page: 0,
      current_song: {
        track_name: "Heat Waves",
        artist_name: "Glass Animals"
      },
      queue: [
        {track_name: "Bad Decisions", artist_name: "The Strokes"},
        {track_name: "Shy Away", artist_name: "Twenty One Pilots"},
      ],
      mood: "Dancey",
      mood_params: [
        {name: "Accousticness", value: 0.9},
        {name: "Danceability", value: 0.2},
        {name: "Instrumental", value: 0.3},
        {name: "Energy", value: 0.8},
        {name: "Loudness", value: 0.7},
        {name: "Speechiness", value: 0.2},
        {name: "Tempo", value: 0.9},
        {name: "Valence", value: 0.4},
      ],
      player_paused: false
    }
  }

  setActivePage(i) {
    this.setState({
      active_page: i,
    })
  }

  playerCallback(action) {
    switch (action) {
      case player_controls.PLAY:
        this.setState({
          player_paused: false
        });
        break;

      case player_controls.PAUSE:
        this.setState({
          player_paused: true
        });
        break;

      case player_controls.REWIND:
        break;

      case player_controls.SKIP:
        break;
        
      default:
        console.log("Unknown player action");
    }
  }

  renderDashboardHeader() {
    if (this.state.current_song == null) {
      return (
        <div>
          <h2 className="Header-Left">Ready for Tunes</h2>
        </div>
      );
    } else {
      return (
        <div>
          <h3 className="Header-Left-Compact">Currently Playing</h3>
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
    this.setActivePage(0);
  }

  renderQueueWidget() {
    if (this.state.queue.length > 0) {
      return (
      <div className="App-widget" onClick={() => this.setActivePage(1)}>
        <h2>Queue</h2>
        {renderQueueEntries(this.state.queue, 5)}
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
          </div>
        );
      } else if (this.state.active_page === 1) {
        return (
        <div className="App">
          <Queue
            onClick={this.returnToDashboard.bind(this)}
            current_song={this.state.current_song}
            queue={this.state.queue}
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
