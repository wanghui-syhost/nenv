const path = require('path')
const { resolve, join, sep } = path
const fs = require('fs')
const express = require('express')
const http = require('http')
const proxyMiddleware = require('http-proxy-middleware')
const historyApiFallbackMiddleware = require('connect-history-api-fallback')
const getConfig = require('./config')
const { STATUS_CODES } = http

module.exports = class Server {
  constructor ({ dir = '.', dev = false, staticMarkup = false, quiet = false, conf = null } = {}) {
    if (dev) {
      require('source-map-support').install({
        hookRequire: true
      })
    }

    this.dir = resolve(dir)
    this.dev = dev
    this.hotReloader = this.getHotReloader(this.dir, { quiet, conf })
    this.proxy = this.getProxy(this.dir, {quiet, conf})
    this.http = null
    this.config = getConfig(this.dir, conf)
    this.dist = this.config.distDir
    this.app = express()
  }

  getHotReloader (dir, options) {
    const HotReloader = require('./hot-reloader')
    return new HotReloader(dir, options)
  }

  handleRequest (req, res, next) {
    return this.run(req, res, next)
      .catch((err) => {
        if (!this.quiet) console.error(err)
        res.statusCode = 500
        res.send(STATUS_CODES[500])
      })
  }

  getRequestHandler () {
    return this.handleRequest.bind(this)
  }

  getProxy (dir, { quiet, conf } = { }) {
    let fn = (req, res, next) => next()
    try {
      const proxyTable = require(join(dir, 'proxy'))
      console.log(proxyTable)
      Object.keys(proxyTable).forEach((context) => {
        let options = proxyTable[context]
        if (typeof options === 'string') {
          options = { target: options }
        }
        fn = proxyMiddleware(options.filter || context, options)
      })
      return fn
    } catch (e) {
      return fn
    }
  }

  async prepare () {
    if (this.hotReloader) {
      await this.hotReloader.start()
    }
  }

  async close () {
    if (this.hotReloader) {
      await this.hotReloader.stop()
    }

    if (this.http) {
      await new Promise((resolve, reject) => {
        this.http.close((err) => {
          if (err) return reject(err)
          return resolve()
        })
      })
    }
  }

  defineRoutes () {
    const routes = {

    }
    return routes
  }

  async start (port, hostname) {
    await this.prepare()

    this.app.use(this.proxy)

    this.app.use(historyApiFallbackMiddleware())

    this.app.use(this.getRequestHandler())

    this.app.use(path.posix.join(this.dir, 'static'), express.static('./static'))

    this.http = http.createServer(this.app)

    await new Promise((resolve, reject) => {
      this.http.on('error', reject)
      this.http.on('listening', () => resolve())
      this.http.listen(port, hostname)
    })
  }

  async run (req, res) {
    if (this.hotReloader) {
      await this.hotReloader.run(req, res)
    }
  }

  readBuildId () {
    const buildIdPath = join(this.dir, this.dist, 'BUILD_ID')
    const buildId = fs.readFileSync(buildIdPath, 'utf8')
    return buildId.trim()
  }
}
