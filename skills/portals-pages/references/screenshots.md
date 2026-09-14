# Captures d'écran annotées

Convention pour toute capture destinée à une page de portail (cours, tutoriel, page d'aide) : thème **clair**, largeur **1440 px**, **aucune barre de défilement**, annotations en **rectangles rouges + badges carrés numérotés** (`#e53935`). Le script `scripts/annotate.js` applique la convention et **refuse** les captures dont la géométrie est mauvaise.

Outils : le navigateur du MCP Playwright — `browser_evaluate` pour installer et piloter le script, `browser_resize` pour le viewport, `browser_take_screenshot` pour la capture (pleine page ou d'un élément par sa `ref`).

## 1. Flux

1. **Installer** : passer le contenu entier de `scripts/annotate.js` comme `function` de `browser_evaluate`. Il installe `window.ANNO` et renvoie `'ready'`. À refaire après chaque navigation (la page est rechargée).
2. **Marquer et vérifier**, en **un seul** second appel :

   ```js
   () => {
     ANNO.reset()
     ANNO.mark(ANNO.field("URL de l'API"), 1)
     ANNO.mark(ANNO.sel('.v-card'), 2)
     return ANNO.commit()          // [] => bon pour la capture
   }
   ```

   `commit()` place les marques, les dessine, puis **vérifie le résultat**. Un tableau non vide veut dire *ne pas capturer* : corriger d'abord.
3. **Capturer** avec `browser_take_screenshot` (fichier PNG).
4. **Relire le PNG** avec l'outil de lecture d'image avant de le livrer (voir §4).

Sélecteurs fournis par `ANNO`, tous filtrés sur le **visible** :

| Helper | Cible |
| --- | --- |
| `ANNO.sel(css, index = 0)` | le `index`-ième élément visible du sélecteur |
| `ANNO.field(label)` | le `.v-field` d'un champ Vuetify par son libellé (exact, puis préfixe) |
| `ANNO.text(needle, css = '*')` | l'élément le plus profond contenant ce texte |
| `ANNO.span([el, el…])` | le rectangle englobant plusieurs éléments (une plage de lignes) |

`ANNO.dump()` renvoie la géométrie dessinée (après `commit()`), utile quand la capture semble fausse.

## 2. Codes de rejet

| Code | Ce qu'il empêche |
| --- | --- |
| `cible-introuvable` | Le sélecteur ne rend rien de visible. |
| `cible-fantome` | Le stepper garde l'étape précédente en `display:none` et `querySelector` attrape le fantôme → rectangle 0×0 en haut à gauche. Tous les sélecteurs d'`ANNO` filtrent sur le visible. |
| `cible-hors-cadre` | La cible déborde du viewport : fixer la hauteur **avant** d'annoter, pas après. |
| `rectangles-jointifs` / `rectangles-superposes` | Deux cadres qui se touchent forment une barre rouge double. Quand les cibles sont contiguës (lignes de code, lignes de tableau), **encadrer le bloc parent et numéroter dedans**. |
| `badge-recadre` | Un badge qui devrait sortir du cadre : il ne désigne plus sa cible. Agrandir la capture. |
| `badges-sans-place` | Aucun côté ne loge tous les badges. Élargir la capture. |
| `badge-trop-loin-de-sa-cible` | Un badge à plus de 36 px de son cadre ne le désigne plus. Soit aligner les bords droits des cadres, soit passer le conteneur : `ANNO.commit(ANNO.sel('.panel'))`. |
| `badge-sur-autre-cadre` / `badges-superposes` | Un badge posé en marge se retrouve à hauteur d'un autre élément et désigne la mauvaise chose. |
| `viewport-instable` | La largeur a bougé pendant le rendu. |

Deux invariants portent tout le reste :

- **Le rectangle est toujours dessiné à l'intérieur** de la boîte de la cible (inset de 3 px). Une bordure qui déborde mord le contrôle voisin (typiquement un bouton collé à 3 px du suivant).
- **Tous les badges d'une image partagent la même abscisse.** Par défaut la colonne se pose à droite du plus large des cadres ; quand les cibles vivent dans une carte et ont des largeurs très différentes, accrocher la colonne à la carte avec `ANNO.commit(conteneur)`. Un seul mode par image, jamais deux.

Un cadre qui couvre une plage de lignes doit **respirer** : si l'interligne est serré, la bordure tombe sur les glyphes. Aérer le bloc avant d'annoter plutôt que réduire l'inset.

## 3. Réglages avant d'annoter

- **Thème clair** : forcer la préférence de thème de l'application (ou l'émulation `prefers-color-scheme` du navigateur) et le vérifier à l'œil sur la capture. Après **chaque** navigation, le viewport **et** le thème peuvent se réinitialiser → refixer avant d'annoter.
- **Viewport** : `browser_resize` en 1440 × H. Choisir H pour que toutes les cibles tiennent (sinon `cible-hors-cadre`). Un formulaire long se capture sur toute sa hauteur ; un écran court (sélection, résultat) sur un viewport court (~360–500 px), **largeur 1440 conservée**.
- **Fragment court** (une liste, un bloc de permissions) : préférer la **capture d'élément** (`browser_take_screenshot` avec la `ref` du nœud) — pas de barre de défilement, pas de calcul de hauteur.
- **Widgets en iframe** : ils sont clippés par la hauteur de l'iframe et la capture d'élément les coupe → ouvrir l'URL de l'iframe en pleine page (elle est dans le `src`) et capturer là.
- Si la capture expire, réessayer une fois.

## 4. Contrôle à l'œil

`ANNO.commit()` attrape la géométrie, pas le contenu. Relire chaque PNG et contrôler :

- un badge qui chevauche une **icône** (aide `i`, loupe, croix d'effacement) → décaler la cible ;
- une **valeur aberrante** dans un champ numérique (« 030 » minutes) : `browser_type` / `browser_fill_form` **ajoutent** au contenu existant et les spinners concatènent — vider puis réécrire via le setter natif et **relire `input.value`** avant de capturer ;
- du **bruit produit** sans rapport avec l'utilisateur (avertissement de dépréciation dans un journal d'exécution) → le masquer avant capture et le signaler dans le livrable ;
- un **secret** visible dans un formulaire (clé, mot de passe) → valeur d'exemple ou champ masqué, jamais une vraie valeur.

## 5. Nommer et ranger

Un jeu de captures par page, nommé dans l'ordre de lecture : `01-<etape>.png`, `02-<etape>.png`… Le nom décrit l'écran (`01-config.png`, `02-select-resource.png`, `03-import-result.png`), pas la date. Les captures sont ensuite uploadées dans la médiathèque de la page (voir `api-workflow.md`, « Uploader une image ») et dimensionnées selon `elements.md` (`image`).
