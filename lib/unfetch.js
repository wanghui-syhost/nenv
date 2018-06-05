import axios from 'axios'
import qs from 'qs'
import { Message } from 'element-ui'
const win = window

const service = axios.create({
  baseURL: process.env.BASE_URL || '/api',
  timeout: 50000,
  transformRequest: [function (data) {
    return qs.stringify(data)
  }]
})

service.onTokenExpired = function (callback) {
  return callback()
}

service.interceptors.request.use(
config => {
  const token = localStorage.getItem('user.token')
  if (token) {
    config.headers['Authorization'] = token
  }
  return config
},
error => {
  return Promise.reject(error)
})

service.ssoLogin = function () {
  localStorage.setItem('unfetch.redirect', window.location.href)
  let redirectUrl = encodeURIComponent(process.env.SSO_CALLBACK_URL)
  window.location.href = `${process.env.SSO_URL}?redirect=${redirectUrl}`
}

service.interceptors.response.use(
response => {
  const { code, data, msg } = response.data
  const { headers, responseType } = response.config

  if (responseType === 'text') {
  } else if (code === 0) {
    service.successed = true
    response.data = data
  } else if (code === 2) { // token失效
    // 如果有token失效的回调 并且头部区域没有Nv-Login: false标志, 则回调改函数
    if (service.onTokenExpired && !headers['Nv-Login-Disabled']) {
      return service.onTokenExpired(function () {
        if (process.env.SSO_URL) {
          service.ssoLogin()
        } else {
          win.nenv.raw.router.push(process.env.LOGIN_PATH || '/login')
        }
        return Promise.reject(response.data)
      })
    } else {
      if (process.env.SSO_URL) {
        return service.ssoLogin()
      }
      win.nenv.raw.router.push(process.env.LOGIN_PATH || '/login')
      return Promise.reject(response.data)
    }
  } else if (code === 3) {
    /* eslint-disable no-new */
    new Message({
      type: 'error',
      message: msg
    })
    return Promise.reject(response.data)
  } else {
    return Promise.reject(response.data || response)
  }

  response.rawData = {
    code,
    data,
    msg
  }
  return response
},
error => {
  console.log(error)
  return Promise.reject(error)
})

service.open = function (url, opts = {}) {
  const { params = {}, options = {} } = opts

  Object.keys(params).map((key) => {
    if (!params[key]) {
      delete params[key]
    }
  })

  // 如果不是http 或者 https开头 则不注入/api 前缀
  if (!(/https?:\/\//.exec(url))) {
    if (options.prefix) {
      url = (process.env.BASE_URL || '/api') + `/${url}`
    }

    // 如果未禁止token, 则注入token
    if (options.token) {
      params.Authorization = localStorage.getItem('user.token')
    }
  }

  Object.keys(params).map(key => {
    if (params[key] === undefined || params[key] === null) {
      delete params[key]
    }
  })

  url = `${url}?${qs.stringify(params)}`

  window.open(url)
}

service.download = function (url, opts = { }) {
  opts.options = opts.options
  opts.options = Object.assign({}, { token: true, prefix: true }, opts.options)
  service.open(url, opts)
}

export default service
