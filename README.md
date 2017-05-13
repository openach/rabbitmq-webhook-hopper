# RabbitMQ Webhook Hopper

This is a prototype for a RabbitMQ-based webhook queue (the "hopper"), with a NodeJS worker to process the webhooks.  Use any RabbitMQ client to connect to the queue, sending a webhook message to be processed via POST.  The message format is strict JSON, but the body content can be anything.

## Installation

Using docker-compose, simply clone this repository and run:
```
docker-compose up -d
```
RabbitMQ will be available on localhost port 5672, and the durable queue _webhooks_ will be automatically created by the worker once it is up and running.

You can view the output of the worker using _docker logs_:
```
docker logs rabbitmqwebhookhopper_node-worker_1 -f
```

To shut down the application, run:
```
docker-compose down
```
## Adding Webhooks to the Queue
To add a webhook to the queue, use your favorite library to connect to RabbitMQ on _localhost_ port 5672, with the user *"guest"* and password *"guest"*:

```php
use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;

$connection = new AMQPStreamConnection('localhost', 5672, 'guest', 'guest');
$channel = $connection->channel();

// Connect to our existing channel.
// Note the queue is durable, so enable that option accordingly.
$channel->queue_declare('webhooks', false, true, false, false);

```

Next, build your webhook message for the queue which will be encoded to JSON format.

```php
$obj = new \stdClass;
$obj->url = "http://webhook.site/"
$obj->body = new \stdClass;
$obj->body->message = 'Hello World!';
$obj->body->secret_of_the_universe = 41;

// Encode as JSON
$data = json_encode( $obj );
```

Now create the message and put it on the queue.

```php 
$msg = new AMQPMessage($data,['delivery_mode' => AMQPMessage::DELIVERY_MODE_PERSISTENT] );
$channel->basic_publish($msg, '', 'webhooks');
```

## Automatic Retries
By default, the webhook will only be called once.  However, the capability to automatically retry is built into the worker and can be configured on the webhook message.  If you are interested in customizing this further than the options below, see the node-worker/worker.js script, and the [NodeJS _request-retry_ library](https://github.com/FGRibreau/node-request-retry).

### Max Attempts
The _maxAttempts_ option specifies how many time the webhook should be retried.  The default is 0 (e.g. in which case it would only be called once).  Specify it on the webhook message as follows:

```javascript
{
    "url": "http://webhook.site/",
    "body": { "var1": "value1", "var2": "value2" },
    "maxAttempts": 5
}
```

### Retry Delay
The _retryDelay_ option specifies the time in milliseconds to dealy between retries.  The default is 0 (e.g. any retry will be immediate).  Specify it on the webhook message as follows:

```javascript
{
    "url": "http://webhook.site/",
    "body": { "var1": "value1", "var2": "value2" },
    "maxAttempts": 5,
    "retryDelay": 5000 // waith 5 seconds before trying again
}
```

### Retry Strategy
The _retryStrategy_ option specifies the type of responses that will be interpreted as failures necessitating a retry.  Note that these are case-sensitive.

- *HTTPOrNetworkError* - (default) Retry on any HTTP 5xx or network error
- *HTTPError* - Retry only on HTTP 5xx errors
- *NetworkError* - Retry only on network errors

```javascript
{
    "url": "http://webhook.site/",
    "body": { "var1": "value1", "var2": "value2" },
    "maxAttempts": 5,
    "retryDelay": 5000 // waith 5 seconds before trying again
    "retryStrategy": "HTTPOrNetworkError"
}
```

## Confirmations
The worker makes use of RabbitMQ's _ack_ and _nack_.  Assuming the webhook was successfully called with no HTTP 5xx or network errors (as configured via retryStrategy), the message will be acknowledged via _ack_.  If any error occurrs - either in delivery or parsing of the JSON - the message will be acknowledged with _nack_.