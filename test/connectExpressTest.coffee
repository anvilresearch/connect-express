# Test dependencies
cwd = process.cwd()
path = require 'path'
chai = require 'chai'
sinon = require 'sinon'
sinonChai = require 'sinon-chai'
expect = chai.expect




# Assertions
chai.use sinonChai
chai.should()




# Code under test
AnvilConnect = require 'anvil-connect-nodejs'
AnvilConnectExpress = require path.join(cwd, 'index')




describe 'Anvil Connect for Express', ->


  {anvil,req,res,next,status,json} = {}


  describe 'constructor', ->

    before ->
      anvil = new AnvilConnectExpress

    it 'should initialize an Anvil Connect client', ->
      anvil.client.should.be.instanceof AnvilConnect

    it 'should set respond to true by default', ->
      anvil.respond.should.be.true



  describe 'verifier', ->

    describe 'with malformed authorization header', ->

      before ->
        anvil = new AnvilConnectExpress()

        json = sinon.spy()
        status = sinon.spy -> json: json

        req = headers: authorization: 'MALFORMED'
        res = status: status
        next = sinon.spy()

        verifier = anvil.verifier()
        verifier req, res, next

      it 'should respond 400', ->
        status.should.have.been.calledWith 400

      it 'should respond with an error', ->
        json.should.have.been.calledWith sinon.match({
          error: 'invalid_request'
        })

      it 'should respond with an error description', ->
        json.should.have.been.calledWith sinon.match({
          error_description: 'Invalid authorization header'
        })


    describe 'with invalid authorization scheme', ->

      before ->
        anvil = new AnvilConnectExpress()

        json = sinon.spy()
        status = sinon.spy -> json: json

        req = headers: authorization: 'WRONG scheme'
        res = status: status
        next = sinon.spy()

        verifier = anvil.verifier()
        verifier req, res, next

      it 'should respond 400', ->
        status.should.have.been.calledWith 400

      it 'should respond with an error', ->
        json.should.have.been.calledWith sinon.match({
          error: 'invalid_request'
        })

      it 'should respond with an error description', ->
        json.should.have.been.calledWith sinon.match({
          error_description: 'Invalid authorization scheme'
        })


    describe 'with multiple access tokens', ->

      before ->
        anvil = new AnvilConnectExpress()

        json = sinon.spy()
        status = sinon.spy -> json: json

        req =
          headers: authorization: 'Bearer token'
          query: access_token: 'token'
        res = status: status
        next = sinon.spy()

        verifier = anvil.verifier()
        verifier req, res, next

      it 'should respond 400', ->
        status.should.have.been.calledWith 400

      it 'should respond with an error', ->
        json.should.have.been.calledWith sinon.match({
          error: 'invalid_request'
        })

      it 'should respond with an error description', ->
        json.should.have.been.calledWith sinon.match({
          error_description: 'Multiple authentication methods'
        })


    describe 'with request body access token and invalid content type', ->

      before ->
        anvil = new AnvilConnectExpress()

        json = sinon.spy()
        status = sinon.spy -> json: json

        req =
          body: access_token: 'token'
          headers: 'content-type': 'application/WRONG'
        res = status: status
        next = sinon.spy()

        verifier = anvil.verifier()
        verifier req, res, next

      it 'should respond 400', ->
        status.should.have.been.calledWith 400

      it 'should respond with an error', ->
        json.should.have.been.calledWith sinon.match({
          error: 'invalid_request'
        })

      it 'should respond with an error description', ->
        json.should.have.been.calledWith sinon.match({
          error_description: 'Invalid content-type'
        })


    describe 'with missing access token', ->

      before ->
        anvil = new AnvilConnectExpress()

        json = sinon.spy()
        status = sinon.spy -> json: json

        req = {}
        res = status: status
        next = sinon.spy()

        verifier = anvil.verifier()
        verifier req, res, next

      it 'should respond 400', ->
        status.should.have.been.calledWith 400

      it 'should respond with an error', ->
        json.should.have.been.calledWith sinon.match({
          error: 'invalid_request'
        })

      it 'should respond with an error description', ->
        json.should.have.been.calledWith sinon.match({
          error_description: 'An access token is required'
        })


    describe 'with valid token in authorization header', ->

      before ->
        anvil = new AnvilConnectExpress()

        json = sinon.spy()
        status = sinon.spy -> json: json

        anvil.client.jwks = {}
        sinon.stub(AnvilConnect.prototype, 'verify')
          .returns new Promise (resolve, reject) ->
            resolve({ jti: 'random' })

        req =
          headers: authorization: 'Bearer token'
        res = status: status
        next = sinon.spy()

        verifier = anvil.verifier()
        verifier req, res, next

      after ->
        AnvilConnect.prototype.verify.restore()

      it 'should not respond', ->
        status.should.not.have.been.called
        json.should.not.have.been.called

      it 'should set access token on request', ->
        req.accessToken.should.equal 'token'

      it 'should set decoded access token claims on request', ->
        req.accessTokenClaims.jti.should.equal 'random'

      it 'should continue', ->
        next.should.have.been.called


    describe 'with valid token in request body', ->

      before ->
        anvil = new AnvilConnectExpress()

        json = sinon.spy()
        status = sinon.spy -> json: json

        anvil.client.jwks = {}
        sinon.stub(AnvilConnect.prototype, 'verify')
          .returns new Promise (resolve, reject) ->
            resolve({ jti: 'random' })

        req =
          body: access_token: 'token'
        res = status: status
        next = sinon.spy()

        verifier = anvil.verifier()
        verifier req, res, next

      after ->
        AnvilConnect.prototype.verify.restore()

      it 'should not respond', ->
        status.should.not.have.been.called
        json.should.not.have.been.called

      it 'should set access token on request', ->
        req.accessToken.should.equal 'token'

      it 'should set decoded access token claims on request', ->
        req.accessTokenClaims.jti.should.equal 'random'

      it 'should continue', ->
        next.should.have.been.called


    describe 'with valid token in query parameter', ->

      before ->
        anvil = new AnvilConnectExpress()

        json = sinon.spy()
        status = sinon.spy -> json: json

        anvil.client.jwks = {}
        sinon.stub(AnvilConnect.prototype, 'verify')
          .returns new Promise (resolve, reject) ->
            resolve({ jti: 'random' })

        req =
          query: access_token: 'token'
        res = status: status
        next = sinon.spy()

        verifier = anvil.verifier()
        verifier req, res, next

      after ->
        AnvilConnect.prototype.verify.restore()

      it 'should not respond', ->
        status.should.not.have.been.called
        json.should.not.have.been.called

      it 'should set access token on request', ->
        req.accessToken.should.equal 'token'

      it 'should set decoded access token claims on request', ->
        req.accessTokenClaims.jti.should.equal 'random'

      it 'should continue', ->
        next.should.have.been.called


    describe 'with invalid access token', ->

      before ->
        anvil = new AnvilConnectExpress()

        json = sinon.spy()
        status = sinon.spy -> json: json

        anvil.client.jwks = {}
        sinon.stub(AnvilConnect.prototype, 'verify')
          .returns new Promise (resolve, reject) ->
            reject({ error: 'invalid_token' })

        req =
          query: access_token: 'token'
        res = status: status
        next = sinon.spy()

        verifier = anvil.verifier()
        verifier req, res, next

      after ->
        AnvilConnect.prototype.verify.restore()

      it 'should respond 400', ->
        status.should.have.been.calledWith 400

      it 'should respond with an error', ->
        json.should.have.been.calledWith sinon.match({
          error: 'invalid_token'
        })

      it 'should respond with an error description', ->
        json.should.have.been.called


    describe 'with valid token and no JWKs', ->

      before ->
        anvil = new AnvilConnectExpress()

        json = sinon.spy()
        status = sinon.spy -> json: json

        sinon.stub(AnvilConnect.prototype, 'discover')
          .returns new Promise (resolve, reject) ->
            anvil.client.configuration =
              jwks_uri: 'https://connect.example.com/jwks'
            resolve()
        sinon.stub(AnvilConnect.prototype, 'getJWKs')
          .returns new Promise (resolve, reject) ->
            anvil.client.jwks = { keys: 'fakedata' }
            resolve()
        sinon.stub(AnvilConnect.prototype, 'verify')
          .returns new Promise (resolve, reject) ->
            resolve({ jti: 'random' })

        req =
          query: access_token: 'token'
        res = status: status
        next = sinon.spy()

        verifier = anvil.verifier()
        verifier req, res, next

      after ->
        AnvilConnect.prototype.discover.restore()
        AnvilConnect.prototype.getJWKs.restore()
        AnvilConnect.prototype.verify.restore()

      it 'should initiate discovery', ->
        anvil.client.configuration.should.eql
          jwks_uri: 'https://connect.example.com/jwks'

      it 'should retrieve JWKs', ->
        anvil.client.jwks.should.eql { keys: 'fakedata' }

      it 'should not respond', ->
        status.should.not.have.been.called
        json.should.not.have.been.called

      it 'should not respond', ->
        status.should.not.have.been.called
        json.should.not.have.been.called

      it 'should set access token on request', ->
        req.accessToken.should.equal 'token'

      it 'should set decoded access token claims on request', ->
        req.accessTokenClaims.jti.should.equal 'random'

      it 'should continue', ->
        next.should.have.been.called
