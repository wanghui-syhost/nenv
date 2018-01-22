import { mapState } from 'vuex'
export default {
  name: 'Nenv',
  data () {
    return {
      styleEl: null,
      titleEl: document.getElementsByTagName('title')[0]
    }
  },
  created () {
    const head = document.getElementsByTagName('head')[0]
    const styleEl = document.createElement('style')
    styleEl.type = 'text/css'
    styleEl.className += 'nenv-theme'
    head.appendChild(styleEl)
    this.styleEl = styleEl
  },
  computed: {
    ...mapState('platform', {
      title: state => state.title,
      themePalette: state => state.theme.palette,
      menus: state => state.menus
    })
  },
  watch: {
    title (val) {
      this.titleEl.innerHTML = val
    },
    $route (to, from) {

    }
  },
  render (h, props) {
    return h('div', {
      domProps: {
        id: 'nenv_root'
      }
    }, [h('router-view')])
  }
}
