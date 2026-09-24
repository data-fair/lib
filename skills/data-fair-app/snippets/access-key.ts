import { computed } from 'vue'
import type { Ref } from 'vue'

// Extraction de l'accessKey depuis window.APPLICATION.exposedUrl
// L'accessKey est présente quand l'app est accédée via un lien partagé

export function useAccessKey (): { accessKey: Ref<string | null> } {
  const last = window.APPLICATION?.exposedUrl?.split('/').pop()
  const toks = last?.split('%3A')
  const accessKey = computed<string | null>(() =>
    (toks?.length === 2) ? toks[0] : null
  )

  return { accessKey }
}

// Propagation aux embeds : `d-frame` n'a PAS d'attribut access-key. C'est
// data-fair qui interprète la clé, en préfixe de l'id de la ressource dans
// le chemin de l'URL ({accessKey}%3A{id}) :
//
// <d-frame
//   :src="`/data-fair/embed/dataset/${accessKey ? accessKey + '%3A' : ''}${datasetId}/table`"
//   :adapter="dFrameAdapter"
// />
//
// Même mécanique pour les apps : /data-fair/app/{accessKey}%3A{appId}
//
// L'accessKey n'a PAS besoin d'être propagée aux appels useFetch de l'app :
// - Les appels API sont authentifiés par le cookie de session
// - Le proxy DataFair vérifie l'accessKey au niveau de la requête entrante
// - Seuls les embeds d-frame (iframes séparées) ont besoin de l'accessKey
//   car ils n'héritent pas du cookie parent
