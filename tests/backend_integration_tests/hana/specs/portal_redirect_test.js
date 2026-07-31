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

  function assertRedirect(method, done) {
    request(
      {
        url: baseUrl + '/portal/researcher?test=1',
        method: method,
        followRedirect: false,
        strictSSL: false
      },
      function (err, response) {
        expect(err).to.not.exist
        expect(response.statusCode).to.equal(301)
        expect(response.headers.location).to.equal('/d2e/portal')
        done()
      }
    )
  }

  it('redirects GET /portal/researcher to /d2e/portal', function (done) {
    assertRedirect('GET', done)
  })

  it('redirects HEAD /portal/researcher to /d2e/portal', function (done) {
    assertRedirect('HEAD', done)
  })
})
