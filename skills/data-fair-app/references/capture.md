# Captures d'écran, miniatures et impression

Référence complète du mécanisme de capture : ce que fait le service `capture`, qui l'appelle avec
quels paramètres, et ce que l'application doit implémenter. Le résumé opérationnel est dans la
section « Capture d'écran / miniatures » du `SKILL.md` ; ce document est la source des détails.

Dépôts de référence : `capture/` (le service), `data-fair/` (l'appelant principal),
`portals/` (bouton de capture des portails), `dev-server/` (simulation en développement).

---

## 1. Ce que fait le service `capture`

Deux routes, toutes deux en `GET`, toutes deux avec le paramètre obligatoire `target`
(`capture/api/routers/capture.ts`) :

| Route | Sortie | Paramètres notables |
|---|---|---|
| `/api/v1/screenshot` | `png` (défaut) ou `gif` | `width`, `height`, `type`, `filename`, `lang`, `timezone`, `cookies`, `timer` |
| `/api/v1/print` | `pdf` (défaut) ou `html` | `landscape`, `format`, `pageRanges`, `footer`, marges `left`/`right`/`top`/`bottom` |

Mécanique (`capture/api/utils/page.ts`) : Chrome headless piloté par puppeteer, une page ouverte
dans un **contexte incognito** pris dans un pool (`concurrency: 5`), cookies purgés après usage.

Points structurants pour une application :

- **La cible est l'application servie nue** : `{publicUrl}/app/{applicationId}`, pas la page de
  portail qui l'entoure, pas un `<d-frame>`. Aucun chrome de portail dans l'image.
- **`onlySameHost: true`** : la cible *et chacune des iframes de la page* doivent être sur le même
  host que le service, sinon 400. Une visu qui charge une iframe tierce n'est pas capturable.
- **La capture est le viewport, pas le document.** `page.screenshot({ fullPage: height === 'auto' })` :
  sans `height=auto`, l'image fait exactement `width × height` et tout ce qui dépasse est coupé.
  Avec `height=auto`, la hauteur du viewport devient `width / 10` et la capture passe en `fullPage`
  (aucun appelant de la stack ne l'utilise aujourd'hui).
- Bornes dures : `width` et `height` ≤ 3000.
- Timeouts, depuis `screenshotTimeout` (défaut **20 000 ms**, env `SCREENSHOT_TIMEOUT`) :
  ouverture de la page 2 × `screenshotTimeout`, puis le rendu lui-même `screenshotTimeout` pour un
  png/pdf et **2 × `screenshotTimeout` pour un gif** (budget total de l'animation, encodage compris).
- Locale : `lang` pose l'en-tête `Accept-Language` **et** surcharge `navigator.language` /
  `navigator.languages` ; `timezone` passe par `page.emulateTimezone`. Défauts `fr-FR` /
  `Europe/Paris`. Une app qui formate des dates via `Intl` ou `dayjs` suit donc l'appelant.
- Cookies : transmis seulement si la cible est sur le même host et que `cookies !== 'false'`.
  data-fair envoie `cookies=false` pour une application publique, et les cookies de l'appelant sinon.

---

## 2. Stratégie d'attente — le contrat `triggerCapture`

`waitForPage` (`capture/api/utils/page.ts`), dans l'ordre :

1. `page.exposeFunction('triggerCapture', …)` est installé **avant** le `page.goto`, donc sur chaque
   nouveau document. `window.triggerCapture` existe dès le premier script de la page : tester
   `!!window.triggerCapture` est un test « suis-je dans une capture ? » fiable, même très tôt
   (dans `main.ts`, dans le `setup()` d'un composant).
2. `Promise.race([page.goto(target, { waitUntil: 'networkidle0', timeout: screenshotTimeout }), triggerCapture])`.
3. Si `triggerCapture` a gagné → **capture immédiate**. C'est le chemin normal, et le seul rapide.
4. Sinon, si le réseau est devenu inactif (500 ms sans requête) :
   - méta `df:capture-delay` présente → attendre `triggerCapture` pendant
     `min(N × 1000, screenshotTimeout)` ms ;
   - sinon méta `x-capture="trigger"` (**dépréciée**) → attendre `triggerCapture` jusqu'à
     `screenshotTimeout` ;
   - sinon → +1000 ms de sécurité, puis capture.
5. Si le `goto` a atteint son timeout → capture immédiate de ce qui est à l'écran.

**`df:capture-delay` s'exprime en secondes** et est plafonnée à `screenshotTimeout`. Une valeur en
millisecondes est donc silencieusement transformée en « attendre le timeout complet » :
`atelier-carto` déclare `content="1500"`, ce qui vaut 20 s d'attente à chaque capture — presque
sûrement une confusion s/ms. Valeurs saines : 1 à 5.

### Valeur de retour : `Promise<boolean>`

`window.triggerCapture(animationSupported?)` **résout vers un booléen** : `animate`, vrai seulement
si l'appelant a demandé un gif **et** que l'app a passé `animationSupported: true`. C'est une
fonction exposée par puppeteer, donc elle retourne toujours une promesse — il faut l'`await`.

Implémentation de référence, maintenue avec le service : `capture/test-it/resources/test-anim.html`.

```js
const animate = await window.triggerCapture(true)
if (animate) { /* mode gif : préparer animateCaptureFrame */ }
else { /* image fixe : afficher l'état le plus parlant */ }
```

> `app-minimal/src/index.js` fait `var animate = window.triggerCapture(true)` **sans `await`** :
> une promesse est toujours truthy, donc la branche « gif » y est prise systématiquement. Ne pas
> recopier ce détail de l'exemple.
>
> Le type correct est `triggerCapture?: (animationSupported?: boolean) => Promise<boolean>`.
> Seul `bar-chart-race` le déclare ainsi ; `Promise<void>` et `void` sont les deux erreurs
> rencontrées ailleurs dans le parc — à corriger dès qu'on touche au fichier.

---

## 3. Mode animé (gif)

`capture/api/utils/animation.ts` : boucle `page.evaluate(() => window.animateCaptureFrame())` puis
`page.screenshot()`, chaque image étant décodée puis ajoutée à un `GifEncoder` cadencé à **15 fps**,
jusqu'à ce que la fonction retourne une valeur truthy ou que `maxAnimationFrames` (**1800**) soit
atteint. Le gif est ensuite compressé par gifsicle.

Contrat côté application :

- `animateCaptureFrame()` avance le rendu **d'un pas de 1/15 s** et retourne `true` quand
  l'animation est terminée. La cadence est imposée par le service : ne pas laisser tourner en
  parallèle une horloge interne (`requestAnimationFrame`, `setInterval`), sinon le temps avance
  deux fois et le gif saute.
- **Définir `animateCaptureFrame` avant tout appel à `triggerCapture(true)`.** En mode gif le
  service l'appelle immédiatement après la résolution du trigger ; si elle est `undefined`, le
  `page.evaluate` lève et **toute la capture échoue**. `app-form` appelle `triggerCapture(true)`
  sans jamais définir `animateCaptureFrame` — une demande de gif sur ces applications échoue.
- **Deux budgets simultanés** : 1800 images *et* 40 s d'horloge murale (2 × `screenshotTimeout`)
  pour la totalité du gif, captures + décodage + encodage compris. Un nombre d'images dérivé d'une
  durée configurable par l'utilisateur finit donc par faire échouer la capture. Borner soi-même le
  nombre d'images et compresser l'animation dedans : `test-anim.html` s'arrête à 15 images,
  `app-minimal` à 30. Un ordre de grandeur sûr est 100–200 images (7 à 13 s de gif).
- Qui demande un gif ? **Aucune interface.** data-fair ne pose `type=gif` que si l'appelant HTTP a
  passé `?type=gif` sur `/api/v1/applications/:id/capture`, et le service le déduit aussi d'un
  `filename` en `.gif`. Ni le dialogue du back-office ni le bouton des portails ne le proposent :
  le gif est donc aujourd'hui une fonctionnalité d'API, pas d'IHM. Le supporter reste utile, mais
  ce n'est pas le chemin à optimiser en premier.

---

## 4. Les appelants et leurs tailles

| Appelant | Source | Largeur × hauteur |
|---|---|---|
| Service `capture` (aucun paramètre) | `capture/api/routers/capture.ts` | 800 × 450 (16:9) |
| data-fair `/api/v1/applications/:id/capture` | `api/src/misc/utils/capture.ts` | **1050 × 450** (« 21/9 resolution ») |
| Dialogue de capture du back-office | `ui/src/components/application/application-capture-dialog.vue` | `df:capture-width \|\| 800` × `df:capture-height \|\| 450`, éditable par l'utilisateur |
| Bouton « Capturer » d'un portail | `portal/app/components/application/application-capture.vue` | `df:capture-width \|\| 1280` × `df:capture-height \|\| 720` |

Trois défauts, deux ratios différents (16:9 et 21:9). Conséquences :

- Déclarer `df:capture-width` / `df:capture-height` fixe le préremplissage du dialogue et la taille
  du bouton portail, **mais pas la miniature par défaut** : celle-ci est toujours 1050 × 450, la
  valeur est codée dans `screenshotRequestOpts`. On ne peut pas choisir le format de sa miniature.
- **450 px est donc la plus petite hauteur à laquelle l'application est rendue en production.**
  C'est la contrainte de densité à respecter : c'est là que les libellés se chevauchent, que les
  légendes débordent, que les lignes d'un tableau disparaissent. Tester à cette taille.
- Ne déclarer ces métas que si le rendu impose un format précis ; sinon laisser les appelants
  décider.

---

## 5. La miniature par défaut (le cas le plus fréquent)

`capture.screenshot` (`data-fair/api/src/misc/utils/capture.ts`) distingue un seul cas particulier :

```
isDefaultThumbnail = aucun paramètre de requête hormis `updatedAt` et `app_capture-test-error`
```

Ce cas, et lui seul :

- ajoute **`?thumbnail=true`** à l'URL cible. Une capture manuelle (dialogue, bouton portail) ne le
  porte pas — alors que `window.triggerCapture` est défini dans les deux cas. `?thumbnail=true`
  signifie donc « miniature de vignette », pas « contexte de capture » ;
- est **mise en cache sur disque** dans `<dataDir>/captures/<applicationId>.png`, considérée fraîche
  tant que le `mtime` du fichier est ≥ `application.updatedAt`. La réponse porte l'en-tête
  `x-capture-cache-status: HIT | EXPIRED | MISS` ;
- est **réessayée une fois** après 4 s en cas d'échec ; au second échec le fichier est supprimé et
  la réponse est une redirection vers `/no-preview.png`.

Toute autre capture est en `x-capture-cache-status: BYPASS` et **limitée en débit** :
`appCaptures` = 5 par 60 s (`api/config/default.cjs`), 429 au-delà.

Où cette miniature est-elle affichée ?

- cartes d'application du back-office — `data-fair/ui/src/components/application/application-card.vue`
  (`application.thumbnail || application.image || {href}/capture?updatedAt=…`) ;
- cartes d'application des portails — `portals/portal/app/components/application/application-card.vue` ;
- mode « aperçu » d'un élément de page « application » d'un portail —
  `portals/portal/app/components/page-element/applications/page-element-application.vue`
  (« pour des raisons de performance, l'aperçu affiche uniquement une capture de la visualisation »).

C'est donc l'image que voient la majorité des utilisateurs, souvent avant d'ouvrir l'application.
**Elle doit montrer l'état le plus parlant de la visu, pas son état initial.**

Implémentation de référence dans le parc : `bar-chart-race`, bloc `── capture` de
`src/components/BarChartRace.vue` — attente du chargement complet avec repli borné à 4 s (sous la
méta `df:capture-delay` de 5 s), `time = duration` posé **avant** l'appel au trigger, rembobinage à
0 si `animate` est vrai, nombre d'images du gif plafonné indépendamment de la durée configurée,
et `tests/e2e/capture.spec.ts` qui couvre les quatre chemins (png, gif, erreur de données,
configuration incomplète) avec un stub du service.

> À ne pas confondre avec `public/thumbnail.png`, qui est l'illustration de la **brique**
> (base app) dans la galerie, et n'a rien à voir avec la capture d'une application configurée.

---

## 6. Capturer un état choisi

Tous les paramètres de requête préfixés `app_` sont **dépréfixés et reportés sur l'URL cible**
(`screenshotRequestOpts` et `printRequestOpts`). C'est le seul canal pour injecter un état dans une
capture. Corollaire : **un état qui n'est pas dans les paramètres d'URL n'est pas capturable.**
Il faut le tenir dans `reactiveSearchParams`.

- **Back-office** : si `df:sync-state` est déclarée (présente **et** `!== "false"` — le proxy, lui,
  teste `=== "true"`, cf. `SKILL.md`), le dialogue embarque l'application dans un
  `<d-frame state-change-events>`, écoute l'événement `state-change` et convertit les paramètres de
  l'URL remontée en `app_*`. Sans cette méta, pas de sélecteur d'état dans le dialogue.
- **Portails** : le bouton de capture reporte **toute la query de la route courante** en `app_*`,
  plus `app_primary=<couleur primaire du thème>`. Attention : `primary` n'est lu que par
  `defaultOptions()` de `@data-fair/lib-vuetify`, qui est **déprécié** ; une application construite
  sur `vuetifySessionOptions(session)` (le pattern actuel, dont les couleurs viennent de
  `session.site.colors`) l'ignore. C'est inoffensif — `primary` n'a ni le préfixe `_c_` ni
  `_d_<datasetId>_`, donc `useConceptFilters` ne le transforme pas en filtre de données — mais ne
  pas compter dessus pour recolorer quoi que ce soit.

---

## 6 bis. Qu'est-ce qu'on masque dans une capture ?

Le critère n'est **pas** « c'est cliquable », c'est **« est-ce que ça porte de l'information dans
une image fixe ? »**. Une capture est souvent la seule chose que verra un utilisateur avant
d'ouvrir l'application : elle doit rester lisible *et* interprétable.

**À masquer** — les commandes dont l'image ne peut rien faire et qui ne disent rien de l'état :
boutons lecture/pause, curseur de progression d'une animation, boutons d'export ou de partage,
barres d'outils, infobulles, aides « cliquez pour… », bandeaux de chargement.

**À garder** — tout ce qui documente l'état capturé : barre de filtres **avec ses valeurs
courantes**, période sélectionnée, légende, titre, unité, sélection active. Les retirer rend la
capture ambiguë. `app-dashboards` est le cas de référence : il n'a **aucun** rendu spécifique à la
capture, et c'est le bon choix — ses filtres affichent les valeurs qui ont produit les graphiques.

**Cas particulier `?thumbnail=true`** : la vignette fait 1050×450 et sert d'aperçu de galerie, pas
de document. On peut y dépouiller plus fort (légendes secondaires, en-têtes) que sur une capture
manuelle, qu'un utilisateur a demandée précisément pour illustrer un état donné. D'où l'intérêt de
distinguer les deux contextes plutôt que de tout brancher sur `!!window.triggerCapture`.

---

## 7. Permissions, debug, endpoints connexes

- `readCapture` et `readPrint` sont des **opérations de permission distinctes**
  (`data-fair/shared/permissions/operations.ts`), incluses dans la classe `read`. Une application
  publique est donc capturable publiquement.
- Le proxy injecte `window.APPLICATION.captureUrl` (`api/src/applications/proxy.ts`) : une
  application peut appeler le service elle-même (export PDF de son propre rendu, par exemple).
- `?timer=true` sur `/screenshot` renvoie le détail des temps (`configure-page`, `wait1-*`,
  `wait2-*`, `capture-*`…) en JSON au lieu de l'image. Très utile pour prouver qu'une app attend
  le délai au lieu d'appeler `triggerCapture`.
- Une cible contenant `capture-test-error=true` fait échouer volontairement la capture après 1 s
  (chemin de test de santé). data-fair le transmet via `app_capture-test-error` et l'exclut du test
  `isDefaultThumbnail`.
- Le fichier de capture est supprimé avec l'application (`api/src/applications/service.ts`).

---

## 8. Tester en développement

`@data-fair/dev-server` **≥ 2.4.0** simule la stratégie d'attente de `waitForPage`
(`dev-server/src/app.ts`) : le bouton appareil photo de l'interface de configuration ouvre
l'application dans une iframe à la taille exacte demandée, et le serveur injecte en **premier
enfant du `<head>`** — donc avant tout script du document, comme `page.exposeFunction` avant le
`goto` — un `window.triggerCapture` factice. Tous ses messages sont préfixés `[capture]` dans la
console : c'est le meilleur signal de régression disponible.

Le dialogue distingue les **deux contextes qui ne coexistent jamais en production** :

| Contexte | URL simulée | Taille |
|---|---|---|
| Vignette par défaut | `/app?thumbnail=true`, **aucun** paramètre d'état | 1050 × 450 figé (codé en dur dans data-fair) |
| Capture manuelle | pas de `?thumbnail`, l'état courant reporté | `df:capture-width`/`-height`, sinon 800 × 450 ; presets 1280 × 720 (portail) |

et le format demandé (`png` / `gif`), qui décide de la valeur résolue par le trigger.

Ce que la simulation reproduit fidèlement :

- `triggerCapture` **résout une promesse** (`Promise<boolean>`) — une app qui oublie l'`await` est
  donc prise en défaut en dev, comme elle l'est en prod ;
- `animate` n'est vrai que si l'app passe `animationSupported: true` **et** que le format demandé
  est un gif : le chemin png est enfin observable ;
- l'attente après network idle : `df:capture-delay` × 1000 plafonnée à `screenshotTimeout`, sinon
  `x-capture="trigger"` jusqu'au timeout, sinon +1 s puis capture. Une valeur de délai
  manifestement exprimée en millisecondes est signalée comme telle ;
- les échecs du mode gif : `animateCaptureFrame` absente au moment où le trigger se résout (qui
  fait échouer **toute** la capture en prod), le plafond de 1800 images, et le budget de 40 s
  d'horloge murale ;
- `capture-test-error=true`.

Les différences qui restent, à connaître avant de conclure :

1. **le « network idle » est approximé** par `load` + 500 ms, là où le service observe réellement
   500 ms sans requête : le décompte de l'attente peut démarrer légèrement décalé ;
2. **le budget gif est mesuré optimiste** : la simulation ne fait qu'appeler `animateCaptureFrame`
   à 15 fps, sans capturer, décoder ni encoder les images — le service consomme ces trois coûts
   dans le même budget de 40 s. Une animation qui passe tout juste en dev peut échouer en prod ;
3. rien de l'environnement Chrome headless n'est reproduit : ni `onlySameHost`, ni les bornes à
   3000 px, ni les cookies, ni `lang` / `timezone` (`Accept-Language`, `navigator.language`,
   `emulateTimezone`) — l'iframe hérite de la locale du navigateur du développeur ;
4. ni le cache disque de la miniature, ni son unique réessai, ni le rate limit `appCaptures`.

**La simulation ne remplace pas un test.** En Playwright, `page.addInitScript(...)` +
`page.setViewportSize({ width: 1050, height: 450 })`, puis assertion sur la capture :

```js
// script injecté avant tout autre script du document
await page.addInitScript(() => {
  window.triggerCapture = (animationSupported) => {
    console.log('[sim] triggerCapture', animationSupported)
    return Promise.resolve(false) // mode png : le service ne demande pas d'animation
  }
})
```

Rendre le stub **promesse** est important : c'est ce que fait `page.exposeFunction`, et un stub qui
retourne un booléen nu laisse passer l'oubli de l'`await`.
`data-fair-metrics/tests/e2e/integration.spec.ts` teste déjà ainsi que `triggerCapture` est appelé
une fois données chargées **et** en cas d'erreur de configuration : c'est le test à copier dans
toute app.

---

## 9. Checklist application

- [ ] `triggerCapture` appelé sur **tous** les chemins terminaux : données prêtes, résultat vide,
      erreur de données, configuration invalide. Tout chemin oublié fait attendre le délai de la
      méta puis le timeout du service à chaque capture.
- [ ] `df:capture-delay` déclarée **en secondes** (1 à 5), comme filet de sécurité et non comme
      chemin normal. Pas de `x-capture` (déprécié) ; le retirer lors de toute reprise.
- [ ] Rendu adapté au contexte de capture (`!!window.triggerCapture`), selon le critère de la
      section 6 bis — masquer ce qui ne porte pas d'information dans une image fixe, garder ce
      qui documente l'état capturé.
- [ ] **État le plus parlant, pas l'état initial.** `await` le booléen retourné : `false` = image
      fixe, donc se placer sur l'état final ou représentatif ; `true` = gif, donc repartir du début.
- [ ] Lisible à **1050 × 450** (et à 1280 × 720). Vérifier avec la configuration la plus dense que
      le schéma autorise, pas seulement avec la configuration par défaut.
- [ ] Mode animé, si supporté : `animateCaptureFrame` définie **avant** l'appel à
      `triggerCapture(true)`, nombre d'images borné indépendamment de la durée configurée, aucune
      horloge interne concurrente, et `delete window.animateCaptureFrame` au démontage.
- [ ] Type déclaré : `triggerCapture?: (animationSupported?: boolean) => Promise<boolean>`.
- [ ] État capturable = état dans `reactiveSearchParams`, et `df:sync-state` déclarée pour que le
      dialogue du back-office propose de le choisir.
