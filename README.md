# Webhook Queue API

This is a prototype for a webhook queue, with a simple REST/JSON API for adding webhook calls to a queue, and a worker that executes the webhook requests.

## Installation

Using docker-compose, simply clone this repository and run:
```
docker-compose up -d
```

The API will be available on localhost port 80:
```
http://localhost/api/
```
To shut down the application, run:
```
docker-compose down
```
## Adding Webhooks to the Queue
To add a webhook to the queu, POST a request to http://localhost/api/ with the following parameters:

- _url_ - The URL of the webhook
- _method_ - Either GET or POST
- _params_ - A JSON formatted object of key: value pairs representing the parameters to be passed with the webhook request
- _cb_ - An __optional__ URL to be called if the webhook call fails.  This will be a simple GET request.

## How it Works
Calling the API adds your webhook request to a queue (managed on a Redis instance).  A worker thread picks up the requests from the queue and executes them.  Each request is attempted 10 times, and if the HTTP status code of the response is < 200 or >= 300, a GET request will be made to the _cb_ url (assuming it is set).

## Credits
This application is based on [this post blog post](http://anandmanisankar.com/posts/docker-container-nginx-node-redis-example/):
[http://anandmanisankar.com/posts/docker-container-nginx-node-redis-example/](http://anandmanisankar.com/posts/docker-container-nginx-node-redis-example/)
