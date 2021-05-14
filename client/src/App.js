import React from 'react';
import './App.css';
import * as spotify from './spotify.js';

class Queue extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      songs: [{name: "Heat Waves", artist: "Glass Animals"}],
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
    if (this.state.songs.length === 0) {
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
        </div>
      );
    }
  }

}

function Player(props) {
  return (
    <div className="Player">
      <h1>{props.current_song.name}</h1>
      <b><p>{props.current_song.artist}</p></b>
    </div>
  );
}

class App extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      active_page: 0,
      current_song: {
        name: "Heat Waves",
        artist: "Glass Animals"
      }
    }
  }

  setActivePage(i) {
    this.setState({
      active_page: i,
    })
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
          <h2 className="Header-Left">Currently Playing</h2>
          <Player current_song={this.state.current_song} />
        </div>
      );
    }
  }

  returnToDashboard() {
    this.setActivePage(0);
  }

  render() {

    if (this.state.active_page === 0) {
      return (
        <div className="App">
          {this.renderDashboardHeader()}
          <div className="App-widget" onClick={() => this.setActivePage(1)}>
            <h2>Queue</h2>
            <h4>UP NEXT</h4>
            <h3>Bad Decisions / The Strokes</h3>
          </div>
          <div className="App-widget">
            <h2>Mood</h2>
            <h4>vybe feels that you're</h4>
            <h3>DANCEY</h3>
          </div>
        </div>
      );
    } else if (this.state.active_page === 1) {
      return (
      <div className="App">
        <Queue
          onClick={this.returnToDashboard.bind(this)}
          current_song={this.state.current_song}
        />
      </div>
      );

    } else {
      return (
        <div>Current Active Page Index: {this.state.active_page}</div>
      );
    }


  }
}

export default App;
