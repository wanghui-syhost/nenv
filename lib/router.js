import Router from 'vue-router'

const router = new Router({
  routes: [{
    path: '/',
    redirect: '/home'
  }],
  linkActiveClass: 'active'
})

router.beforeEach((to, from, next) => {
  next()
})

export default router
