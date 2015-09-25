# Anvil Connect lib for Express
[![Build Status](https://travis-ci.org/anvilresearch/connect-express.svg?branch=master)](https://travis-ci.org/anvilresearch/connect-express)

### Example

```javascript
var AnvilConnect = require('anvil-connect-express')

// configure a client
var anvil = new AnvilConnect({
  issuer: 'https://connect.example.com',
  client_id: 'CLIENT_ID',
  client_secret: 'CLIENT_SECRET'
})

// example express app
var express = require('express')
var app = express()

// authorize a single endpoint
app.get('/authenticated', anvil.verifier(), function (req, res, next) {
  // ...
})

// authorize with a required scope
var authorize = anvil.verifier({ scope: 'research' })
app.get('/authenticated', authorize, function (req, res, next) {
  // ...
})

// authorize your entire server
app.use(anvil.verifier({ scope: 'myapp' }))

// restrict to specific clients
var authorize = anvil.verifier({
  clients: [
    // whitelist clients you want to allow by client_id
    '8206cab0-3712-4841-bb6c-c347799e2458',
    // ...
  ]
})
```
