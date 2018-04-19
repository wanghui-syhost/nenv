import initNenv, * as nenv from './'
import initWebpackHMR from './webpack-hot-middleware-client'

import devPane from './nenvDev'
import router from '../lib/router'

const doc = document
initNenv()
    .then(() => {
      initWebpackHMR()
      const el = doc.createElement('div')
      doc.body.appendChild(el)
      const DevPane = Vue.extend(devPane)
      new DevPane({ router }).$mount(el)
    })
    .catch((err) => {
      console.error(`${err.message}\n${err.stack}`)
    })
