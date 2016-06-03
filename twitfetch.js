/* jshint esversion:6 */
/* global process, require, console */
'use strict';

const fs = require('fs');

if (process.argv.indexOf('-user') === -1) {
    throw new Error('No user specified.');
}
const USER = process.argv[process.argv.indexOf('-user') + 1],
      DIR = './trainingtext/';

//Callback functions
let error = function (err, response, body) {
    console.log('ERROR [%s]', JSON.stringify(err));
    //fs.writeFileSync('tError.txt', JSON.stringify(err), 'utf8');
};
let success = function (data) {
    let filter = /(http(.*?)\s|RT)|\t|\r|\n/g;
    let textStream = JSON.parse(data).reduce(
        (p, c) => {
            return p + c.text + " ";
        },
        ""
    );
    textStream = textStream.replace(filter, '');
    fs.writeFileSync(DIR + USER + '.txt', textStream, 'utf8');
};

const Twitter = require('twitter-node-client').Twitter;

//Get this data from your twitter apps dashboard
let config = require('./twitconfig.json');

let twitter = new Twitter(config);

//Example calls

twitter.getUserTimeline({ screen_name: USER, count: '200'}, error, success);