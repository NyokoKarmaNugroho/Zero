import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  vus: 1,
  duration: '10s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
}

const baseURL = __ENV.BASE_URL || 'http://localhost:8080'

export default function () {
  const res = http.get(`${baseURL}/health`)
  check(res, {
    'health status 200': (r) => r.status === 200,
    'health body ok': (r) => {
      try {
        const body = JSON.parse(r.body)
        return body.status === 'ok' && body.service === 'zero-gateway'
      } catch {
        return false
      }
    },
  })
  sleep(1)
}
