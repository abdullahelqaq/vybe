import React from 'react';
import './App.css';
import Player, { player_controls, renderQueueEntries } from './player_ui.js'
import Toggle from 'react-toggle'
import "react-toggle/style.css"

function SearchBar(props) {
    return (
        <input
            onClick={props.onExitClick}
            onChange={e => props.onSearchChange(e.target.value)}
            className="Search"
            type="text"
            placeholder="Search.."
            value={props.initValue}
            autoFocus={props.input_active}
        />
    );
}

export default class Queue extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            input_active: false,
            search_results: [],
            current_search: "",
        };
    }

    onSearchChange(new_search) {
        this.setState({
            current_search: new_search,
        });

        this.props.onSearchChange(new_search).then(res => {
            let kMaxTracks = 10;
            var track_results = [];

            var loop_limit = res.tracks.items.length;
            if (loop_limit > kMaxTracks) {
                loop_limit = kMaxTracks;
            }
            for (let i = 0; i < loop_limit; i++) {
                let track = res.tracks.items[i];
                track_results.push(track);
            }
            this.setState({
                search_results: track_results,
            });
        }).catch(e => {
            this.setState({
                search_results: [],
                current_search: "",
            });
        });
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
        if (!this.state.input_active) {
            this.props.onClick();
        } else {
            this.setState({
                input_active: false,
            });
        }
    }

    queueTrack(songId, name, artist_names) {
        console.log("Queueing " + songId);
        this.setState({
            current_search: "",
            search_results: []
        });
        this.props.addSong(songId, name, artist_names);
    }

    render() {
        if (this.state.search_results.length > 0) {
            return (
                <div className="Queue" onClick={this.checkExitClick.bind(this)}>
                    <div className="Queue-Header">
                        <SearchBar
                            onExitClick={this.stopExitClick.bind(this)}
                            onSearchChange={this.onSearchChange.bind(this)}
                            initValue={this.state.current_search}
                            input_active={this.state.input_active}
                        />
                    </div>
                    <div className="Queue-Search-Results">
                        {this.state.search_results.map(track => {

                            if (track.artists.length > 1) {
                                return (
                                    <div className="Queue-Search-Cell" onClick={() => this.queueTrack(track.id, track.name, [track.artists[0].name, track.artists[1].name])}>
                                        <img src={track.album.images[0].url} className="Queue-Search-Image" />
                                        <p className="Queue-Search-Text"><b>{track.name}</b><br /><br />{track.artists[0].name} & {track.artists[1].name}</p>
                                    </div>
                                );
                            }
                            else {
                                return (
                                    <div className="Queue-Search-Cell" onClick={() => this.queueTrack(track.id, track.name, [track.artists[0].name])}>
                                        <img src={track.album.images[0].url} className="Queue-Search-Image" />
                                        <p className="Queue-Search-Text"><b>{track.name}</b><br /><br />{track.artists[0].name}</p>
                                    </div>
                                );
                            }
                        })}

                    </div>
                </div>
            );
        }
        else if (this.props.queue.length === 0) {
            return (
                <div className="Queue" onClick={this.checkExitClick.bind(this)}>
                    {'track_name' in this.props.current_song === true && (
                        <div>
                            <br /><br /><br /><br />
                            <Player current_song={this.props.current_song} />
                            <br />
                            <center>
                                <h2>Add Songs to Queue</h2>
                                <SearchBar
                                    onExitClick={this.stopExitClick.bind(this)}
                                    onSearchChange={this.onSearchChange.bind(this)}
                                    initValue={this.state.current_search}
                                    input_active={this.state.input_active}
                                />
                            </center>
                        </div>
                    )}
                    {'track_name' in this.props.current_song === false && (
                        <div className="Queue-Empty">
                            <h2>Add Songs to Queue</h2>
                            <SearchBar
                                onExitClick={this.stopExitClick.bind(this)}
                                onSearchChange={this.onSearchChange.bind(this)}
                                initValue={this.state.current_search}
                                input_active={this.state.input_active}
                            />
                        </div>
                    )}
                </div>
            );
        } else {
            return (
                <div className="Queue" onClick={this.checkExitClick.bind(this)}>
                    <div className="Queue-Header">
                        <SearchBar
                            onExitClick={this.stopExitClick.bind(this)}
                            onSearchChange={this.onSearchChange.bind(this)}
                            initValue={this.state.current_search}
                            input_active={this.state.input_active}
                        />
                        <Player current_song={this.props.current_song} />
                    </div>
                    <div className="Queue-Body">
                        <h2 className="Header-Left">Queue</h2>
                        {renderQueueEntries(this.props.queue)}
                        {this.props.clusters_set == true && (
                            <div className="Queue-Footer">
                                <b><p>Queue Music Based On</p></b>
                                <center>
                                    <div className="modal-input">
                                        <span>Genre</span>
                                        <label onClick={e => {
                                            e.stopPropagation();
                                        }}>
                                            <Toggle
                                                defaultChecked={!this.props.genre_mode}
                                                icons={false}
                                                onChange={e => {
                                                    this.props.setGenreMode(!e.target.checked);
                                                }}
                                            />
                                        </label>
                                        <span>vybe AI</span>
                                    </div>
                                </center>
                            </div>
                        )}
                    </div>
                </div>
            );
        }
    }
}
