import { mapState, mapActions, mapGetters } from 'vuex'
import generateColors from '../lib/color'
export default {
  name: 'Nenv',
  data () {
    return {
      styleEl: null,
      originalStyle: '',
      colors: {
        primary: '#409eff'
      },
      inited: false
    }
  },
  created () {
    const head = document.getElementsByTagName('head')[0]
    const styleEl = document.createElement('style')
    styleEl.type = 'text/css'
    styleEl.className += 'nenv-theme'
    head.appendChild(styleEl)
    this.styleEl = styleEl
    this.getIndexStyle()
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
        return self.$router.push(process.env.LOGIN_PATH || '/login')
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
    getStyleTemplate (data) {
      const colorMap = {
        '#3a8ee6': 'shade-1',
        '#409eff': 'primary',
        '#53a8ff': 'light-1',
        '#66b1ff': 'light-2',
        '#79bbff': 'light-3',
        '#8cc5ff': 'light-4',
        '#a0cfff': 'light-5',
        '#b3d8ff': 'light-6',
        '#c6e2ff': 'light-7',
        '#d9ecff': 'light-8',
        '#ecf5ff': 'light-9'
      }
      Object.keys(colorMap).forEach(key => {
        const value = colorMap[key]
        data = data.replace(new RegExp(key, 'ig'), value)
      })
      return data
    },
    getIndexStyle () {
      const self = this
      window.unfetch({
        method: 'GET',
        baseURL: '/',
        url: '/static/theme-nenv/index.css',
        responseType: 'text'
      }).then(({data}) => {
        self.originalStyle = self.getStyleTemplate(data)
        self.colors.primary = self.themePalette.primaryColor
        self.writeNewStyle()
        self.$nextTick(() => {
          setTimeout(() => {
            self.inited = true
          }, 100)
        })
      }).catch(e => {
        console.log(e)
      })
    },
    writeNewStyle () {
      let cssText = this.originalStyle
      this.colors = Object.assign({}, this.colors, generateColors(this.colors.primary))
      Object.keys(this.colors).forEach(key => {
        cssText = cssText.replace(new RegExp('(:|\\s+)' + key, 'g'), '$1' + this.colors[key])
      })
      this.styleEl.innerText = cssText
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
    },
    'themePalette.primaryColor' (val) {
      this.colors.primary = val
      this.writeNewStyle()
    }
  },
  render (h, props) {
    return h('div', {
      domProps: {
        id: 'nenv_root'
      },
      style: { opacity: this.inited ? '' : 0 }
    }, [h('router-view')])
  }
}
