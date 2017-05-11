// server.js

// SETUP
// =============================================================================

// Express
var express    = require('express');        // call express
var app        = express();                 // define our app using express
var bodyParser = require('body-parser');

// Redis Queue
var Queue = require('simple-redis-safe-work-queue')
var webhookQueueClient = Queue.client('invoke webhook',{port:'6379', host:'redis'});

// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var port = process.env.PORT || 8080;        // set our port

// ROUTES FOR API
// =============================================================================

var router = express.Router();              // get an instance of the express Router

// test route to make sure everything is working (accessed at GET http://localhost:8080/api)
router.post('/', function(req, res) {

console.log('request body: %j', req.body);

  var params = {};
  if ( req.body.params ) {
    params = JSON.parse( req.body.params );
  }

  if ( req.body.method == 'POST' ) {
    var webReq = {
      url: req.body.url,
      method: 'POST',
      formData: params 
    };
  }
  else
  {
    var webReq = {
      url: req.body.url,
      method: 'GET',
      qs: params
    };
  }

  var cb = {};
  if ( req.body.cb ) {
    cb.url = req.body.cb;
  }

  var webhook = {
    request: webReq,
    callback: cb
  };

  webhookQueueClient.push(webhook, pushedWebhookWork);

  function pushedWebhookWork(err) {
    if (err) res.status(500).send({success: false, error: err});
    else res.status(201).send({success: true});
  }

});

// more routes for our API will happen here


// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api
app.use('/api', router);
app.get('/', function(req, res, next) {
    res.send('The application is located at /api/');
});

// START THE SERVER
// =============================================================================
app.listen(port);

console.log('The API is now live on port ' + port);

// Gracefully exit our queue when the server shuts down
process.on('exit', function() {
  webhookQueueClient.quit();
});
