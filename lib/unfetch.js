import axios from 'axios'
import qs from 'qs'

const service = axios.create({
  baseURL: process.env.BASE_URL || '/api',
  timeout: 50000,
  transformRequest: [function (data) {
    return qs.stringify(data)
  }]
})

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

  if (code === 0) {
    response.data = data
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
  return Promise.reject(error)
})

export default service