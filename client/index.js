import Vue from 'vue'
import Router from 'vue-router'
import Vuex, { Store } from 'vuex'
import ElementUI from 'element-ui'

import 'element-ui/lib/theme-chalk/index.css'
import 'normalize.css/normalize.css'
import '../styles/nenv.scss'

import unfetch from '../lib/unfetch'

import * as filters from '../lib/filters'

import App from './App'

import { userLogin, platformFetchMeus } from './api'

window.unfetch = unfetch

// 全局注册filters
// Filters
Object.keys(filters).forEach(x => Vue.filter(x, filters[x]))

Vue.prototype.$unfetch = unfetch

Vue.use(Router)
Vue.use(Vuex)
Vue.use(ElementUI, {
  size: 'medium'
})

const nenv = {
  raw: {},
  layouts: {},
  stores: {},
  routes: []
}

// 声明空路由
const router = new Router({
  routes: [],
  linkActiveClass: 'active'
})
nenv.raw.router = router

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
        menus: JSON.parse(localStorage.getItem('platform.menu') || '[]')
      },
      mutations: {
        UPDATE_MENUS: (state, menus) => {
          state.menus = menus
          localStorage.setItem('platform.menu', JSON.stringify(menus))
        }
      },
      actions: {
        async fetchMeus ({ commit, state }, { token } = {}) {
          const menus = (await platformFetchMeus({}, { headers: {
            Authorization: token
          }})).data
          commit('UPDATE_MENUS', menus)
        }
      }
    },
    // 用户
    user: {
      namespaced: true,
      state: {
        token: localStorage.getItem('user.token'),
        profile: JSON.parse(localStorage.getItem('user.profile') || '{}')
      },
      mutations: {
        'UPDATE_TOKEN': (state, token) => {
          localStorage.setItem('user.token', token)
          state.token = token
        },
        'UPDATE_PROFILE': (state, profile) => {
          localStorage.setItem('user.profile', JSON.stringify(profile))
          state.profile = profile
        }
      },
      actions: {
        async userLogin ({commit, dispatch}, credential) {
          const { token, user } = (await userLogin(credential)).data
          await commit('UPDATE_TOKEN', token)
          await commit('UPDATE_PROFILE', user)
        }
      }
    }
  },
  actions: {
    async login ({ commit, dispatch, state }, credential) {
      await dispatch('user/userLogin', credential)
      await dispatch('platform/fetchMeus', { token: state.user.token })
    }
  }
})
nenv.raw.store = store

export const loader = (options = {}) => {
  if (typeof options === 'function') {
    options = options()
  }

  console.log(options)

  let { layout, store, router, path, isRoot } = options

  // 如果有store 则注册store
  if (store) {
    if (store.namespaced !== false) {
      store.namespaced = true
    }
    nenv.raw.store.registerModule(store.name, store)
    nenv.stores[store.name] = store
  }

  // 如果是布局 则注册布局
  if (layout) {
    nenv.layouts[layout.name] = layout
  }

  // 如果options的render是函数，则认为options 是路由文件
  if (typeof options.render === 'function') {
    // path = options.path
    router = options
  }

  if (router) {
    // 如果router的render属性是函数， 则认为是vue组件
    if (typeof router.render === 'function') {
      // 如果申明为跟路由
      if (isRoot) {
        router = {
          path,
          component: router
        }
      } else {
        router = {
          path,
          component: getLayout(),
          children: [{
            path,
            component: router
          }]
        }
      }
    }
    // 此处是路由数组
    if (!Array.isArray(router)) {
      router = [router]
    }

    recursivelyProcessRoute(router)

    console.log(router)
    nenv.routes = nenv.routes.concat(router)
    nenv.raw.router.addRoutes(router)
  }
}

function recursivelyProcessRoute (routes, { parent = '' } = {}) {
  routes.forEach(router => {
    router.meta = router.meta || {}
    router.meta['$parent'] = parent

    //
    if (router.children) {
      // 如果有子路由但没有声明 组件,则自动注入 组件
      if (!router.component) {
        router.component = getLayout()
      }
      recursivelyProcessRoute(router.children,
        { parent: `${parent}${router.path}` }
      )
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
    name = Object.keys(layouts)[0]
    return getLayout(name)
  }
}

export const mount = () => {
  const { raw } = nenv
  raw.router = router
  raw.store = store
  raw.root = new Vue({
    el: '#app',
    router,
    store,
    render: h => h(App)
  })
}

nenv.loader = loader

window.nenv = nenv
export default async () => {
  mount()
}
