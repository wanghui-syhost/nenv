import Router from 'vue-router'

const router = new Router({
  routes: [],
  linkActiveClass: 'active'
})

router.beforeEach((to, from, next) => {
  next()
})

export default router
