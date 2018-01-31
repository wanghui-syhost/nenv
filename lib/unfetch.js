import axios from 'axios'
import qs from 'qs'

const win = window

const service = axios.create({
  baseURL: process.env.BASE_URL || '/api',
  timeout: 50000,
  transformRequest: [function (data) {
    return qs.stringify(data)
  }]
})

service.download = function (params) {
  // window
}

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

service.interceptors.response.use(
response => {
  const { code, data, msg } = response.data
  const { headers } = response.config
  if (code === 0) {
    service.successed = true
    response.data = data
  } else if (code === 2) { // token失效
    // 如果有token失效的回调 并且头部区域没有Nv-Login: false标志, 则回调改函数
    if (service.onTokenExpired && !headers['Nv-Login-Disabled']) {
      return service.onTokenExpired(function () {
        win.nenv.raw.router.push(process.env.LOGIN_PATH || '/login')
        return Promise.reject(response.data)
      })
    } else {
      win.nenv.raw.router.push(process.env.LOGIN_PATH || '/login')
      return Promise.reject(response.data)
    }
  } else if (code === 3) {
    console.log('后台抛了异常')
  } else {
    if (response.data) {
      return Promise.reject(response.data)
    } else {
      return Promise.reject(response)
    }
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
export default service
