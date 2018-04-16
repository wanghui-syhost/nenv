import Vue from 'vue'
import unfetch from './unfetch'

Vue.mixin({
  data () {
    return {
      ntd: {}
    }
  }
})

function i18n (code, url) {
  const { ntd, $set } = this
  const array = code.split('.')
  try {
    let len = array.length
    return [ntd, ...array].reduce(function (a, b) {
      if (len-- > 1 && a[b] === undefined) {
        $set(a, b, {})
        unfetch.get(url || i18n.url, {
          params: { CODE: array[0] }
        }).then(({ data }) => {
          data.forEach(item => {
            $set(a[b], item.VALUE, item.NAME)
          })
        })
      }
      return a[b]
    })
  } catch (e) {
    console.log(e)
  }
}

i18n.url = '/dictionary/code'

Vue.prototype.$nt = i18n
