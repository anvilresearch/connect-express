# NOTICE

We’re archiving Anvil Connect and all related packages. This code is entirely MIT Licensed. You’re free to do with it what you want. That said, we are recommending _**against**_ using it, due to the potential for security issues arising from unmaintained software. For more information, see the announcement at [anvil.io](https://anvil.io).

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
on Node 4 and above), and are familiar with Express routes and middleware.
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
var AnvilConnectExpress = require('anvil-connect-express')

// configure the REST client
var oidc = new AnvilConnectExpress({
  issuer: 'https://connect.example.com',
  client_id: 'YOUR_CLIENT_ID_HERE',
  client_secret: 'YOUR_CLIENT_SECRET_HERE'
})

// Your express app can go here... for example:
var express = require('express')
var app = express()
```

### Usage

The Anvil Connect lib for Express allows you to require authentication and
authorization for any requests to any number of Express endpoints (or even
the entire server).

##### Single endpoint
```javascript
app.get('/protected', oidc.verifier(), function (req, res, next) {
  // This endpoint is authenticated and authorized
})
```

##### All endpoints
```javascript
app.use(oidc.verifier())

app.get('/protected-one', function (req, res, next) {
  // This endpoint is authenticated and authorized
})

app.get('/protected-two', function (req, res, next) {
  // This endpoint is also authenticated and authorized
})
```

##### Optionally Authenticate

By default, as in the above examples, if an endpoint uses the `verifier()`
middleware, it will throw an HTTP 
[401 Unauthorized](https://tools.ietf.org/html/rfc7235#section-3.1) 
`An access token is required` error if an access token is not included with that 
request.

However, for some use cases, the access token is optional, but you still want
to invoke `verifier()` so that the token is parsed, and the credentials are
added to the `req` object for downstream use. For example, if the resource was 
set to 'allow anyone to read' by its owner, a request with no token is 
acceptable - no error should be raised until the control flow passes to a 
downstream authorization component.

In this case, set the optional parameter `allowNoToken` to true:

```js
var verifyOptions = { allowNoToken: true }
app.get('/maybe-protected', oidc.verifier(verifyOptions), function (req, res, next) {
  // The verifier parses the access token and adds it to `req`
  // but does not raise an error if it's missing
})
```

##### Optionally Load User Info

In addition to parsing and verifying the access token, you can ask `verifier()`
to also load user profile details from the OpenID Provider's `/userinfo` 
endpoint:

```js
var verifyOptions = { loadUserInfo: true }
app.get('/protected', oidc.verifier(verifyOptions), function (req, res, next) {
  // The verifier parses the access token, and also loads user profile
})
```

### Customizations

The Anvil Connect lib for Express allows for some customization. You can 
authorize with a required scope or even whitelist clients you want to allow by 
`client_id`.

##### Authorize with a required scope

```javascript
// authorize one or more endpoints with a required scope
var authorize = oidc.verifier({ scope: 'research' })
app.get('/authenticated', authorize, function (req, res, next) {
  // This endpoint is authenticated with a required scope...
})
```

```javascript
//Authorize your entire server with a required scope
app.use(oidc.verifier({ scope: 'myapp' }))

app.get('/authenticated', function (req, res, next) {
  // This endpoint is authenticated with a required scope...
})

app.get('/authed', function (req, res, next) {
  // This endpoint is also authenticated with a required scope...
})
```

##### Restrict to specific clients

```javascript
var authorize = oidc.verifier({
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
