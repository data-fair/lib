# Composants Vuetify 4 : ce qui piège un script

Les interfaces de la plateforme (back-office data-fair, portals-manager,
simple-directory, catalogs, processings, applications) sont en Vuetify 4. Un
script Playwright qui clique « comme un humain » y bute sur quelques
comportements récurrents, relevés dans les tests, les captures de cours et les
tournages vidéo.

## Champs de sélection (`v-select`, `v-autocomplete`, `v-combobox`)

- **Le champ ne s'ouvre pas au clic** : la couche qui affiche la valeur
  (`.v-field__input`, chips) recouvre l'`<input role="combobox">`. Un
  `getByRole('combobox', { name }).click()` tourne jusqu'au timeout puis lève
  « intercepts pointer events ». Ouvrir au clavier (`focus()` puis `Enter`), ou
  cliquer le conteneur : `page.locator('.v-field', { has: page.getByRole('combobox', { name }) })`.
- **Listes longues virtualisées** : seules les options visibles existent dans le
  DOM. Taper un filtre dans le champ avant de choisir, puis
  `getByRole('option', { name, exact: true })`.
- **Multi-sélection** : la liste reste ouverte entre deux choix ; `Escape` la
  ferme.
- **Champ date** (`v-date-input`) : c'est un `textbox`, pas un combobox ; les
  jours du calendrier sont des boutons nommés en toutes lettres
  (`vendredi 2 octobre 2026`).

## Menus, listes et dialogues téléportés

- Les options d'un select, un `v-menu` ou un dialogue sont rendus à la fin du
  `<body>` (`.v-overlay-container`), pas sous le champ qui les ouvre : les
  chercher dans l'overlay actif (`.v-overlay--active`), jamais en descendant du
  champ. Plusieurs overlays peuvent coexister : filtrer par texte ou prendre le
  dernier ouvert.
- Certains dialogues n'ont pas de `role="dialog"` (formulaires de
  simple-directory, menu d'action d'une page dans portals-manager) : viser
  `.v-overlay__content:visible` filtré par son texte.

## Interrupteurs et cases (`v-switch`, `v-checkbox`, `v-radio`)

- Le centre du conteneur `.v-switch` tombe sur son **libellé**, qui n'est pas
  cliquable : le clic part dans le vide et rien ne bascule. Viser la piste
  `.v-selection-control__input`, ou `getByRole('switch' | 'checkbox', { name }).check()`.
- Quelques libellés de choix sont recouverts par une autre couche (radios du
  choix de propriétaire dans simple-directory) : `dispatchEvent('click')`.

## Transitions (`v-stepper`, `v-window`, `v-expansion-panels`)

- Pendant un changement d'étape, l'ancienne et la nouvelle fenêtre sont toutes
  deux dans le DOM ; les étapes passées restent ensuite en `display:none`. Viser
  l'étape courante, et attendre la fin des animations entre deux clics :
  `await page.waitForFunction(() => document.getAnimations().every(a => a.playState !== 'running'))`.
- Une mesure de position (capture annotée, curseur de démonstration) prise en
  pleine transition est fausse : même attente avant de mesurer.

## Saisie

- `fill()` remplace la valeur, `pressSequentially()` l'allonge.
- Un champ numérique peut reformater la saisie : relire la valeur avant de
  continuer.

## Applications embarquées (`d-frame`)

Une application intégrée (traçabilité servie par le service d'évènements,
visualisation, formulaire d'un autre service) vit dans une iframe placée dans le
shadow DOM d'un `<d-frame>`. Un `getByText` de la page n'y voit rien : passer
par `page.frameLocator('iframe[src*="/events/embed"]')` (les sélecteurs CSS de
Playwright traversent les shadow roots ouverts). Ses outils WebMCP sont dans le
registre de l'iframe, pas de la page (voir `webmcp.md`).
