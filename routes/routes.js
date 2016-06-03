'use strict';

function routes(app, req_handler, libs) {

    /* Define main view rendering route */
    
    app.route('/')
    .get(function(req, res) {
        res.render('index', {}); 
    });
    
    /* Attach routes to app module functions */
    
    app.route('/say/statement')
    .get(
        function(req, res) {
            let msgLength = req.query.targetlength || 10;
            let msg = libs.talker.writeSentence(msgLength); 
            res.send({msg:msg, len: msg.length});
        }
    );
    app.route('/info/wordcount')
    .get(
        function(req, res) {
            let stats = libs.corpus.wordCount();
            res.send({stats:stats});
        }
    );
    app.route('/info/corpus')
    .get(
        function(req, res) {
            res.send({corpus:libs.corpus.view()});
        }
    );
    
}

module.exports.set = routes;