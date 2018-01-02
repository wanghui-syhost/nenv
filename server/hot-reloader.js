const { join, relative, sep } = require('path')
const WebpackDevMiddleware = require('webpack-dev-middleware')
const WebpackHotMiddleware = require('webpack-hot-middleware')
const webpack = require('./build/webpack')
const getConfig = require('./config')

module.exports = class HotReloader {
  constructor (dir, { quiet, conf } = {}) {
    this.dir = dir
    this.quiet = quiet
    this.middlewares = []
    this.webpackDevMiddleware = null
    this.webpackHotMiddleware = null
    this.initialized = false
    this.stats = null
    this.compilationErrors = null
    this.prevAssets = null

    this.config = getConfig(dir, conf)
  }

  async run (req, res) {
    for (const fn of this.middlewares) {
      await new Promise((resolve, reject) => {
        fn(req, res, (err) => {
          if (err) return reject(err)
          resolve()
        })
      })
    }
  }

  async start () {
    const [compiler] = await Promise.all([
      webpack(this.dir, { buildDir: this.buildId, dev: true, quiet: this.quiet })
    ])

    const buildTools = await this.prepareBuildTools(compiler)
    this.assignBuildTools(buildTools)

    this.stats = await this.waitUntilVaild()
  }

  async stop (webpackDevMiddleware) {
    const middleware = webpackDevMiddleware || this.webpackDevMiddleware
    if (middleware) {
      return new Promise((resolve, reject) => {
        middleware.close((err) => {
          if (err) return reject(err)
          resolve()
        })
      })
    }
  }

  async reload () {
    this.stats = null

    const [compiler] = await Promise.all([
      webpack(this.dir, { buildId: this.buildId, dev: true, quiet: this.quiet })
    ])

    const buildTools = await this.prepareBuildTools(compiler)
    this.stats = await this.waitUntilVaild(buildTools.webpackDevMiddleware)

    const oldWebpackDevMiddleware = this.webpackDevMiddleware
    this.assignBuildTools(buildTools)
    await this.stop(oldWebpackDevMiddleware)
  }

  assignBuildTools ({ webpackDevMiddleware, webpackHotMiddleware }) {
    this.webpackDevMiddleware = webpackDevMiddleware
    this.webpackHotMiddleware = webpackHotMiddleware
    this.middlewares = [
      webpackDevMiddleware,
      webpackHotMiddleware
    ]
  }

  async prepareBuildTools (compiler) {
    // compiler.plugin('after-emit', (compilation, callback) => {
    //   const { assets } = compilation

    //   if (this.prevAssets) {
    //     for (const f of Object.keys(assets)) {
    //       deleteCache(assets[f].existsAt)
    //     }

    //     for (const f of Object.keys(this.prevAssets)) {
    //       if (!assets[f]) {
    //         deleteCache(this.prevAssets[f].existsAt)
    //       }
    //     }
    //   }

    //   this.prevAssets = assets
    //   callback()
    // })

    // compiler.plugin('done', (stats) => {
    //   const { compilation } = new Set(
    //         // compilation.chunks
    //     )
    // })

    compiler.plugin('compilation', function (compilation) {
      // compilation.plugin('html-webpack-plugin-after-emit', )
    })

    const ignored = [
      /node_modules/
    ]

    let webpackDevMiddlewareConfig = {
      publicPath: ``,
      // noInfo: true,
      // quiet: true,
      clientLogLevel: 'warning',
      watchOptions: { ignored }
    }

    if (this.config.webpackDevMiddleware) {
      console.log(`> Using "webpackDevMiddleware" config defined in ${this.config.configOrigin}.`)
      webpackDevMiddlewareConfig = this.config.webpackDevMiddleware(webpackDevMiddlewareConfig)
    }

    const webpackDevMiddleware = WebpackDevMiddleware(compiler, webpackDevMiddlewareConfig)

    const webpackHotMiddleware = WebpackHotMiddleware(compiler, {
      // log: false,
      heartbeat: 2500
    })

    return {
      webpackDevMiddleware,
      webpackHotMiddleware
    }
  }

  waitUntilVaild (webpackDevMiddleware) {
    const middleware = webpackDevMiddleware || this.webpackDevMiddleware
    return new Promise((resolve) => {
      middleware.waitUntilValid(resolve)
    })
  }

  send (action, ...args) {
    this.webpackHotMiddleware.publish({ action, data: args })
  }
}

function deleteCache (path) {
  delete require.cache[path]
}
