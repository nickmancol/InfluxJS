const bucket = process.env['INFLUX_BUCKET'] || 'js-sample';
const org = process.env['INFLUX_ORG'] || 'sample-org';
const sseUrl = 'https://stream.wikimedia.org/v2/stream/recentchange';
const token = process.env['INFLUX_TOKEN'] || 'my-token';
const url = process.env['INFLUX_URL'] || 'http://localhost:8086';
const blessed = require ('blessed');

const screen = blessed.screen({smartCSR: true });
screen.title = 'InfluxDB JS Read demo';
screen.key(['escape', 'q', 'C-c'], function(ch, key) {
    return process.exit(0);
});

var chart = blessed.box ({
    top: 'center',
    left: 'center',
    width: 60,
    height: 20,
    border: {
        type: 'line'
    },
    style: {
        fg: 'green',
        bg: 'black',
        border: {
            fg: '#224422'
        }
    }
});

screen.append(chart);
screen.render();

module.exports = {
    bucket
    ,org
    ,sseUrl
    ,token
    ,url
    ,chart
    ,screen
}