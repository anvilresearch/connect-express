# Anvil Connect lib for Express
[![NPM Version](https://img.shields.io/npm/v/anvil-connect-express.svg?style=flat)](https://npm.im/anvil-connect-express)
[![Build Status](https://travis-ci.org/anvilresearch/connect-express.svg?branch=master)](https://travis-ci.org/anvilresearch/connect-express)

### Overview

This is a simple auth middleware for Express.js apps that works with the 
[Anvil Connect](https://github.com/anvilresearch/connect) 
authentication/authorization server (based on the 
[OpenID Connect](http://openid.net/connect/) and OAuth 2 stack), and the 
[`anvil-connect-nodejs`](https://github.com/anvilresearch/connect-nodejs) client.

### Installation

This library assumes that you have Node.js installed (it's developed and tested
on Node v4 and above), and are familiar with Express routes and middleware.
To install dependencies:

```
npm install
```

### Configuration

Require the project and configure the client with an `issuer`, a `client_id`, 
and a `client_secret`. For more information on registering and configuring
OpenID Connect clients, see the 
[Anvil Connect Documentation](https://github.com/anvilresearch/connect-docs).

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

### Authorizing

The Anvil Connect lib for Express allows you to authorize requests from one to 
multiple endpoints or even the entire server.

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

### Customizations

The Anvil Connect lib for Express allows for some customization. You can 
authorize with a required scope or even whitelist clients you want to allow by 
`client_id`.

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

### Unit Testing

To run the unit tests after installation:

```
npm test
```

### License

MIT
