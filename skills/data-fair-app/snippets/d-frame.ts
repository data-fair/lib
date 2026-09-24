// Synchronisation des params entre l'app et les embeds d-frame.
// Voir SKILL.md > "Intégration iframe / d-frame" pour le modèle mental parent/enfant
// et references/embeds-params.md pour les conventions d'émission par type d'embed.
//
// Deux mécanismes complémentaires, à utiliser ensemble :
//   - createDFrameAdapter (ci-dessous) : côté parent, l'app EMBARQUE des d-frames
//   - window.vIframeOptions : côté enfant, l'app est EMBARQUÉE dans un d-frame
//     (portail, dashboard, autre app). Voir snippets/main.ts pour le setup.

import createDFrameAdapter from '@data-fair/frame/lib/vue-reactive/state-change-adapter.js'
import reactiveSearchParams from '@data-fair/lib-vue/reactive-search-params-global.js'

// Côté parent : créer l'adapter pour synchroniser les params entre l'app
// et les embeds d-frame qu'elle embarque.
const dFrameAdapter = createDFrameAdapter(reactiveSearchParams)

// Côté enfant : exposer reactiveSearchParams au shim v-iframe-compat injecté
// par DataFair. À mettre dans src/main.ts au niveau module, avant createApp().
// (voir snippets/main.ts)
// Pour que DataFair injecte ce shim, le index.html doit contenir :
//   <meta name="df:sync-state" content="true">
;(window as any).vIframeOptions = { reactiveParams: reactiveSearchParams }

// Côté enfant, redimensionnement (remplace iframe-resizer) : poser
// `data-iframe-height` sur la racine de l'app pour que le shim d-frame
// mesure sa hauteur et l'envoie au parent. Déclarer aussi
//   <meta name="df:overflow" content="true">   (si la visu peut grandir)
// dans index.html. Côté parent, le <d-frame> doit porter `resize="auto"` :
//   <d-frame :src="..." :adapter="dFrameAdapter" resize="auto" />
// Voir SKILL.md > "Intégration iframe / d-frame" > "Redimensionnement".

// Dans le composable config, exposer dFrameAdapter et accessKey.
// Dans le composant, utiliser d-frame avec l'adapter ; l'accessKey n'est PAS
// un attribut de d-frame mais un préfixe de l'id dans le chemin de l'URL
// ({accessKey}%3A{id}), interprété côté data-fair (voir snippets/access-key.ts).

// Exemple d'utilisation dans un composant Vue :
/*
<template>
  <d-frame
    :src="`/data-fair/embed/dataset/${accessKey ? accessKey + '%3A' : ''}${datasetId}/table`"
    :adapter="dFrameAdapter"
  />
</template>

<script setup lang="ts">
import { useConfig } from '@/composables/config'

const { dFrameAdapter, accessKey } = useConfig()
</script>
*/

// Exemple avec plusieurs embeds :
/*
<template>
  <v-row>
    <v-col cols="6">
      <d-frame
        :src="`/data-fair/embed/dataset/${accessKey ? accessKey + '%3A' : ''}${mainDatasetId}/table`"
        :adapter="dFrameAdapter"
      />
    </v-col>
    <v-col cols="6">
      <d-frame
        :src="`/data-fair/embed/dataset/${accessKey ? accessKey + '%3A' : ''}${secondaryDatasetId}/map`"
        :adapter="dFrameAdapter"
      />
    </v-col>
  </v-row>
</template>
*/
