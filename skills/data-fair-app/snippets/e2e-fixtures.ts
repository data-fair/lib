// tests/e2e/fixtures.ts — shared base of the e2e suite: console guard, session and site
// mocks, injection of window.APPLICATION. Specs import `test` and `expect` from here,
// never from '@playwright/test', so that the console guard applies to every test.
// App-specific mocks (dataset routes, configurations) go below this base, in the same file.
import { test as base, expect, type Page } from '@playwright/test'

export const test = base.extend<{ consoleGuard: void, expectedConsole: string[] }>({
  // messages a test provokes on purpose (a failing request), named one by one:
  //   test.use({ expectedConsole: ['status of 500'] })
  // substrings, not RegExp: fixture options are serialized and a RegExp would not survive
  expectedConsole: [[], { option: true }],
  consoleGuard: [async ({ page, expectedConsole }, use) => {
    const messages: string[] = []
    page.on('console', (msg) => {
      if (msg.type() !== 'error' && msg.type() !== 'warning') return
      if (expectedConsole.some(text => msg.text().includes(text))) return
      messages.push(`[${msg.type()}] ${msg.text()}`)
    })
    page.on('pageerror', (err) => {
      // harness artifact: Vite serves index.html raw, the inline `window.APPLICATION=%APPLICATION%`
      // fails to parse and setupMocks has already defined window.APPLICATION
      if (err.message === "Unexpected token '%'") return
      messages.push(`[pageerror] ${err.message}`)
    })
    await use()
    expect(messages, 'console must stay clean').toEqual([])
  }, { auto: true }]
})
export { expect }

export const mockSite = {
  _id: 'test-site',
  type: 'site',
  name: 'Test site',
  url: 'http://mock.test',
  owner: { type: 'organization', id: 'test-org', department: '' },
  settings: { defaultLocale: 'fr-FR' },
  theme: { primaryColor: '#1e88e5' }
}

export function buildApplication (configuration: Record<string, unknown>): Record<string, unknown> {
  return {
    id: 'test-app',
    slug: 'test-app',
    title: 'Test app',
    href: 'http://mock.test/data-fair/api/v1/applications/test-app',
    exposedUrl: 'http://mock.test/data-fair/app/test-app',
    apiUrl: 'http://mock.test/data-fair/api/v1',
    wsUrl: 'ws://mock.test/data-fair',
    owner: { type: 'organization', id: 'test-org', department: '' },
    configuration
  }
}

export async function setupMocks (page: Page, application: Record<string, unknown>): Promise<void> {
  await page.route('**/simple-directory/**', (route) => {
    const url = route.request().url()
    // executable JS, not JSON: otherwise the global stays empty and the session silently
    // falls back to the deprecated refreshSiteInfo fetch
    if (url.endsWith('/_public.js')) {
      return route.fulfill({ contentType: 'application/javascript', body: `window.__PUBLIC_SITE_INFO = ${JSON.stringify(mockSite)}` })
    }
    if (url.endsWith('.css')) return route.fulfill({ contentType: 'text/css', body: '' })
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(mockSite) })
  })

  // defined before any script of the page; `writable: false` makes the inline assignment
  // of index.html unable to overwrite it
  await page.addInitScript((app) => {
    Object.defineProperty(window, 'APPLICATION', { configurable: true, enumerable: true, writable: false, value: app })
  }, application)
}

export async function gotoApp (page: Page, query = ''): Promise<void> {
  await page.goto('/app/' + query)
  await page.locator('#app .v-main').waitFor()
}
