import React from 'react';
import Slider from '@material-ui/core/Slider';
import './App.css';

export default class MoodControl extends React.Component {
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
                        style={{ height: "50px", color: "white", display: "table", margin: "0 auto" }}
                        max={1}
                        value={params[i].value}
                    />
                </div>
            );
        }
        return sliders;
    }

    render() {
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
