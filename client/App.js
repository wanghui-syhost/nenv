import { mapState, mapActions } from 'vuex'
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
  methods: {
    ...mapActions('platform', [
      'changeActiveMenu',
      'changeActiveTopMenu'
    ])
  },
  watch: {
    title (val) {
      this.titleEl.innerHTML = val
    },
    $route (route) {
      const self = this
      const { menus } = self
      const fullPath = route.fullPath
      function find (menus) {
        for (const menu of menus) {
          if (menu.linkUrl === fullPath) {
            route.meta.$name = menu.menuName
            self.changeActiveMenu(menu)
            return menu
          } else if (menu.childrens && find(menu.childrens)) {
            return menu
          }
        }
      }

      self.changeActiveTopMenu(find(menus))
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
