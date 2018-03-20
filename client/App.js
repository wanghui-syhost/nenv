import { mapState, mapActions, mapGetters } from 'vuex'
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
    this.activeMenus()
    this.checkPermission()
  },
  computed: {
    ...mapState('platform', {
      title: state => state.title,
      themePalette: state => state.theme.palette
    }),
    ...mapState('user', {
      token: state => state.token
    }),
    ...mapGetters('platform', ['menus'])
  },
  methods: {
    checkPermission () {
      const self = this
      const { token } = self
      if (!token) {
        return self.$router.push('/login')
      }
    },
    activeMenus () {
      const self = this
      const { menus } = self
      const route = this.$route
      const fullPath = route.fullPath.replace(/\?.*/, '')
      // 查找fullPath
      function findX (fullPath, menus) {
        function find (menus, parent) {
          for (const menu of menus) {
            menu.crumbName = parent ? `${parent.menuName}/${menu.menuName}` : menu.menuName
            menu.parents = menu.parents || []
            if (parent && (menu.parents.indexOf(parent) < 0)) {
              menu.parents.push(parent)
            }
            if (menu.linkUrl === fullPath) {
              route.meta.$crumbName = menu.crumbName
              route.meta.$name = menu.menuName
              self.changeActiveMenu(menu)
              return menu
            } else if (menu.childrens && find(menu.childrens, menu)) {
              return menu
            }
          }
        }
        const result = find(menus)
        const shortedPath = fullPath.replace(/\/[^/]*$/, '')
        return result || (shortedPath ? findX(shortedPath, menus) : '')
      }

      self.changeActiveTopMenu(findX(fullPath, menus))
    },
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
      this.activeMenus()
      this.checkPermission()
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
