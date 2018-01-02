const { resolve, join, sep } = require('path')
const fs = require('fs')
const express = require('express')
const http = require('http')
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
        // this.router = new
    this.hotReloader = this.getHotReloader(this.dir, { quiet, conf })
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
    this.app.use(this.getRequestHandler())
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

  // async run (req, res)
}
