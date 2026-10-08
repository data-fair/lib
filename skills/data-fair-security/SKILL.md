---
name: data-fair-security
description: Use when writing or reviewing code anywhere in the data-fair stack (data-fair, processings, catalogs, events, simple-directory, portals, registry, capture, and every processing-* / catalog-* plugin) that makes an outbound network request, receives a URL, host, port, file name or id from a user or from remote content, attaches credentials to a request, follows redirects or pagination links, runs a child process, or decides that a request is "internal". Gives the stack-wide security invariants — public vs private HTTP clients (SSRF), credential scoping, remote names in paths, internal trust — and a review checklist.
---

# Security invariants of the data-fair stack

## Overview

Data-fair services fetch URLs on behalf of their users all the time (remote files, thumbnails, catalogs, processings, webhooks). Anyone allowed to write a dataset, configure a catalog or a processing chooses where our servers connect — and remote content (pagination links, resource URLs, redirects, `robots.txt`) chooses too. These invariants keep that from reaching our infrastructure or leaking our credentials. They hold for every repo; a plugin is not "just a plugin", it runs inside our workers.

Network rules (egress NetworkPolicies) exist in production but are a second layer: self-hosted instances have none, and our own databases and nodes are on public addresses that a private-range filter cannot express.

## 1. Outbound HTTP: public client by default, private client for configured services

`@data-fair/lib-node` (>= 2.14.0) provides two families of clients:

| Client | Refuses non public addresses | Use it for |
|---|---|---|
| default `axios` (`@data-fair/lib-node/axios.js`), `axiosInstance`, `axiosBuilder()`, `httpAgent` / `httpsAgent` (`http-agents.js`) | **yes** (loopback, private, link-local incl. cloud metadata, CGNAT, ULA, v4-mapped…) | **every URL a user or remote content can influence**, directly or indirectly |
| `privateAxiosInstance`, `privateHttpAgent` / `privateHttpsAgent`, or `axiosBuilder({ httpAgent: privateHttpAgent, httpsAgent: privateHttpsAgent })` | no | only URLs read from the **service configuration**: `privateDirectoryUrl`, `privateEventsUrl`, `privateDataFairUrl`, `privateRegistryUrl`, private mappings… |

The check runs when the connection is created, on the exact address used: IP literals, every address a DNS name resolves to (no rebinding), every redirect hop.

Operators tune it with `SSRF_PUBLIC_IPS` (IPs/CIDRs to accept, e.g. an intranet source of a self-hosted instance) and `SSRF_PRIVATE_IPS` (public IPs to refuse, e.g. database servers). Dev environments set `SSRF_PUBLIC_IPS=127.0.0.1,::1` (all dev services are on the loopback) — in each repo's `dev/init-env.sh`. When `HTTP_PROXY` / `HTTPS_PROXY` / `ALL_PROXY` is set the protection is off (the agents connect to the proxy) and a warning is logged at startup.

Rules:

- **Choose the client by where the URL comes from, never by where it points.** A user-provided `http://data-fair:8080/...` must go through the public client and fail.
- **A missed internal call fails loudly in production only**: dev allows the loopback. After migrating a service, verify its internal calls (directory, events, registry, data-fair) on staging.
- **Rewriting a public URL to a private one** (e.g. `dataFairUrl` → `privateDataFairUrl`): match by **parsed** URL — same `origin`, path equal to the base path or under `base + '/'` — never `startsWith` / string `replace`. `https://df.example.com.evil.com`, `https://df.example.com@evil.com` and `https://df.example.com/base@evil.com/x` pass a prefix test, and a string replace can move a path segment into the authority. Rebuild the target as `privateOrigin + privateBasePath + rest-of-path + search`. Reference: `processings/worker/src/task/data-fair-url.ts`.
- **Per-request agents follow redirects.** axios hands `httpAgent`/`httpsAgent` to every hop: a request sent with the private agents must use `maxRedirects: 0`.
- **Never pass your own `httpAgent`/`httpsAgent`/`proxy`** on a user-influenced request, and never `axios.create()` from the raw `axios` package: it has none of the agents. Use `axiosBuilder(...)` from lib-node, or the client your host gives you (`context.axios` in processings).

### Clients the agents do not cover

Anything that does not go through node's `http.Agent` of lib-node escapes the check. Prefer moving the call to the lib-node client; otherwise use the helpers of `@data-fair/lib-node/ssrf.js` (same `SSRF_*` rules as the agents, but **not** disabled by a proxy env variable since these clients connect directly):

| Client | Minimal fix |
|---|---|
| global `fetch` / undici, `got`, `request`, `node-fetch` | switch to the lib-node axios client (or `context.axios`) |
| AWS SDK (`@aws-sdk/*`) | `requestHandler: new NodeHttpHandler({ httpAgent, httpsAgent })` with lib-node's public agents |
| other SDKs with a user-chosen endpoint | pass the agents if supported; else validate the endpoint (fixed provider domain, strict account-name pattern) |
| `jsonld` (remote `@context`) | pass a `documentLoader` that refuses remote URLs, or `jsonld.documentLoaders.node({ httpAgent, httpsAgent })` |
| ftp / sftp / ssh2 / raw sockets | `const ip = await resolvePublicAddress(host)` from `@data-fair/lib-node/ssrf.js` (checks every address, throws `SsrfError`), then connect **to `ip`**, not to the host (TLS `servername` = host) — resolving again could give another address. FTP passive mode: the server chooses the data-channel IP — use EPSV or check the PASV address with `resolvePublicAddress` too |
| `web-push`, or any client that only accepts an `instanceof https.Agent` (the lib-node agents are agentkeepalive agents, they fail this test and are **silently ignored**) | `new https.Agent({ keepAlive: true, lookup: publicLookup })` + `resolvePublicAddress(hostname)` before the call for IP literals. Reference: `events/api/src/push/service.ts` |
| any client with a `lookup` option (`net.connect`, `tls.connect`, undici `connect`, got `dnsLookup`) | `lookup: publicLookup` from `@data-fair/lib-node/ssrf.js`; node skips lookup for IP literals, so also pass the host through `resolvePublicAddress` when it may be a literal |
| child processes (GDAL/ogr2ogr, curl, wget, headless browsers) | never pass a user URL; force the input driver (`-if GPKG`) so a file cannot be sniffed as a VRT pointing to `/vsicurl/…` or a local path; a browser needs request interception with the same address check |
| `nodemailer` | `createTransport({ ...transport, disableFileAccess: true, disableUrlAccess: true })` when the message content is not ours |
| third-party credential configs (e.g. Google `external_account` JSON) | validate the type (`service_account`) before use: they can read local files or fetch arbitrary URLs and post the result to a chosen token URL |

## 2. Credentials go only where they belong

- Attach an API key, token or cookie only after a **parsed origin match** with the host it was issued for (same rule as above).
- **Pagination / next links / resource URLs from remote content**: re-attach credentials only if the next URL has the configured origin. Otherwise drop them or stop.
- **Redirects**: follow-redirects strips only `Authorization`, `Cookie` and `Proxy-Authorization` on a cross-host redirect. Custom headers (`x-apiKey`, `X-API-KEY`, `Apikey …` in a custom header) **survive**. Authenticated requests use `maxRedirects: 0`, or a `beforeRedirect` that deletes them when the host changes.
- Secrets travel in headers, never in query strings (`?key=`, `?apiKey=` end up in logs and referrers).

## 3. Remote names never become paths or commands

- A file name, title, slug, id or listing entry coming from a remote server **or from a user** is never joined into a filesystem path as is: `path.basename()` (or a whitelist like `[a-zA-Z0-9._-]`), then check the resolved path stays inside the target directory. Workers are multi-tenant: a traversal writes into another run's files.
- Child processes: `execFile(cmd, [args])`, never `exec` with an interpolated string.
- Bound what remote servers can make us do: byte caps on downloads (`maxContentLength` / counted streams), page-count limits on pagination loops, timeouts other than `0`, zip-bomb limits.

## 4. "Internal" is never decided by the network alone

- `reqIsInternal(req)` (lib-express) is only "no `X-Forwarded-Host` header": every request made from inside the cluster — including one forged through a user-provided URL — is "internal". Never grant a privilege on it alone: use `assertReqInternalSecret(req, secret)` with a per-integration secret.
- Do not add endpoints that are unauthenticated on the assumption that only other services reach them.

## Review checklist

- [ ] Every outbound request: where does its URL come from? User / remote content → public client. Configuration → private client.
- [ ] No raw `axios`, `axios.create`, `fetch`, `got`, `request` on a user-influenced URL; no custom agent or proxy option.
- [ ] Non-HTTP clients and SDKs with a user-chosen host have the address check (table above).
- [ ] URL matching for credentials or private rewriting is by parsed origin + path boundary.
- [ ] Private-agent requests and credentialed requests don't follow redirects.
- [ ] Credentials are not re-sent to hosts named by remote content.
- [ ] No remote or user-provided name joined into a path, no `exec` with interpolation.
- [ ] Downloads and pagination loops are bounded.
- [ ] No privilege granted on `reqIsInternal` alone.
- [ ] Dev env (`dev/init-env.sh`) sets `SSRF_PUBLIC_IPS=127.0.0.1,::1` if the repo uses lib-node >= 2.14.
