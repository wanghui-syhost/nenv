const { join } = require('path')
const { unlink } = require('mz/fs')

module.exports = class UnlinkFilePlugin {
  constructor () {
    this.prevAssets = {}
  }

  apply (compiler) {
    compiler.plugin('after-emit', (compilation, callback) => {
      const removed = Object.keys(this.prevAssets)
      .filter((a) => !compilation.assets[a])

      this.prevAssets = compilation.assets

      Promise.all(removed.map(async (f) => {
        return true
      }))
    })
  }
}
