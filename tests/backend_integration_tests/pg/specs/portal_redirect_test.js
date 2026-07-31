/* eslint-env node */
'use strict'

var expect = require('chai').expect
var request = require('request')
var path = require('path')
var HostConfig = require('../lib/host_config')

describe('-- PORTAL REDIRECT TESTS --', function () {
  var environmentPath = path.join(__dirname, '.envir')
  var hostConfig = new HostConfig(environmentPath)
  var baseUrl = hostConfig.host + ':' + hostConfig.sysappport

  function assertRedirect(method, urlPath, expectedLocation, done) {
    request(
      {
        url: baseUrl + urlPath,
        method: method,
        followRedirect: false,
        strictSSL: false
      },
      function (err, response) {
        expect(err).to.not.exist
        expect(response.statusCode).to.equal(301)
        expect(response.headers.location).to.equal(expectedLocation)
        done()
      }
    )
  }

  it('redirects GET /portal/researcher preserving path and query', function (done) {
    assertRedirect('GET', '/portal/researcher?test=1', '/d2e/portal/researcher?test=1', done)
  })

  it('redirects HEAD /portal/login-callback preserving auth query params', function (done) {
    assertRedirect(
      'HEAD',
      '/portal/login-callback?code=abc123&state=state123',
      '/d2e/portal/login-callback?code=abc123&state=state123',
      done
    )
  })
})
