import unfetch from '../lib/unfetch'
export function userLogin (params) {
  return unfetch({
    url: 'user/login',
    method: 'post',
    data: params
  })
}

export function platformFetchMeus (params, options) {
  return unfetch({
    url: '/user/menu',
    method: 'get',
    params,
    ...options
  })
}
