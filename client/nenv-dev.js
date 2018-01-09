import initNenv, * as nenv from './'
import initWebpackHMR from './webpack-hot-middleware-client'

initNenv()
    .then(() => {
      initWebpackHMR()
    })
    .catch((err) => {
      console.error(`${err.message}\n${err.stack}`)
    })
