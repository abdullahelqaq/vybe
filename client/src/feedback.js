import React from 'react';
import good_react from './vectors/good.svg'
import meh_react from './vectors/meh.svg'
import bad_react from './vectors/bad.svg'

const feedback_options = {
    GOOD: 0,
    MEH: 1,
    BAD: 2
}

export default function Feedback(props) {
    if (!props.show) {
        return null;
    }

    return (
        <div className="modal">
            <div className="modal-content">
                <center>
                    <h1>Feedback</h1>
                    <h4>Letting us know why you skipped the song will help us improve your suggestions!</h4>
                    <br /><br /><br />
                    <div className="modal-input">
                        <div className="Player-Button-Wrapper">
                            <img
                                className="modal-react"
                                src={good_react}
                                alt="good"
                                onClick={() => props.callback(feedback_options.GOOD)}
                            />
                        </div>
                        <p className="modal-input-desc">Good song but not feeling it right now</p>

                        <div className="Player-Button-Wrapper">
                            <img
                                className="modal-react"
                                src={meh_react}
                                alt="meh"
                                onClick={() => props.callback(feedback_options.MEH)}
                            />
                        </div>
                        <p className="modal-input-desc">Don’t like the song but it matches the vibe</p>
                        <div className="Player-Button-Wrapper">
                            <img
                                className="modal-react"
                                src={bad_react}
                                alt="bad"
                                onClick={() => props.callback(feedback_options.BAD)}
                            />
                        </div>
                        <p className="modal-input-desc">Way off</p>
                    </div>
                </center>
            </div>
        </div>
    );
}

export { feedback_options };
