import React from 'react';
import './App.css';
import * as spotify from './spotify.js';

class Queue extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      songs: [],
    };

  }

  render() {
    if (this.state.songs.length === 0) {
      return (
        <div className="Queue">
          <div className="Queue-Empty">
            <h2>Add Songs to Queue</h2>
            <input className="Search" type="text" placeholder="Search.." />
          </div>
        </div>
      );
    }

    return (
      <div className="Queue">
        
      </div>
    );
  }

}


class App extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      active_page: 0,
    }
  }

  setActivePage(i) {
    this.setState({
      active_page: i,
    })
  }

  render() {

    if (this.state.active_page === 0) {
      return (
        <div className="App">
          <div className="App-header">
            <h2>Currently Playing</h2>
            <h1>Heat Waves</h1>
            <b><p>GLASS ANIMALS</p></b>
          </div>
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
        <Queue />
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
