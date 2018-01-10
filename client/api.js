import unfetch from '../lib/unfetch'
export function userLogin (params) {
  return unfetch({
    url: 'user/login',
    method: 'post',
    data: params
  })
}

export function userLogout () {
  return unfetch({
    url: '/user/logout',
    method: 'post'
  })
}

export function platformFetchMenus (params, options) {
  return unfetch({
    url: '/user/menu',
    method: 'get',
    params,
    ...options
  })
}
