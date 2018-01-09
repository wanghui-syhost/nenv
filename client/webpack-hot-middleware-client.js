/* eslint-disable */
require('eventsource-polyfill')
var webpackHotMiddlewareClient = require('webpack-hot-middleware/client?noInfo=true&reload=true')

export default () => {
  const handlers = {
    reload (route) {
      window.location.reload()
    }
  }

  webpackHotMiddlewareClient.subscribe(function (event) {
    const fn = handlers[event.action]
    if (fn) {
      const data = event.data || []
      fn (...data)
    } else {
      throw new Error('Unexpected action ' + event.action)
    }
  })
}