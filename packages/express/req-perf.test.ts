import { describe, it } from 'node:test'
import { strict as assert } from 'assert'
import { EventEmitter } from 'node:events'
import { register } from 'prom-client'
import { reqPerfWrap, reqPerfRouteName, reqPerfStep } from './req-perf.js'

const mockReq = (): any => ({ method: 'GET', url: '/test' })

describe('reqPerf', () => {
  it('should record finish and total steps when the response finishes', async () => {
    const req = mockReq()
    const res = new EventEmitter() as any
    reqPerfWrap(req, res)
    reqPerfRouteName(req, '/test-route')
    res.emit('finish')

    const metric = await register.getSingleMetric('df_req_step_seconds')?.get()
    const values = metric?.values.filter((v: any) => v.labels.routeName === '/test-route' && v.metricName === 'df_req_step_seconds_count')
    assert.ok(values?.find(v => v.labels.step === 'finish' && v.value === 1), 'finish step should be observed')
    assert.ok(values?.find(v => v.labels.step === 'total' && v.value === 1), 'total step should be observed')
  })

  it('should record intermediate steps', async () => {
    const req = mockReq()
    const res = new EventEmitter() as any
    reqPerfWrap(req, res)
    reqPerfRouteName(req, '/test-route2')
    reqPerfStep(req, 'step1')

    const metric = await register.getSingleMetric('df_req_step_seconds')?.get()
    const values = metric?.values.filter((v: any) => v.labels.routeName === '/test-route2' && v.metricName === 'df_req_step_seconds_count')
    assert.ok(values?.find(v => v.labels.step === 'step1' && v.value === 1), 'step1 should be observed')
  })
})
