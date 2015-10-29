# Anvil Connect lib for Express
[![Build Status](https://travis-ci.org/anvilresearch/connect-express.svg?branch=master)](https://travis-ci.org/anvilresearch/connect-express)

### Configure

Require the project and configure the client with an `issuer`, a `client_id`, and a `client_secret`.

```javascript
var AnvilConnect = require('anvil-connect-express')

// configure the client
var anvil = new AnvilConnect({
  issuer: 'https://connect.example.com',
  client_id: 'YOUR_CLIENT_ID_HERE',
  client_secret: 'YOUR_CLIENT_SECRET_HERE'
})

// Your express app can go here... for example:
var express = require('express')
var app = express()
```

### Authorize

The Anvil Connect lib for Express allows you to authorize requests from one to multiple endpoints or even the entire server.

##### Authorize a single endpoint
```javascript
app.get('/authenticated', anvil.verifier(), function (req, res, next) {
  // This endpoint is authenticated...
})
```

##### Authorize your entire server
```javascript
app.use(anvil.verifier())

app.get('/authenticated', function (req, res, next) {
  // This endpoint is authenticated...
})

app.get('/authed', function (req, res, next) {
  // This endpoint is also authenticated...
})
```

### Customize

The Anvil Connect lib for Express allows for some customization. You can authorize with a required scope or even whitelist clients you want to allow by client_id.

##### Authorize with a required scope

```javascript
// authorize one or more endpoints with a required scope
var authorize = anvil.verifier({ scope: 'research' })
app.get('/authenticated', authorize, function (req, res, next) {
  // This endpoint is authenticated with a required scope...
})
```

```javascript
//Authorize your entire server with a required scope
app.use(anvil.verifier({ scope: 'myapp' }))

app.get('/authenticated', function (req, res, next) {
  // This endpoint is authenticated with a required scope...
})

app.get('/authed', function (req, res, next) {
  // This endpoint is also authenticated with a required scope...
})
```

##### Restrict to specific clients

```javascript
var authorize = anvil.verifier({
  clients: [
    // whitelist clients you want to allow by client_id
    '8206cab0-3712-4841-bb6c-c347799e2458',
    // ...
  ]
})
```
