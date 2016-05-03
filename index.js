/**
 * Simple auth middleware for Express.js apps that works with Anvil Connect
 * server and node client.
 * @module anvil-connect-express
 */
module.exports = AnvilConnectExpress

/**
 * Module dependencies
 */
var AnvilConnect = require('anvil-connect-nodejs')
var UnauthorizedError = AnvilConnect.UnauthorizedError

/**
 * @class AnvilConnectExpress
 * @constructor
 * @param [options] {Object} Options hashmap (passed through to the Client)
 * @param [options.respond=true] {Boolean} Whether to write an error to the
 *   response object (passes it downstream if set to false)
 */
function AnvilConnectExpress (options) {
  options = options || {}
  this.client = new AnvilConnect(options)
  this.respond = options.respond || true
}

/**
 * Returns an Express handler for http error responses.
 * @method errorHandler
 * @param req {IncomingMessage} Express request object
 * @param res {ServerResponse} Express response object
 * @param next {Function} Express next() callback
 * @return {Function} Error handler
 */
function errorHandler (req, res, next) {
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
AnvilConnectExpress.prototype.errorHandler = errorHandler

/**
 * Extracts and returns an OIDC AccessToken. First looks in the auth
 * header, then tries the query params in the request URI, and lastly
 * looks in the request body (for a form-encoded token).
 * @method extractToken
 * @param req {IncomingMessage} Express request object
 * @param nextError {Function} Error handler
 * @throws {UnauthorizedError} HTTP 400 error on invalid auth headers
 * @returns {AccessToken} JWT Access Token
 */
function extractToken (req, nextError) {
  // Check for an access token in the Authorization header
  if (req.headers && req.headers.authorization) {
    var components = req.headers.authorization.split(' ')
    var scheme = components[0]
    var credentials = components[1]
    var accessToken

    if (components.length !== 2) {
      return nextError(new UnauthorizedError({
        error: 'invalid_request',
        error_description: 'Invalid authorization header',
        statusCode: 400
      }))
    }
    if (scheme !== 'Bearer') {
      return nextError(new UnauthorizedError({
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
      return nextError(new UnauthorizedError({
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
      return nextError(new UnauthorizedError({
        error: 'invalid_request',
        error_description: 'Multiple authentication methods',
        statusCode: 400
      }))
    }
    if (req.headers &&
      req.headers['content-type'] !== 'application/x-www-form-urlencoded') {
      return nextError(new UnauthorizedError({
        error: 'invalid_request',
        error_description: 'Invalid content-type',
        statusCode: 400
      }))
    }
    accessToken = req.body.access_token
  }
  return accessToken
}
AnvilConnectExpress.prototype.extractToken = extractToken

/**
 * Returns an Express.js middleware handler for verifying OpenID Connect/OAuth 2
 * access tokens.
 * @method verifier
 * @param [options] {Object} Options hashmap for overriding OIDC client options
 *   (the client's id, issuer etc should already be set at this point)
 * @param [options.allowNoToken=false] {Boolean} Do not raise 'Access to token
 *   is required' error if set to true. Useful for access to authenticated
 *   but allow-anyone resources.
 * @param [options.loadUserInfo=false] {Boolean} If true, loads the user details
 *   from the provider's `/userinfo` endpoint, and sets them to `req.userInfo`
 * @param [options.client_id] {String}
 * @param [options.client_secret] {String}
 * @param [options.clients] {Array<String>} Whitelist of client ids (restrict
 *   verification only to these clients).
 * @param [options.issuer] {String} OpenID Connect provider url
 * @param [options.key] {String} JWK key
 * @param [options.scope] {String}
 * @throws {UnauthorizedError} HTTP 400 error on invalid auth headers
 * @return {Function} Express middleware handler function
 */
function verifier (options) {
  options = options || {}
  var allowNoToken = options.allowNoToken || false
  var loadUserInfo = options.loadUserInfo || false
  var self = this

  return function (req, res, next) {
    var nextError = self.errorHandler(req, res, next)
    var accessToken = self.extractToken(req, nextError)

    // Missing access token
    if (!accessToken && !allowNoToken) {
      return nextError(new UnauthorizedError({
        realm: 'user',
        error: 'invalid_request',
        error_description: 'An access token is required',
        statusCode: 400
      }))
    } else { // Access token found
      // If JWKs are not set, attempt to retrieve them first
      if (!self.client.jwks) {
        self.client.discover()
          .then(function () {
            return self.client.getJWKs()
          })
          .then(function () {
            // then verify the token and carry on
            return self.verifyToken(req, accessToken, next, nextError, options)
          })
          .then(function () {
            // optionally load user profile from OP's /userinfo
            if (loadUserInfo) {
              return self.client.userInfo({token: accessToken})
            }
          })
          .then(function (userInfo) {
            if (userInfo) {
              req.userInfo = userInfo
            }
          })
          .catch(function (err) {
            nextError(err)
          })
      // otherwise, verify the token right away
      } else {
        self.verifyToken(req, accessToken, next, nextError, options)
      }
    }
  }
}
AnvilConnectExpress.prototype.verifier = verifier

/**
 * Verifies the access token and inserts it into the `req` object for downstream
 * use.
 * @method verifyToken
 * @param req {IncomingMessage} Express request object
 * @param accessToken {AccessToken} JWT AccessToken for OpenID Connect
 * @param next {Function} Express next() callback
 * @param nextError {Function} Error handler
 * @param [options] {Object} Options hashmap (see option param docs for
 *   the `verifier()` method above)
 */
function verifyToken (req, accessToken, next, nextError, options) {
  return this.client.verify(accessToken, options)
    .then(function (accessTokenClaims) {
      req.accessToken = accessToken
      req.accessTokenClaims = accessTokenClaims
      next()
    })
    .catch(function (err) {
      nextError(err)
    })
}
AnvilConnectExpress.prototype.verifyToken = verifyToken

