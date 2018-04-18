import 'es6-promise'
import Vue from 'vue'
import Router from 'vue-router'
import Vuex, { Store } from 'vuex'
import ElementUI from 'element-ui'
import Nprogress from 'nprogress'

import 'element-ui/lib/theme-chalk/index.css'
import 'normalize.css/normalize.css'
import '../styles/nenv.scss'

import PageLoader from '../lib/page-loader'
import unfetch from '../lib/unfetch'

import * as filters from '../lib/filters'
import router from '../lib/router'

import logo from '../lib/logo'

import { StorageBuilder } from '../lib/storage'

import App from './App'

import '../lib/i18n'

import { userLogin, userLogout, platformFetchMenus } from './api'
// import utils from './utils'

window.unfetch = unfetch

// 全局注册filters
Object.keys(filters).forEach(x => Vue.filter(x, filters[x]))

Vue.prototype.$unfetch = unfetch
const bus = new Vue()
Vue.prototype.$bus = bus

Vue.use(Router)
Vue.use(Vuex)

ElementUI.Form.props.labelWidth = {
  type: String,
  default: '80px'
}

ElementUI.Form.props.labelPosition = {
  type: String,
  default: 'left'
}

Vue.use(ElementUI, {
  size: 'nenv'
})

const buildId = ''
const assetPrefix = ''
const pageLoader = new PageLoader(buildId, assetPrefix)

window.Vue = Vue
window.__NENV_REGISTER_PAGE = pageLoader.registerPage.bind(pageLoader)

const nenv = {
  version: process.env.VERSION,
  project: process.env.project || {},
  bus,
  raw: {},
  layouts: {},
  stores: {},
  flatRoutes: [],
  routes: [],
  pageLoader: pageLoader,
  i18n: null,
  lib: {
    StorageBuilder
  }
}
Vue.prototype.project = nenv.project

router.beforeEach((to, from, next) => {
  Nprogress.start()
  next()
})

router.afterEach(() => {
  Nprogress.done()
})

nenv.raw.router = router

const platformStorage = (new StorageBuilder('platform', {
  menus: Array,
  layout: String
})).storage

// 声明空store
const store = new Store({
  modules: {
    // 应用
    app: {
      namespaced: true,
      state: {
        theme: 'default'
      }
    },
    // 平台
    platform: {
      namespaced: true,
      state: {
        title: document.getElementsByTagName('title')[0].innerHTML,
        menus: platformStorage.menus,
        isHomeMenuShow: true,
        theme: {
          palette: {
            primaryColor: 'blue'
          },
          classes: {

          }
        },
        layouts: [],
        layout: platformStorage.layout,
        acitveMenu: {},
        activeTopMenu: {}
      },
      mutations: {
        ADD_LAYOUT: (state, layout) => {
          state.layouts.push(layout)
        },
        CHANGE_LAYOUT: (state, layout) => {
          platformStorage.layout = layout
        },
        UPDATE_TITLE: (state, title) => {
          state.title = title
        },
        UPDATE_MENUS: (state, menus) => {
          state.menus = menus
          platformStorage.menus = menus
        },
        UPDATE_ACTIVE_TOP_MENU: (state, menu) => {
          state.activeTopMenu = menu
        },
        UPDATE_ACTIVE_MENU: (state, menu) => {
          state.acitveMenu = menu
        },
        UPDATE_HOME_MENU: (state, isShow) => {
          state.isHomeMenuShow = isShow
        }
      },
      actions: {
        async fetchMenus ({ commit, state }, { token } = {}) {
          const menus = (await platformFetchMenus({}, { headers: {
            Authorization: token
          }})).data

          commit('UPDATE_MENUS', menus)
        },
        async enableHomeMenu ({ commit }, flag) {
          commit('UPDATE_HOME_MENU', flag)
        },
        async changeTitle ({ commit, state }, title) {
          commit('UPDATE_TITLE', title)
        },
        async changeActiveMenu ({ commit, state }, menu) {
          commit('UPDATE_ACTIVE_MENU', menu || {})
        },
        async changeActiveTopMenu ({ commit, state }, menu) {
          commit('UPDATE_ACTIVE_TOP_MENU', menu || {})
        },
        async changePlatformLayout ({ commit, state }, layout) {
          commit('CHANGE_LAYOUT', layout)
        },
        async theming ({ commit, state }, { classes, palette } = {}) {

        },
        async logout ({ commit, state }) {
          platformStorage.$clear(true)
          // commit('DELETE_MENUS')
        }
      },
      getters: {
        menus (state) {
          return state.isHomeMenuShow ? [{
            linkType: '1',
            linkUrl: '/home',
            menuName: '首页'
          }].concat(state.menus) : state.menus
        }
      }
    },
    // 用户
    user: {
      namespaced: true,
      state: {
        token: localStorage.getItem('user.token'),
        home: localStorage.getItem('user.home'),
        profile: JSON.parse(localStorage.getItem('user.profile') || '{}')
      },
      mutations: {
        'DELETE_TOKEN': (state) => {
          // localStorage
          localStorage.removeItem('user.token')
          state.token = null
        },
        'UPDATE_TOKEN': (state, token) => {
          localStorage.setItem('user.token', token)
          state.token = token
        },
        'UPDATE_PROFILE': (state, profile) => {
          localStorage.setItem('user.profile', JSON.stringify(profile))
          state.profile = profile
        },
        'UPDATE_HOME': (state, home) => {
          localStorage.setItem('user.home', home)
          state.home = home
        }
      },
      actions: {
        async userLogin ({commit, dispatch}, credential) {
          const {token, user, homePath} = (await userLogin(credential)).data
          await commit('UPDATE_TOKEN', token)
          await commit('UPDATE_PROFILE', user)
          await commit('UPDATE_HOME', homePath)
        },
        async logout ({ commit, dispatch }) {
          await userLogout()
          commit('DELETE_TOKEN')
        }
      }
    }
  },
  actions: {
    async login ({ commit, dispatch, state }, credential) {
      await dispatch('user/userLogin', credential)
      await dispatch('platform/fetchMenus', { token: state.user.token })
    },
    async logout ({ commit, dispatch, state }) {
      await dispatch('user/logout')
      await dispatch('platform/logout')
      nenv.bus.$emit('on-logout')
    }
  }
})
nenv.raw.store = store

export const loader = (options = {}) => {
  if (typeof options === 'function') {
    options = options()
  }

  // console.log(options)

  // routerDepth 用来表明页面的路由深度
  let { layout, store, i18n, router, path, routerDepth } = options

  // 如果有store 则注册store
  if (store) {
    if (store.namespaced !== false) {
      store.namespaced = true
    }
    nenv.raw.store.registerModule(store.name, store)
    nenv.stores[store.name] = store
  }

  // 如果有布局 则注册布局
  if (layout) {
    // 声明组件是布局文件
    nenv.raw.store.commit('platform/ADD_LAYOUT', {
      label: layout.label,
      name: layout.name
    })
    nenv.layouts[layout.name] = layout
  }

  // 如果有翻译器
  if (i18n) {
    nenv.i18n = i18n
  }

  // 如果options的render是函数，则认为options 是路由文件
  if (typeof options.render === 'function') {
    // path = options.path
    router = options
  }

  // 如果有路由
  if (router) {
    // 如果router的render属性是函数， 则认为是vue组件
    if (typeof router.render === 'function') {
      // 如果申明为跟路由
      if (routerDepth === 0) {
        router = {
          path,
          component: router
        }
      } else {
        router = {
          path,
          children: [{
            path,
            component: router
          }]
        }
      }
    }
    // 此处应该是路由数组
    if (!Array.isArray(router)) {
      router = [router]
    }

    recursivelyProcessRoute(router)
    // debugger
    // window.__NENV_REGISTER_PAGE(router[0].path, router)
    // console.log(router)
    nenv.routes = nenv.routes.concat(router)
    // nenv.flatRoutes = nenv.routes
    nenv.raw.router.addRoutes(router)
  }
}

function recursivelyProcessRoute (routes, { parent = '' } = {}) {
  routes.forEach(router => {
    router.meta = router.meta || {}
    router.meta['$parent'] = parent

    // 如果有子路由
    if (router.children) {
      // 如果有子路由但没有声明不觉组件,则自动注入布局组件
      if (!router.component) {
        router.component = getLayout()
      } else {
        nenv.flatRoutes.push({ path: router.path, component: router.component })
      }

      recursivelyProcessRoute(router.children,
        { parent: `${parent}${router.path}` }
      )
    } else {
      nenv.flatRoutes.push({ path: router.path, component: router.component })
    }
  })
}

export const getLayout = (name) => {
  const { layouts } = nenv
  if (Object.keys(layouts) === 0) {
    throw new Error('there is no layout loaded')
  } else if (name) {
    if (layouts[name]) {
      return layouts[name]
    } else {
      throw new Error(`loaded layouts has no layout with name:${name}`)
    }
  } else {
    name = platformStorage.layout || Object.keys(layouts)[0]
    return getLayout(name)
  }
}

export const mount = () => {
  const { raw, i18n } = nenv
  raw.router = router
  raw.store = store
  raw.root = new Vue({
    el: '#nenv',
    router,
    store,
    i18n,
    render: h => h(App)
  })
}

nenv.platformStorage = platformStorage

nenv.loader = loader

window.nenv = nenv
nenv.bootstrap = mount
export default async () => {
  console.log(`
Version: ${nenv.version}
Have a great day! 📣🐢
  `)
  console.log(logo)
}
