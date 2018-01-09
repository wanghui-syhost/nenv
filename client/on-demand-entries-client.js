export default () => {
  async function ping () {
    try {
      const url = `/_nenv/on-demand-entries-ping?page=''`
      const res = await fetch(url, {
        credentials: 'same-origin'
      })
      // const payload = await res.json()
    } catch (err) {
      console.error(`Error with on-demand-entries-ping: ${err.message}`)
    }
  }

  let pingerTimeout
  async function runPinger (params) {
    while (!document.hidden) {
      await ping()
      await new Promise((resolve) => {
        pingerTimeout = setTimeout(resolve, 5000)
      })
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      runPinger()
    } else {
      clearTimeout(pingerTimeout)
    }
  })

  setTimeout(() => {
    runPinger()
      .catch((err) => {
        console.log(err)
      })
  })
}
