var request = require('request');  
var Queue = require('simple-redis-safe-work-queue')

var worker = Queue.worker('invoke webhook', invokeWebhook, {port:'6379', host:'redis'});

function invokeWebhook(webhook, cb) {  
  console.log('invoke webhook: %j', webhook.request);
  
  request(webhook.request, done);

  function done(err, res) {
    if (! err && (res.statusCode < 200 || res.statusCode >= 300)) {
      err = Error('response status code was ' + res.statusCode);
    }
    cb(err);
  }
}

worker.on('max retries', function(err, payload) {  
  console.error(
    'max retries reached trying to talk to %s. Callback: %s  Request params: %j',
    payload.request.url, payload.callback, payload.request);

  if ( webhook.callback ) {
    console.log('invoking callback to originator webhook: %j', webhook.callback);
    request( webhook.callback, function(err,res) {
      if ( ! err && (res.statusCode < 200 || res.statusCode >= 300)) {
        console.error( 'Unable to notify originator of failure via callback webhook %j.', webhook.callback );
      }
    });
  }

});
