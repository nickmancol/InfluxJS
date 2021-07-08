# Getting Started with JavaScript and InfluxDB

## Introduction

While [Telegraph](https://www.influxdata.com/time-series-platform/telegraf/) is the main preferred way to collect data for InfluxDB, there are some use cases in which is preferable to use the client libraries, for example to parse a Stream of Server Side Events. In this tutorial you will learn how to read the data stream of data, store it as a time series into InfluxDB and then run some queries over the data using the InfluxDB'ś Javascript client library.

A time series database is a specialized type of data store focused on providing tools to store and query data which has a dimension measured as a time unit, for example the temperature at some minute of every hour, another common example is the price of an asset in the stock or the number of cars at some area in the rush hour. There are many examples of time-based [datasets](https://github.com/awesomedata/awesome-public-datasets#timeseries), also, there are other types of data not suitable for time series databases, think for example the classic [Iris](https://scikit-learn.org/stable/auto_examples/datasets/plot_iris_dataset.html) dataset used for training classification problems in the Machine Learning space or the [Titanic](https://www.kaggle.com/c/titanic-dataset/data) dataset used in forecasting problems. 

Time series databases are used, among other use-cases, to analyze application logs and to collect sensor data, this type of data sources produces streams of data constantly with some other attributes besides the time based dimension, in this example the data source is the [Event Stream](https://wikitech.wikimedia.org/wiki/Event_Platform/EventStreams) of the recent changes provided by the Wikimedia foundation, it follows the [Server Side Event](https://en.wikipedia.org/wiki/Server-sent_events) and can be consumed directly via HTTP.

The sample Nodejs CLI application consists in two components, a writer which consumes the messages from the stream and writes them as data points in the InfluxDB database, and a reader which query the database to render the results of the query as a simple line chart with the time rendered in the x-axis and the value of the series in the y-axis.

![Sample time series rendering](https://imgur.com/gallery/JL4coeC)

## InfluxDB Javascript Client Library

### What You’ll Need

This example is tested using Ubuntu 20.04 and Nodejs v14.17.3 (npm v6.14.13), installed using the [Node Version Manager](https://www.fullstacktutorials.com/tutorials/nodejs/node-version-manager-nvm.html), with the many versions of Nodejs available NVM helps to manage and test the code easily. Also this example writes/reads data from a local InfluxDB 2.0 database, if you don't have a local installation you can follow the [installation guide](https://docs.influxdata.com/influxdb/v2.0/install/), then create a sample [organization](https://docs.influxdata.com/influxdb/v2.0/organizations/create-org/), [bucket](https://docs.influxdata.com/influxdb/v2.0/organizations/buckets/create-bucket/) and [token](https://docs.influxdata.com/influxdb/v2.0/security/tokens/create-token/).

Once you have the token created, set the values of the following environment variables with the values of your local installation:

 - INFLUX_ORG
 - INFLUX_BUCKET
 - INFLUX_TOKEN
 - INFLUX_URL

Those variables are read in the _env.js_ file with some default values.

![env vars read](https://imgur.com/gallery/XOglCuO)

### Installing the Library

The InfluxDB Javascript client is a standard Nodejs module that you can install from the command line:

```sh
npm install @influxdata/influxdb-client
npm install @influxdata/influxdb-client-apis
```

or can be used as a dependency on browser with a line of code:

```html
<script type="module">
    // import latest release from npm repository 
    import {InfluxDB} from 'https://unpkg.com/@influxdata/influxdb-client/dist/index.browser.mjs'
<script>
```

For this example, besides of the InfluxDB Javascript client some other libraries are used for rendering purposes:

 - asciichart: Console ASCII line charts in pure Javascript 
 - blessed: A curses-like library with a high level terminal interface API
 - chalk: Terminal string styling done right
 - eventsource: A pure JavaScript implementation of an EventSource client 

None of these are required to use the InfluxDB Javascript client.

### Making a Connection

Once dependencies are installed, and environment variables are set, you can make a connection to the bucket, for this example the _writer.js_ and _reader.js_ instantiates an InfluxDB object with the _url_ and _token_ read from the environment:

```javascript
new InfluxDB({url, token})
```

This object provides methods to instantiate the different API clients (Writer, Query, etc).

### Inserting Data

To insert data in InfluxDB you have to follow the [_line protocol_](https://docs.influxdata.com/influxdb/v2.0/reference/syntax/line-protocol/), which defines an structure for the four elements that constitute a data point:

 - Measurement: This is the name of the "table" in which you are going to insert the data
 - Tag set: A comma-separated set of _key = value_ of data properties 
 - Field set: A comma-separated set of _key = value_ of data dimensions, the data can be Float (default), Integer,UInteger,String,Boolean
 - Timestamp (optional): Unix timestamp

 Luckily the InfluxDB Javascript client provides a wrapper class to be used along with the WriterApi to insert a single data point or and array of datapoints. The following code shows how to connect to the event source and for each message instantiate a Point to be inserted to the bucket:

 ```javascript
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
        .flush().then(() => {   /**/     })
        .catch(e => {
            console.log('\nFinished ERROR: '+e);
        });
    }
};
 ```

Notice that in lines 9-11 the _writerApi_ is instantiated with the _organization_ and _bucket_ environment variables, but also with a precision value, in this case _seconds_, which defines the granularity of the timestamp dimension of the data to be written, check the other possible values [here](https://github.com/influxdata/influxdb-client-js/blob/94f87594517999fd42e0322a82d22a5c6fd394f7/packages/core/src/options.ts#L84). Also you can set some default tags for each data point to be written, in this case the source of the data, but also notice that the client gives you the possibility to extend this default tag set with some other values, for each data point the _user_ and _isBot_ tags are added.

The on field written is the length of the change made (line 23), the _writePoint_ method accepts the Point instance and then the writeApi instance is flushed, you should always close the writeApi in order to flush pending changes and close pending scheduled retry executions. The _writer.js_ runs indefinitely for each message pushed by the event source.

### Querying Data

Once the data is on the bucket, the InfluxDB Javascript client provides another API client to query the data, in this case the _InfluxDB_ object is used to run a query that returns the number of datapoints grouped by the _isBot_ tag in tha last 10 seconds:

```javascript
const query = '\
from(bucket:"js-sample")\
|> range(start: -10s)\
|> filter(fn:(r) => r._measurement == "edition")\
|> group(columns: ["isBot"])\
|> count()\
';
```

The query is written in the [Flux](https://docs.influxdata.com/influxdb/v2.0/query-data/get-started/) functional data scripting language, it is designed for querying, analyzing, and acting on data over InfluxDB 2.0. The previous language, the InfluxDB SQL-like query language, is still supported at the _/query_ compatibility endpoint of the API, but the recommendation is to use the full power of the new language. As you can notice the query defines the bucket, range of data, filters to be applied, grouping columns and data functions to be applied. The following function shows how to run the query against the _QueryApi_:

```javascript
function queryExample(fluxQuery) {
    const queryApi = new InfluxDB({url, token}).getQueryApi(org)
    queryApi.queryRows(fluxQuery, {
        next(row, tableMeta) {
            const o = tableMeta.toObject(row);
            pushRow(o);
            render();
        },
        complete() { 
            console.log('FINISHED')
        },
        error(error) {
            console.log('QUERY FAILED', error)
        },
    });
}
```

As you can see the _queryApi_ instance requires the organization, for each row returned the data is parsed into and object and passed to a function that stores it in an array based on the _isBot_ attribute, then the two array of the series (bots and humans) are rendered using the asciichart library. The full code for the reader is shown below:

```javascript
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
```

### Additional Documentation and Functionality

The 