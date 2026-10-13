# Dev docker-compose

The canonical dev compose of the data-fair services: the **only** place where storage and tool
versions are decided. A version bump is made here first, then applied to every service in the same pass; a
service never bumps mongo, ES or a tool alone. Drift check from the directory holding the service checkouts:
`grep -H 'image: *\(mongo\|ghcr.io/data-fair/elasticsearch\|nginx\|maildev\|clamav\)' */docker-compose.y*ml`.
Applies to every service's `docker-compose.yml` (data-fair keeps its `.yaml` file name). Goal: the same service is declared the same way in every repo; a repo only adds what
it really uses. Reference: the deployments (infrastructure repo for production: mongo 8.0.17, ES 7.17.28 in 2026-10;
env-staging3: mongo 8.0.17, ES 8.19.9). Dev follows staging3, where master is deployed.

## Rules

- Service names: `nginx`, `simple-directory`, `data-fair`, `events`, `agents`, `registry`, `catalogs`,
  `processings`, `portals`, `openapi-viewer`, `capture`, `maildev`, `clamav`, `elasticsearch`, `mongo`, `s3`,
  `s3-init`. Volumes: `elasticsearch-data`, `mongo-data`, `s3-data`, `data-fair-data`.
- Order: `nginx`, `simple-directory`, `data-fair`, then the other sibling services in the order above,
  then the tools (`openapi-viewer`, `capture`, `maildev`, `clamav`), then storage (`elasticsearch`,
  `mongo`, `s3`, `s3-init`), then `volumes:`. Inside a service: `profiles`, `image`, `network_mode`,
  `ports`, `depends_on`, `command`, `environment`, `volumes`, `healthcheck`, `mem_limit`.
- Images of sibling services: the development branch tag (`:master` or `:main`, whichever the repo
  publishes), never a major tag. Storage: the major tag (`mongo:8`); ES has no floating tag in our
  ghcr image (`ghcr.io/data-fair/elasticsearch` only publishes exact versions, checked 2026-10-14), so
  `8.19.9`, as staging3. Tools (nginx, maildev, clamav): exact versions.
- maildev (optional, profile `maildev`) only where the repo has a mail flow of its own to develop or
  test, and simple-directory is wired to it there: simple-directory (invitations…), events (notification
  mails), portals (contact form), data-fair (API key expiration mails through sd `/api/mails`),
  processings (the worker's own SMTP transport, plugins' `sendMail`). Not catalogs, agents, registry:
  their notifications go through events, which tests the mail delivery.
- Optional services: a compose profile named after the service (`df-dev up <name>`), nothing else in
  that profile. No other profiles (no `test`, no `testImages`, no `dev`).
- Sibling services run with `network_mode: host` and talk to each other on `localhost:<PORT>`; only the
  public URLs (`PUBLIC_URL`, `DIRECTORY_URL`, `WS_PUBLIC_URL`) go through nginx
  (`http://${DEV_HOST}:${NGINX_PORT}/<service>`). Storage containers publish their port instead.
- Port variables: `NGINX_PORT` (plus `NGINX_PORT2` only where a second host is tested, data-fair),
  `SD_PORT`, `DF_PORT`, `EVENTS_PORT`, `AGENTS_PORT`, `REGISTRY_PORT`, `CATALOGS_PORT`,
  `PROCESSINGS_PORT`, `OAV_PORT`, `CAPTURE_PORT`, `MAILDEV_UI_PORT`, `MAILDEV_SMTP_PORT`,
  `CLAMAV_PORT`, `ES_PORT`, `MONGO_PORT`, `S3_PORT`. The service's own processes: `DEV_API_PORT`,
  `DEV_UI_PORT`, `DEV_UI_HMR_PORT`, ….
- Mongo databases: `simple-directory`, `data-fair`, `data-fair-events`, `data-fair-agents`,
  `data-fair-registry`, `data-fair-<service>-development` for the repo's own (keep its current name).
- Every sibling service: `OBSERVER_ACTIVE=false`. No `DEBUG` in committed files (set it locally).
- Options a service does not read are removed (checked against its `custom-environment-variables`).
- Sibling images run with `NODE_ENV=production` on their `default` config only (their `development`
  config never applies): every dev-relevant value is set here explicitly, see "Dev values" below.

## Shared dev secrets

Same value in every compose file and in every service's `development` config:

| Key | Value |
|---|---|
| identities webhooks (`SECRET_IDENTITIES`, sd `IDENTITIES_WEBHOOKS` key) | `secret-identities` |
| events (`SECRET_EVENTS`) | `secret-events` |
| mails (`SECRET_SENDMAILS`) | `secret-sendmails` |
| sites (`SECRET_SITES`) | `secret-sites` |
| limits (`SECRET_LIMITS`) | `secret-limits` |
| catalogs (`SECRET_CATALOGS`) | `secret-catalogs` |
| registry (`SECRET_INTERNAL_SERVICES`) | `secret-registry-internal` |
| ingress (portals) | `secret-ingress` |
| `CIPHER_PASSWORD` (registry needs >= 32 chars) | `dev-cipher-password-0123456789abcdef` |
| `API_KEYS_SALT` (registry, >= 32 chars) | `dev-api-keys-salt-0123456789abcdef01` |

Changing a cipher password makes the secrets already ciphered in a dev database unreadable: the pilots
reset their volumes with this change anyway (mongo 4.2 → 8).

## Canonical blocks

```yaml
  nginx:
    image: nginx:1.29.4-alpine
    network_mode: host
    environment:
      - DEV_HOST=${DEV_HOST}
      - NGINX_PORT=${NGINX_PORT}
      # then every port the nginx template reads, nothing else
    volumes:
      - ./dev/resources/nginx.conf.template:/etc/nginx/templates/default.conf.template:ro

  simple-directory:
    image: ghcr.io/data-fair/simple-directory:master
    network_mode: host
    depends_on:
      mongo:
        condition: service_healthy
    environment:
      - PORT=${SD_PORT}
      - PUBLIC_URL=http://${DEV_HOST}:${NGINX_PORT}/simple-directory
      - MONGO_URL=mongodb://localhost:${MONGO_PORT}/simple-directory
      - OBSERVER_ACTIVE=false
      - CIPHER_PASSWORD=dev-cipher-password-0123456789abcdef
      - STORAGE_TYPE=file
      - ADMINS=["test_superadmin@test.com","superadmin@test.com","alban.mouton@koumoul.com"]
      - CONTACT=contact@test.com
      - IDENTITIES_WEBHOOKS=[{"base":"http://localhost:${DEV_API_PORT}/api/identities","key":"secret-identities"}]
      # tests log in through the API many times per minute
      - AUTHRATELIMIT_ATTEMPTS=200
      - AUTHRATELIMIT_DURATION=1
      - MANAGE_DEPARTMENTS=true
      - MANAGE_PARTNERS=true
      - MANAGE_SITES=true
      - SECRET_SITES=secret-sites
      - SECRET_EVENTS=secret-events
      - SECRET_SENDMAILS=secret-sendmails
      # host network: sd's default SMTP localhost:1025 would reach another env's maildev
      - MAILS_TRANSPORT={"host":"localhost","port":${MAILDEV_SMTP_PORT},"ignoreTLS":true}
      # per recipient, stored in mongo: repeated test runs would stop the mails silently
      - MAILSRATELIMIT_POINTS=100000
      # then only what this repo needs (data-fair: ACCEPT_UNKNOWN_SITE, LIST_*_MODE, ROLES_DEFAULTS…;
      # portals: ANONYMOUS_CONTACT_FORM, maildev)
    volumes:
      - ./dev/resources/users.json:/app/data/users.json
      - ./dev/resources/organizations.json:/app/data/organizations.json
    healthcheck:
      test: ["CMD", "nc", "-z", "localhost", "${SD_PORT}"]
      interval: 2s
      timeout: 2s
      retries: 60

  data-fair:
    image: ghcr.io/data-fair/data-fair:master
    # it can start before its dependencies answer
    restart: on-failure:10
    network_mode: host
    depends_on:
      mongo:
        condition: service_healthy
      elasticsearch:
        condition: service_healthy
    environment:
      - PORT=${DF_PORT}
      - PUBLIC_URL=http://${DEV_HOST}:${NGINX_PORT}/data-fair
      - WS_PUBLIC_URL=ws://${DEV_HOST}:${NGINX_PORT}/data-fair
      - DIRECTORY_URL=http://${DEV_HOST}:${NGINX_PORT}/simple-directory
      - PRIVATE_DIRECTORY_URL=http://localhost:${SD_PORT}
      - PRIVATE_EVENTS_URL=http://localhost:${EVENTS_PORT}
      - PRIVATE_AGENTS_URL=http://localhost:${AGENTS_PORT}
      - MONGO_URL=mongodb://localhost:${MONGO_PORT}/data-fair
      - ES_HOST=http://localhost:${ES_PORT}
      # single node: with replicas the cluster stays yellow and /ping answers 500
      - ES_NB_REPLICAS=0
      - OBSERVER_ACTIVE=false
      # default: 3 koumoul.com remote services fetched at boot, extensions would call production
      - REMOTE_SERVICES=[]
      - CACHE_PUBLIC_MAX_AGE=1
      # one IP for every test and the portal SSR: the per-IP / per-user limits answer 429
      - DEFAULT_LIMITS_API_RATE_ANONYMOUS_NB=100000
      - DEFAULT_LIMITS_API_RATE_USER_NB=100000
      - DEFAULT_LIMITS_API_RATE_ANONYMOUS_COMPUTE_MS=0
      - DEFAULT_LIMITS_API_RATE_USER_COMPUTE_MS=0
      - DEFAULT_LIMITS_API_RATE_ANONYMOUS_BANDWIDTH_DYNAMIC=100000000
      - DEFAULT_LIMITS_API_RATE_USER_BANDWIDTH_DYNAMIC=100000000
      - WORKER_BASE_CONCURRENCY=1
      # tile cache capped collection, 2 GB by default
      - CACHE_MONGO_SIZE=200
      - SECRET_EVENTS=secret-events
      # then this repo's integration: PRIVATE_<SERVICE>_URL=http://localhost:${DEV_API_PORT}, SECRET_<SERVICE>

    volumes:
      # the image declares an anonymous /data: datasets files would vanish on recreate while mongo keeps them
      - data-fair-data:/data

  events:
    profiles:
      - events
    image: ghcr.io/data-fair/events:main
    network_mode: host
    depends_on:
      - mongo
    environment:
      - PORT=${EVENTS_PORT}
      - PRIVATE_DIRECTORY_URL=http://localhost:${SD_PORT}
      - MONGO_URL=mongodb://localhost:${MONGO_PORT}/data-fair-events
      - OBSERVER_ACTIVE=false
      - SECRET_IDENTITIES=secret-identities
      - SECRET_EVENTS=secret-events
      - SECRET_SENDMAILS=secret-sendmails

  agents:
    profiles:
      - agents
    image: ghcr.io/data-fair/agents:main
    network_mode: host
    depends_on:
      - mongo
    environment:
      - PORT=${AGENTS_PORT}
      - PRIVATE_DIRECTORY_URL=http://localhost:${SD_PORT}
      - PRIVATE_EVENTS_URL=http://localhost:${EVENTS_PORT}
      - MONGO_URL=mongodb://localhost:${MONGO_PORT}/data-fair-agents
      - OBSERVER_ACTIVE=false
      - CIPHER_PASSWORD=dev-cipher-password-0123456789abcdef
      - SECRET_EVENTS=secret-events
      # the image has no model by default: the mock provider of agents' development config
      - PROVIDERS=[{"type":"mock","id":"global-mock","name":"Global Mock","enabled":true}]
      - MODELS=[{"id":"mock-model","name":"Global Mock Model","provider":"global-mock","usage":["assistant","tools","summarizer","evaluator","moderator"],"inputPricePerMillion":0,"outputPricePerMillion":0}]
      - DEFAULT_MODELS={"assistant":{"provider":"global-mock","id":"mock-model"}}
      - DEFAULT_CREDITS=-1

  registry:
    image: ghcr.io/data-fair/registry:main
    network_mode: host
    depends_on:
      - mongo
      - simple-directory
    environment:
      - PORT=${REGISTRY_PORT}
      - PRIVATE_DIRECTORY_URL=http://localhost:${SD_PORT}
      - MONGO_URL=mongodb://localhost:${MONGO_PORT}/data-fair-registry
      - OBSERVER_ACTIVE=false
      - CIPHER_PASSWORD=dev-cipher-password-0123456789abcdef
      - API_KEYS_SALT=dev-api-keys-salt-0123456789abcdef01
      - SECRET_INTERNAL_SERVICES=secret-registry-internal
      - FILES_STORAGE=fs
      - DATA_DIR=/tmp/registry-data

  elasticsearch:
    image: ghcr.io/data-fair/elasticsearch:8.19.9
    ports:
      - ${ES_PORT}:9200
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - ingest.geoip.downloader.enabled=false
      # heap 512m; an agent that needs more sets ES_HEAP=1g in .env (df-dev never overwrites it)
      - ES_JAVA_OPTS=-Xms${ES_HEAP:-512m} -Xmx${ES_HEAP:-512m}
    volumes:
      - elasticsearch-data:/usr/share/elasticsearch/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9200"]
      interval: 2s
      timeout: 2s
      retries: 60
    mem_limit: 2g
    # no swap: an idle ES got 1.7 GB swapped out
    memswap_limit: 2g

  mongo:
    image: mongo:8
    ports:
      - ${MONGO_PORT}:27017
    # wiredTiger takes half the machine's RAM by default
    command: ["--wiredTigerCacheSizeGB", "0.25"]
    volumes:
      - mongo-data:/data/db
    healthcheck:
      test: ["CMD", "mongosh", "--quiet", "--eval", "db.runCommand({ ping: 1 }).ok"]
      interval: 2s
      timeout: 2s
      retries: 60
```

  maildev:
    profiles:
      - maildev
    image: maildev/maildev:2.1.0
    ports:
      - ${MAILDEV_UI_PORT}:1080
      - ${MAILDEV_SMTP_PORT}:1025
    healthcheck: # keep the one of portals' compose

  # and in simple-directory, where maildev exists:
      - MAILDEV_ACTIVE=true
      - MAILDEV_URL=http://localhost:${MAILDEV_UI_PORT}
      - MAILS_TRANSPORT={"host":"localhost","port":${MAILDEV_SMTP_PORT},"ignoreTLS":true}

`registry` is optional (profile `registry`) where the repo does not need it at every start (data-fair);
core where plugins are resolved through it (catalogs, processings).
