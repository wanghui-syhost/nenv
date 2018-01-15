const { join } = require('path')
const Metalsmith = require('metalsmith')
module.exports = function generate (name, src, dest, done) {
  const metalsmith = Metalsmith(join(src, 'template'))
  const data = Object.assign(metalsmith.metadata(), {
    destDirName: name,
    inPlace: dest === process.cwd(),
    noEscape: true
  })
  console.log(`${name};${src};${dest} done`)

  metalsmith.clean(false)
}
