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
  this.respond = 'respond' in options ? options.respond : true
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
 * Extracts and returns the issuer URL from an OIDC access token.
 * Usage (inside an express route/handler):
 *
 *   ```
 *   try {
 *     var issuer = client.extractIssuer(req)
 *   } catch (err) {
 *     next(err)  // handle potential HTTP 400 error
 *   }
 *   // issuer is now available for use with initProvider(), register(), etc
 *   ```
 * @method extractIssuer
 * @param req {IncomingMessage} Express request object
 * @throws {UnauthorizedError} HTTP 400 error on invalid auth headers
 * @return {String|Null} Issuer url (`null` if no token is present).
 */
function extractIssuer (req) {
  var token = this.extractToken(req)
  return this.client.extractIssuer(token)
}
AnvilConnectExpress.prototype.extractIssuer = extractIssuer

/**
 * Extracts and returns an OIDC AccessToken. First looks in the auth
 * header, then tries the query params in the request URI, and lastly
 * looks in the request body (for a form-encoded token).
 * @method extractToken
 * @private
 * @param req {IncomingMessage} Express request object
 * @throws {UnauthorizedError} HTTP 400 error on invalid auth headers
 * @return {String|Null} JWT Access Token (in encoded string form)
 */
function extractToken (req) {
  var accessToken
  // Check for an access token in the Authorization header
  if (req.headers && req.headers.authorization) {
    var components = req.headers.authorization.split(' ')
    var scheme = components[0]
    var credentials = components[1]

    if (components.length !== 2) {
      throw new UnauthorizedError({
        error: 'invalid_request',
        error_description: 'Invalid authorization header',
        statusCode: 400
      })
    }
    if (scheme !== 'Bearer') {
      throw new UnauthorizedError({
        error: 'invalid_request',
        error_description: 'Invalid authorization scheme',
        statusCode: 400
      })
    }
    accessToken = credentials
  }

  // Check for an access token in the request URI
  if (req.query && req.query.access_token) {
    if (accessToken) {
      throw new UnauthorizedError({
        error: 'invalid_request',
        error_description: 'Multiple authentication methods',
        statusCode: 400
      })
    }
    accessToken = req.query.access_token
  }

  // Check for an access token in the request body
  if (req.body && req.body.access_token) {
    if (accessToken) {
      throw new UnauthorizedError({
        error: 'invalid_request',
        error_description: 'Multiple authentication methods',
        statusCode: 400
      })
    }
    if (req.headers &&
      req.headers['content-type'] !== 'application/x-www-form-urlencoded') {
      throw new UnauthorizedError({
        error: 'invalid_request',
        error_description: 'Invalid content-type',
        statusCode: 400
      })
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
 * @throws {UnauthorizedError} HTTP 400 error on invalid auth headers, or an
 *   HTTP 401 or 403 Unauthorized errors for a missing/invalid access token.
 * @return {Function} Express middleware handler function
 */
function verifier (options) {
  options = options || {}
  var allowNoToken = options.allowNoToken || false
  var loadUserInfo = options.loadUserInfo || false
  var self = this

  return function (req, res, next) {
    var nextError = self.errorHandler(req, res, next)
    var accessToken
    try {
      accessToken = self.extractToken(req)
    } catch (err) {
      // Catch the HTTP 400 invalid token errors
      return nextError(err)
    }

    // Missing access token, exit with error
    if (!accessToken && !allowNoToken) {
      return nextError(new UnauthorizedError({
        realm: 'user',
        error: 'invalid_request',
        error_description: 'An access token is required',
        statusCode: 401
      }))
    }
    // Access token is present
    return Promise.resolve()
      .then(function () {
        // If JWKs are not set, attempt to retrieve them first
        if (!self.client.jwks) {
          return self.client.initProvider()
        }
      })
      .then(function () {
        // provider is initialized, public keys loaded
        // verify the token and carry on
        return self.verifyToken(req, accessToken, options)
          .catch(function (err) {
            nextError(err)
          })
      })
      .then(function () {
        // optionally load user profile from OP's /userinfo
        if (loadUserInfo) {
          return self.client.userInfo({ token: accessToken })
        }
      })
      .then(function (userInfo) {
        if (userInfo) {
          req.userInfo = userInfo
        }
        next()
      })
      .catch(function (err) {
        nextError(err)
      })
  }
}
AnvilConnectExpress.prototype.verifier = verifier

/**
 * Verifies the access token and inserts it into the `req` object for downstream
 * use.
 * @method verifyToken
 * @param req {IncomingMessage} Express request object
 * @param accessToken {String} JWT AccessToken for OpenID Connect
 * @param [options] {Object} Options hashmap (see option param docs for
 *   the `verifier()` method above)
 * @throws {UnauthorizedError} HTTP 401 or 403 errors thrown by client.verify()
 * @return {Promise}
 */
function verifyToken (req, accessToken, options) {
  return this.client.verify(accessToken, options)
    .then(function (accessTokenClaims) {
      req.accessToken = accessToken
      req.accessTokenClaims = accessTokenClaims
    })
}
AnvilConnectExpress.prototype.verifyToken = verifyToken

