/* jshint esversion:6 */
/* global require */

'use strict';

const fs = require('fs');
const express = require('express');

let BrainMaker = require('./learn.js'),
    brain = BrainMaker();

let trainingText = fs.readFileSync('./trainingtext/tonyblair.txt', 'utf-8');
brain.reader.learn(trainingText);
let talker = brain.Writer();

let app = express(),
routes = require(__dirname + '/routes/routes.js');

function req_handler (call) {
    return function (req, res) {
        call(
            req,
            function(err, results){
                if(err) {
                    console.log(err);
                    res.status(500);
                }
                res.send(results);
            }
        );
    };
}

app.set('views', './views');
app.set('view engine', 'pug');

app.use('/resources', express.static(__dirname + '/resources'));

routes.set(app, req_handler, {talker:talker, corpus: brain.corpus})

app.use(function(err, req, res, next) {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

app.use(function(req, res, next) {
    res.status(404).send('Sorry cant find that!');
});

app.listen(3010);
