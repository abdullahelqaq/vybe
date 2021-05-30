import React from 'react';
import './App.css';
import play_button from './vectors/play-button.svg'
import next_button from './vectors/next-button.svg'
import rewind_button from './vectors/rewind-button.svg'
import pause_button from './vectors/pause-button.svg'

const player_controls = {
    PLAY: 0,
    PAUSE: 1,
    REWIND: 2,
    SKIP: 3,
    LIKE: 4
}

function renderQueueEntries(songs, count = -1) {
    var rows = []
    var limit = songs.length;

    if (count !== -1 && count < songs.length) {
        limit = count;
    }

    for (let i = 0; i < limit; i++) {
        rows.push(
            <p key={i}><b>{songs[i].track_name}</b> / {songs[i].track_artist}</p>
        );
    }
    return rows;
}

export default function Player(props) {
    return (
        <div className="Player">
            <h1>{props.current_song.track_name}</h1>
            <b><p>{props.current_song.track_artist}</p></b>
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
export { player_controls, renderQueueEntries };