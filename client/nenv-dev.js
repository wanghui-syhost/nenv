import initNenv, * as nenv from './'

window.nenv = nenv

initNenv()
    .then(() => {

    })
    .catch((err) => {
      console.error(`${err.message}\n${err.stack}`)
    })
