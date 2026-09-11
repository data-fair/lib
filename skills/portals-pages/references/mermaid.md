# Diagrammes Mermaid

Bloc dédié : `{ "type": "mermaid", "uuid": "…", "code": "…", "description": "…" }`.
Disponible depuis portals **2.33.0**. Il n'y a **pas** de rendu Mermaid dans les blocs `text` (une clôture ` ```mermaid ` reste du code brut).

## Comment le bloc rend le diagramme

Le composant (`portal/app/components/page-element/basic/page-element-mermaid.vue`) :

- importe `mermaid` **côté client** (le rendu serveur affiche un loader, puis le SVG remplace le loader) ;
- initialise avec `securityLevel: 'strict'`, `theme: 'base'`, `startOnLoad: false`, `suppressErrorRendering: true`, et des variables de thème dérivées du portail ;
- applique le résultat dans un conteneur `role="img"` + `aria-label` (issu de `description`) ;
- en cas d'erreur de syntaxe : un avertissement en prévisualisation d'édition, sinon le code source dans un `<pre>`.

Variables de thème fournies par le portail (`portal/app/utils/mermaid.ts`) : `darkMode`, `background`, `primaryColor` (couleur primaire du portail), `primaryTextColor`, `lineColor`, `textColor`, `fontFamily: inherit`. Le reste est dérivé par le thème `base` — d'où des fonds de grappes jaune/orange peu prévisibles selon le thème du portail.

## Règle n°1 : la largeur naturelle

Le SVG est inséré avec `width: 100%` et `max-width: <largeur naturelle>`. Conséquence : un diagramme naturellement plus large que la colonne de contenu est **réduit**, et la police avec lui. Mesures faites sur le portail de démonstration (colonne de contenu ≈ 720 px) :

| Diagramme | viewBox naturel | Affiché | Échelle | Police effective (`fontSize: 16px`) | Verdict |
| --- | --- | --- | --- | --- | --- |
| `flowchart LR` avec 4 jeux en ligne + 3 grappes | 1869 px | 668 px | 0,36 | **5 px** | illisible |
| `flowchart TB`, libellés courts, grappes empilées | 763 px | 721 px | 0,95 | **15 px** | lisible |

Règles pratiques :

- préférer **`flowchart TB`** (flux vertical) à `LR` : la page est verticale, et le nombre de colonnes parallèles est ce qui élargit le diagramme ;
- **libellés courts** (1-3 mots par ligne, `<br/>` pour aérer) : la largeur d'un nœud suit son texte ;
- viser une largeur naturelle **≤ ~750 px** ; après rendu, vérifier `scale ≥ 0,9` et une police effective ≥ 11 px (snippet dans `references/api-workflow.md`) ;
- garder `fontSize: 16px` dans la directive : monter la police fait croître la largeur naturelle dans les mêmes proportions, le gain est nul ;
- un diagramme plus **haut** qu'avant ne pose pas de problème (la page défile).

## Règle n°2 : neutraliser les couleurs du thème `base`

Pour éviter les fonds jaunes/orange dérivés du thème, commencer le `code` par une directive `init` explicite :

```
%%{init: {"theme": "base", "themeVariables": {"primaryColor": "#ffffff", "primaryTextColor": "#212121", "primaryBorderColor": "#1565c0", "lineColor": "#78909c", "secondaryColor": "#ffffff", "tertiaryColor": "#ffffff", "clusterBkg": "#ffffff", "clusterBorder": "#90a4ae", "fontSize": "16px"}}}%%
```

Rendu : nœuds blancs à bordure bleue, grappes blanches à bordure grise, texte sombre — lisible sur les thèmes clairs comme sombres, sans dépendre de la palette du portail.

## Syntaxe : pièges utiles

- Les libellés entre guillemets acceptent accents, `()`, `+`, `/`, `%`. `&` et `#` sont risqués (`#` peut être pris pour une entité HTML) : écrire « arrêts », « tracés » plutôt que `#Stop` / `#Route`.
- `<br/>` fonctionne dans les libellés (HTML sanitisé par `securityLevel: 'strict'`).
- Liens entre sous-graphes : `PROC --> DF` où `DF` est l'id du `subgraph` — beaucoup plus lisible que de relier chaque nœud interne.
- `direction TB` à l'intérieur d'un sous-graphe n'est pas toujours respecté quand le flux parent est `LR` ; préférer un flux global `TB`.

## Exemple complet (chaîne GTFS)

```
%%{init: {"theme": "base", "themeVariables": {"primaryColor": "#ffffff", "primaryTextColor": "#212121", "primaryBorderColor": "#1565c0", "lineColor": "#78909c", "secondaryColor": "#ffffff", "tertiaryColor": "#ffffff", "clusterBkg": "#ffffff", "clusterBorder": "#90a4ae", "fontSize": "16px"}}}%%
flowchart TB
    SRC["Archive GTFS<br/>HTTP, FTP, SFTP"] --> PROC["Plugin processing-gtfs"]
    PROC -->|"archive zip"| VAL["Validateur transport-validator<br/>validation.transport.data.gouv.fr"]
    VAL -.->|"anomalies Fatal / Error / Warning"| PROC
    PROC --> DF["Jeux de données Data Fair<br/>métadonnées + arrêts + horaires + tracés<br/>+ flux GTFS-RT en pièce jointe"]
    DF --> PUB["Publication sur data.gouv.fr"]
    PUB --> PAN["Moissonnage par transport.data.gouv.fr<br/>(Point d'accès national)"]
    DF -.->|"temps réel"| MAP["Carte du réseau temps réel<br/>sur le portail"]
```

Toujours fournir une `description` d'accessibilité : c'est l'alternative textuelle lue par les lecteurs d'écran et un bon garde-fou éditorial.

## Repli si le bloc n'existe pas

Sur une cible portals antérieure à 2.33 (ou en v1) :

- rendre le diagramme en amont et l'insérer comme image : `npx -y @mermaid-js/mermaid-cli -i diagram.mmd -o diagram.svg`, puis upload dans la médiathèque du portail (bloc `image`) ;
- ou utiliser `https://mermaid.ink/svg/<base64 du code>` dans un bloc `image` — pratique mais dépendant d'un service tiers, à éviter pour un contenu durable.
