/**
 * Module dependencies
 */

var AnvilConnect = require('anvil-connect-nodejs')
var UnauthorizedError = AnvilConnect.UnauthorizedError

/**
 * Constructor
 */

function AnvilConnectExpress (options) {
  options = options || {}
  this.client = new AnvilConnect(options)
  this.respond = typeof options.respond === 'undefined' ? true : options.respond
}

/**
 * Next
 */

function handler (req, res, next) {
  var self = this

  return function (err) {
    var statusCode = err.statusCode || 400

    if (self.respond) {
      res.status(statusCode).json({
        error: err.error,
        error_description: err.error_description
      })
    } else {
      next(err)
    }
  }
}

AnvilConnectExpress.prototype.handler = handler

/**
 * Verify Middleware
 */

function verifier (options) {
  var self = this

  return function (req, res, next) {
    var accessToken
    var nexter = self.handler(req, res, next)

    // Check for an access token in the Authorization header
    if (req.headers && req.headers.authorization) {
      var components = req.headers.authorization.split(' ')
      var scheme = components[0]
      var credentials = components[1]

      if (components.length !== 2) {
        return nexter(new UnauthorizedError({
          error: 'invalid_request',
          error_description: 'Invalid authorization header',
          statusCode: 400
        }))
      }

      if (scheme !== 'Bearer') {
        return nexter(new UnauthorizedError({
          error: 'invalid_request',
          error_description: 'Invalid authorization scheme',
          statusCode: 400
        }))
      }

      accessToken = credentials
    }

    // Check for an access token in the request URI
    if (req.query && req.query.access_token) {
      if (accessToken) {
        return nexter(new UnauthorizedError({
          error: 'invalid_request',
          error_description: 'Multiple authentication methods',
          statusCode: 400
        }))
      }

      accessToken = req.query.access_token
    }

    // Check for an access token in the request body
    if (req.body && req.body.access_token) {
      if (accessToken) {
        return nexter(new UnauthorizedError({
          error: 'invalid_request',
          error_description: 'Multiple authentication methods',
          statusCode: 400
        }))
      }

      if (req.headers &&
        req.headers['content-type'] !== 'application/x-www-form-urlencoded') {
        return nexter(new UnauthorizedError({
          error: 'invalid_request',
          error_description: 'Invalid content-type',
          statusCode: 400
        }))
      }

      accessToken = req.body.access_token
    }

    function invokeVerification () {
      self.client.verify(accessToken, options)
        .then(function (accessTokenClaims) {
          req.accessToken = accessToken
          req.accessTokenClaims = accessTokenClaims
          next()
        })
        .catch(function (err) {
          nexter(err)
        })
    }

    // Missing access token
    if (!accessToken) {
      return nexter(new UnauthorizedError({
        realm: 'user',
        error: 'invalid_request',
        error_description: 'An access token is required',
        statusCode: 400
      }))

    // Access token found
    } else {
      // If JWKs are not set, attempt to retrieve them first
      if (!self.client.jwks) {
        self.client.discover().then(function () {
          return self.client.getJWKs()
        })
        // then verify the token and carry on
        .then(invokeVerification)
        .catch(function (err) {
          nexter(err)
        })
      // otherwise, verify the token right away
      } else {
        invokeVerification()
      }
    }
  }
}

AnvilConnectExpress.prototype.verifier = verifier

/**
 * Export
 */

module.exports = AnvilConnectExpress
