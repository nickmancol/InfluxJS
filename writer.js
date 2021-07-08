#!/usr/bin/env node

const {InfluxDB, Point, HttpError} = require('@influxdata/influxdb-client');
const {url, token, org, bucket, sseUrl} = require('./env');
var EventSource = require('eventsource');
const {hostname} = require('os');

//Creates a writer with "seconds" as precision
const writeApi = new InfluxDB({url, token}).getWriteApi(org, bucket, 's');
//Sets the common tags for this writer
writeApi.useDefaultTags({location: hostname(), source:'wikimedia', sseUrl:sseUrl });

console.log(`Connecting to EventStreams at ${sseUrl}`);
var eventSource = new EventSource(sseUrl);

eventSource.onmessage = function(event) {
    // event.data will be a JSON string containing the message event.
    const d = JSON.parse(event.data);
    if( d.length != undefined ){
        const dataPoint = new Point('edition')
            .tag( 'user',d.user )
            .tag( 'isBot', d.bot )
            .floatField('value', d.length.new)
        writeApi.writePoint( dataPoint );
        console.log( dataPoint );
        writeApi
        .flush().then(() => {        })
        .catch(e => {
            console.error(e);
            console.log('\nFinished ERROR:'+e);
        });
    }
};