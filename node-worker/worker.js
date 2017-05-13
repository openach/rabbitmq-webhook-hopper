setTimeout( function(){

var 	amqp    = require('amqplib/callback_api'),
	request = require('requestretry'),
	extend = require('util')._extend,

	rabbitmq_url = 'amqp://guest:guest@rabbitmq:5672',
	rabbitmq_opts = {},
	opts = {
		maxAttempts: 0,
		retryDelay: 5000,
		retryStrategy: request.RetryStrategies.HTTPOrNetworkError,
	};
	
amqp.connect(rabbitmq_url, rabbitmq_opts, function(err, conn) {
    if ( err ) {
        console.error(err);
    }
    conn.createChannel(function(err, ch) {
        var q = 'webhooks';

        ch.assertQueue(q, {durable: true, noAck: false});
        console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", q);
        ch.consume(q, function(msg) {
			console.log(' [*] Received message %j', msg.content.toString());

			// Parse the message content as JSON
			try {
				data = JSON.parse(msg.content);
			} catch (e) {
				console.log(" [x] Failed: %s is not valid JSON.", msg.content.toString());
				ch.nack(msg);
				return;
			}

			// Stringify the body for use as the webhook request body
			var body = JSON.stringify(data.body);

			// Check for any retry options that may be set
			if ( data.maxAttempts > 0 ) {
				opts.maxAttempts = data.maxAttempts;
			}
			if ( data.retryDelay > 0 ) {
				opts.retryDelay = data.retryDelay;
			}
			if ( data.retryStrategy == 'HTTPError' ) {
				opts.retryStrategy = request.RetryStrategies.HTTPError;
			}
			if ( data.retryStrategy == 'NetworkError' ) {
				opts.retryStrategy = request.RetryStrategies.NetworkError;
			}

			var req = {
				uri: data.url,
				method: 'POST',
				body: body,
				headers: {
					'Content-Type': 'application/json'
				}
			};

			// Merge our request options with the request
			extend( req, opts );

			request(req, function (error, response, body) {
				if(!error) {
					console.log(" [*] Complete: %s", msg.content.toString());
					ch.ack(msg);
				}
				else {
					console.log(" [!] Incomplete: Delivery failed after " + response.attempts + "attempts. %j", msg.content.toString());
					ch.nack(msg);
				}
			});
		});
	});
});

}, 5000);
