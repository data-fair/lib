# Dev nginx template

`dev/resources/nginx.conf.template`, mounted by the compose `nginx` service (`nginx:1.29.4-alpine`, host network)
at `/etc/nginx/templates/default.conf.template`; the image entrypoint substitutes the env vars and includes
the result in the `http` block. One shape in every repo: the shared head below **verbatim** (same comments, same
order), then the repo's `server` blocks. Every `${VAR}` the template uses must be in the nginx service
`environment` of the compose, or nginx refuses to start.

It mirrors production minus two things: no shared proxy cache and no gzip in dev (a cache keeps what must not
be cached while developing).

## Shared head

```nginx
# Dev reverse proxy of the data-fair stack. This head is identical in every service repo
# (data-fair-service skill, references/nginx.md) and mirrors the production ingress-nginx config,
# minus the shared cache and gzip. The nginx image entrypoint substitutes the env vars and
# includes the result in the http block.

# websocket support (realtime channels, Vite HMR): upgrade only the requests that ask for it
map $http_upgrade $connection_upgrade {
  default upgrade;
  '' close;
}
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection $connection_upgrade;

# Transmit host, protocol and user ip, we use it for routing, rate limiting, etc.
proxy_set_header Host $http_host;
proxy_set_header X-Forwarded-Host $http_host;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-For $remote_addr;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Client-IP $remote_addr;
# the relay secret proves a forwarded client IP to the ingress; services never see it
proxy_set_header X-Trusted-Forwarder "";
proxy_set_header X-Forwarded-Path $request_uri;
# Headers data-fair uses for better private caching
proxy_set_header X-Private-If-Modified-Since $http_if_modified_since;
proxy_set_header X-Private-If-None-Match $http_if_none_match;
# range requests support (pmtiles)
proxy_set_header Range $http_range;

# accept some occasional long queries
proxy_read_timeout 600s;
# body size limits are implemented by services themselves
client_max_body_size 0;
# direct streaming of uploads
proxy_request_buffering off;
# direct streaming of downloads, enabled on-demand by services using x-accel-buffering header
proxy_buffering off;
# allow large response headers (setCookies with large session token)
proxy_buffer_size 32k;
proxy_buffers 4 32k;

# No server or location below sets proxy_set_header: it would drop every header above.
```

## Server block

`listen ${NGINX_PORT}; server_name ${DEV_HOST};`, then one trailing-slash redirect listing every service prefix
the server routes (prod does it in its server-snippet and in portals-ingress-manager):

```nginx
rewrite ^(/catalogs|/simple-directory|/data-fair|/events|/agents|/registry)$ $1/ redirect;
```

`location = /` redirects to the repo's UI. Route only the services the repo's compose runs.

## The 3 location shapes

1. **Prefix kept** (services built with `createSiteMiddleware`): simple-directory, events, catalogs, processings,
   registry, agents, portals-manager, openapi-viewer (prefixOptional, staging3 and portal hosts keep the prefix).
   No URI on `proxy_pass`, so the encoded URI goes through as-is (`%2F` in registry artefact ids).
   ```nginx
   location /events/ {
     proxy_pass http://localhost:${EVENTS_PORT};
   }
   ```
2. **Prefix stripped**: data-fair's API, like prod (`/data-fair/(.*)` with `rewrite-target: /$1`).
   ```nginx
   location /data-fair/ {
     rewrite ^/data-fair/(.*) /$1 break;
     proxy_pass http://localhost:${DF_PORT};
   }
   ```
3. **The repo's own service**: API and ui-config to the API server, the rest to the Vite dev server with a long
   timeout for the HMR websocket (the only place the 600 s timeout is raised).
   ```nginx
   location = /catalogs/ {
     return 302 /catalogs/dev;
   }
   location /catalogs/api/ {
     proxy_pass http://localhost:${DEV_API_PORT};
   }
   location ~ /catalogs/(.*)-ui-config.js {
     proxy_pass http://localhost:${DEV_API_PORT};
   }
   location /catalogs/ {
     proxy_read_timeout 86400s;
     proxy_pass http://localhost:${DEV_UI_PORT};
   }
   ```

Never `proxy_set_header` in a server or location: nginx would drop every header inherited from the head.

## Per-repo deviations

- **data-fair**
  - Keeps a shared cache between the head and its servers (`proxy_cache_*` with prod's key
    `"$request_method $scheme$host$request_uri"`, `X-Cache-Status`, bypass by `x-cache-bypass` header or
    `cache_bypass` cookie): `tests/features/datasets/query/cache-headers.api.spec.ts` checks MISS/HIT/REVALIDATED.
  - `proxy_pass_header X-Accel-Buffering`, read by tests.
  - Its own API is served stripped, so shape 3 uses `rewrite` (API paths are regexes so `/data-fair/api-doc` and
    `/data-fair/applications` stay on the UI). `location = /data-fair/` sends the websocket upgrade to the API, the
    page to Vite.
  - `/capture/` stripped (capture has prefixOptional; prod does not expose it).
  - Second server on `${NGINX_PORT2}` simulating a publication site: API only under `/data-fair/`,
    openapi-viewer as `/api-doc/` (stripped), simple-directory, capture, events.
- **portals**: `server_name ${DEV_HOST} *.${DEV_HOST}`. `/` on DEV_HOST redirects to `/portals-manager/dev`, any
  other path or portal subdomain goes to the portal Nuxt dev server (long timeout, like shape 3).
  `/openapi-viewer/` is a text stub (the service is not in the compose; the portal's api-doc pages iframe it).
  No `/catalogs`, `/registry`, `/processings`: those services are not in its compose.
- **catalogs**, **processings**: no deviation.

## Production references

- infrastructure `helmconfigs/production/ingress.yaml`: controller config (buffering off, body size 0, 600 s
  read timeout, 32k buffers, X-Private-If-*, X-Forwarded-Path, X-Client-IP, Range, the cache and gzip left out here).
- infrastructure `manifests/env-production/ingress.yaml` and env-staging3 `manifests/data-fair/ingress.yaml`:
  routes, data-fair stripped, the others kept (staging3 `main-ingress-complement`), trailing-slash redirects.
- portals-ingress-manager `src/service.ts`: portal hosts, the same prefixes kept, data-fair stripped.
