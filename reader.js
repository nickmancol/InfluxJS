const {InfluxDB} = require('@influxdata/influxdb-client');
const {url, token, org, bucket, chart, screen} = require('./env');
const chalk = require('chalk');
var asciichart = require ('asciichart');
const maxLength = 100;
const bots = [];
const humans = [];
var config = {
    height:  18,         // any height you want
    colors: [
        asciichart.blue,
        asciichart.red,
        asciichart.default, // default color
        undefined, // equivalent to default
    ]
}

const query = `\
from(bucket:"${bucket}")\
|> range(start: -10s)\
|> filter(fn:(r) => r._measurement == "edition")\
|> group(columns: ["isBot"])\
|> count()\
`;

demo();

async function demo() {
    for (let index = 0; index < 300; index++) {
        queryExample( query );
        await sleep(500);
    }
}

function queryExample(fluxQuery) {
    const queryApi = new InfluxDB({url, token}).getQueryApi(org)
    queryApi.queryRows(fluxQuery, {
        next(row, tableMeta) {
            const o = tableMeta.toObject(row);
            pushRow(o);
            render();
        }, complete() {}
        , error(error) {
            console.log('QUERY FAILED', error)
        }
    });
}

function pushRow(row) {
    if (bots.length >= maxLength) {
        bots.shift ();
    }
    if (humans.length >= maxLength) {
        humans.shift ();
    }

    row.isBot == 'true' ? bots.push( row['_value']) : humans.push( row['_value']);
}

function render(){
    if(bots.length != 0 && humans.length != 0) {
        const plt = asciichart.plot ([bots,humans], config).split ('\n');
        chart.setLine (0, chalk.blue('Bots: '+bots[bots.length-1]) + ' ' + chalk.red('Humans: '+humans[humans.length-1]));
        plt.forEach ((line, i) => {
            chart.setLine (i + 1, line);
        });
    }
    screen.render();
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}