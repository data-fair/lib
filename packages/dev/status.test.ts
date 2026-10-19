/* eslint-disable no-template-curly-in-string -- ${VAR} placeholders are the dev/dev.json syntax */
import { describe, it } from 'node:test'
import { strict as assert } from 'assert'
import { containerMark, renderStatus, sessionProcesses, collectStatus, checkReadiness } from './status.js'
import type { Exec } from './exec.js'

describe('status', () => {
  it('marks containers like docker compose up --wait', () => {
    assert.equal(containerMark({ service: 'mongo', state: 'running', health: 'healthy' }).mark, '✔')
    assert.equal(containerMark({ service: 'sd', state: 'running', health: '' }).mark, '✔')
    assert.equal(containerMark({ service: 'es', state: 'running', health: 'starting' }).mark, '⠿')
    assert.equal(containerMark({ service: 'df', state: 'exited', health: '' }).color, 'red')
    assert.equal(containerMark({ service: 'agents', state: 'not started', health: '' }).color, 'dim')
    assert.deepEqual(containerMark({ service: 's3-init', state: 'exited', health: '', exitCode: 0 }), { mark: '✔', color: 'green', text: 'done' })
  })

  it('shows a stack stopped with exit code 0 as stopped, not done', () => {
    const out = renderStatus({
      containers: [{ service: 'mongo', state: 'exited', health: '', exitCode: 0 }, { service: 'nginx', state: 'exited', health: '', exitCode: 0 }],
      panes: [],
      procs: []
    }, false)
    assert.match(out, /· mongo\s+stopped/)
    assert.match(out, /· nginx\s+stopped/)
    assert.ok(!out.includes('done'))
  })

  it('renders containers, processes and the total in plain text', () => {
    const out = renderStatus({
      containers: [{ service: 'mongo', state: 'running', health: 'healthy', memory: '115MiB' }],
      panes: [],
      procs: [{ label: 'api: node --watch index.ts', rssKb: 245760 }]
    }, false)
    assert.match(out, /✔ mongo\s+healthy\s+115MiB/)
    assert.match(out, /api: node --watch index.ts\s+240M/)
    assert.match(out, /processes total\s+240M/)
    assert.ok(!out.includes('\x1b['))
  })

  it('counts only the processes of the zellij session, with their full command line', () => {
    const ps = [
      '  100     1 20000 /usr/bin/zellij --server /run/user/1000/zellij/0.45.1/portals_feat-x',
      '  101   100  3000 /bin/bash -c npx --no df-dev wait-deps && node --watch index.ts',
      '  102   101 245760 node --watch index.ts',
      '  103   100  3000 bash -c vite',
      '  104   103 1048576 /home/u/.nvm/versions/node/v24.21.0/bin/node /x/portals_feat-x/node_modules/.bin/vite --port 21001',
      '  200     1 470000 claude',
      '  201   200 120000 npm exec chrome-devtools-mcp',
      '  300     1 20000 /usr/bin/zellij --server /run/user/1000/zellij/0.45.1/portals'
    ].join('\n')
    const cwds: Record<number, string> = { 102: '/x/portals_feat-x/api', 104: '/x/portals_feat-x/ui' }
    const procs = sessionProcesses(ps, 'portals_feat-x', pid => cwds[pid], '/x/portals_feat-x')
    assert.deepEqual(procs, [
      { label: 'api: node --watch index.ts', rssKb: 245760 },
      { label: 'ui: vite --port 21001', rssKb: 1048576 }
    ])
  })

  it('finds children listed before their parent (pid wrap-around)', () => {
    const ps = [
      '   50   900 245760 node --watch index.ts',
      '  100     1 20000 /usr/bin/zellij --server /run/user/1000/zellij/0.45.1/portals',
      '  900   100  3000 bash -c node --watch index.ts'
    ].join('\n')
    assert.deepEqual(sessionProcesses(ps, 'portals', () => '/x/portals/api', '/x/portals').map(p => p.rssKb), [245760])
  })

  it('shows exited panes with their exit code', () => {
    const out = renderStatus({
      containers: [],
      panes: [{ title: 'api', exited: true, exit_status: 1 }, { title: 'ui', exited: false, exit_status: null }],
      procs: []
    }, false)
    assert.match(out, /✘ api\s+exited \(1\)/)
    assert.match(out, /✔ ui\s+running/)
  })

  it('still shows panes and processes when docker or ps fails, and says when the session is not running', () => {
    const exec: Exec = (cmd, args) => {
      if (cmd === 'docker') throw new Error('Cannot connect to the Docker daemon')
      if (args[0] === 'list-sessions') throw new Error('No active zellij sessions found.')
      if (cmd === 'ps') throw new Error('ps: command not found')
      throw new Error('unexpected ' + cmd + ' ' + args.join(' '))
    }
    const data = collectStatus('/x/portals', exec)
    assert.deepEqual(data.procs, [])
    assert.match(data.containersError ?? '', /Docker daemon/)
    assert.match(data.panesError ?? '', /npm run dev-zellij/)
    const out = renderStatus(data, false)
    assert.match(out, /containers unavailable: .*Docker daemon/)
    assert.match(out, /npm run dev-zellij/)
  })

  it('leaves out the status process itself and shortens executable paths', () => {
    const ps = [
      '  100     1 20000 /usr/bin/zellij --server /run/user/1000/zellij/0.45.1/portals',
      '  110   100 50000 node ./node_modules/.bin/df-dev status --watch',
      '  111   110  5000 ps -u 1000 -o pid=,ppid=,rss=,args=',
      '  120   100 90000 /home/u/.nvm/versions/node/v24.21.0/bin/node --watch index.ts'
    ].join('\n')
    const procs = sessionProcesses(ps, 'portals', () => '/x/portals/api', '/x/portals', 110)
    assert.deepEqual(procs.map(p => p.label), ['api: node --watch index.ts'])
  })

  it('shows the dev URL first, in full so the terminal can open them', () => {
    const out = renderStatus({ url: 'http://feat-x.localhost:28119/portals-manager/dev', containers: [], panes: [], procs: [] }, false)
    assert.equal(out.split('\n')[0], 'http://feat-x.localhost:28119/portals-manager/dev')
  })

  it('leaves out the status pane and its ps children', () => {
    const ps = [
      '  100     1 20000 /usr/bin/zellij --server /run/user/1000/zellij/0.45.1/portals',
      '  130   100 60000 node /x/portals/node_modules/.bin/df-dev status --watch --start-deps',
      '  131   130  4000 ps -u 1000 -o pid=,ppid=,rss=,args=',
      '  140   100  3500 bash ./node_modules/.bin/df-status --start-deps',
      '  141   140  2000 sleep 3',
      '  120   100 90000 node --watch index.ts'
    ].join('\n')
    assert.deepEqual(sessionProcesses(ps, 'portals', () => '/x/portals/api', '/x/portals').map(p => p.label), ['api: node --watch index.ts'])
  })

  it('flags a running pane whose readiness URL does not answer (node --watch waiting after a crash)', async () => {
    const panes = [{ title: 'api', exited: false, exit_status: null }, { title: 'ui', exited: false, exit_status: null }, { title: 'shell', exited: false, exit_status: null }]
    const config = { ports: [], panes: { api: { ready: 'http://localhost:${P}/api/ping' }, ui: { ready: 'http://localhost:${P}/' } } }
    const checked = await checkReadiness(panes, config, { P: '1' }, async url => !url.includes('api'))
    assert.deepEqual(checked.map(p => p.ready), [false, true, undefined])
    const out = renderStatus({ containers: [], panes: checked, procs: [] }, false)
    assert.match(out, /⠿ api\s+running, not ready \(http:\/\/localhost:1\/api\/ping\)/)
    assert.match(out, /✔ ui\s+running/)
  })
})
