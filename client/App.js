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
      // console.log(to)
      const { menus } = this
      function processMenu (menus, pathArray, route) {
        for (let menu of menus) {
          let menuPathArray = menu.linkUrl.substr(1).split('/')
          if (menuPathArray.join('/') === pathArray.join('/')) {
            route.meta.$name = menu.menuName
            return
          } else if (true) {

          }
        }
      }
      [to, from].forEach((r) => {
        if (!r.meta.$name) {
          processMenu(menus, r.fullPath.substr(1).split('/'), r)
        }
      })
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
