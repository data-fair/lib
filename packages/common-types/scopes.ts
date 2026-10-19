// The scope vocabulary a service declares: families (a resource, `datasets`), each with some of the
// tiers read < write < admin (`datasets:read`) and a bare umbrella (`datasets`), plus the global tier
// scopes all:read / all:write / all:admin shared by every service ("everything my role allows, at
// this tier"). Matching stays the one of session/index.ts (scopeCovers / hasScope): an enforcing
// service lists every scope it accepts, acceptedScopes builds that list.

export type ScopeTier = 'read' | 'write' | 'admin'
export type ScopeLocale = 'fr' | 'en'
export type LocalizedText = Record<ScopeLocale, string>
export type GlobalScope = 'all:read' | 'all:write' | 'all:admin'

export const scopeTiers: ScopeTier[] = ['read', 'write', 'admin']

export const globalScopes: Record<GlobalScope, LocalizedText> = {
  'all:read': {
    fr: 'Lire tout ce que permet le rôle, sur tous les services',
    en: 'Read everything the role allows, across services'
  },
  'all:write': {
    fr: 'Lire et modifier tout ce que permet le rôle, sur tous les services',
    en: 'Read and edit everything the role allows, across services'
  },
  'all:admin': {
    fr: 'Tous les droits que permet le rôle, sur tous les services',
    en: 'Every right the role allows, across services'
  }
}

export type ScopeFamilyDefinition = {
  tiers: ScopeTier[]
  descriptions: { umbrella: LocalizedText } & Partial<Record<ScopeTier, LocalizedText>>
}

export type ScopeVocabulary<F extends string> = {
  families: F[]
  /** the scopes that satisfy a tier of a family: its declared tiers at or above it, the umbrella, the global tier scopes at or above it */
  acceptedScopes: (family: F, tier: ScopeTier) => string[]
  /** every scope that reaches some tier of the family, for a coarse gate in front of its routes */
  familyScopes: (family: F) => string[]
  /** name -> description of every declared scope, the global tier scopes included */
  scopeDescriptions: (locale: ScopeLocale) => Record<string, string>
}

const familyRegexp = /^[a-z][a-z0-9-]*$/
const atOrAbove = (tier: ScopeTier) => scopeTiers.slice(scopeTiers.indexOf(tier))
const sortTiers = (tiers: ScopeTier[]) => scopeTiers.filter(t => tiers.includes(t))

export function defineScopes<F extends string> (definitions: Record<F, ScopeFamilyDefinition>): ScopeVocabulary<F> {
  const families = Object.keys(definitions) as F[]
  for (const family of families) {
    if (!familyRegexp.test(family)) throw new Error(`invalid scope family "${family}"`)
    if (family === 'all') throw new Error('the "all" scope family is reserved for the global tier scopes')
    for (const tier of definitions[family].tiers) {
      if (!definitions[family].descriptions[tier]) throw new Error(`scope ${family}:${tier} has no description`)
    }
  }
  const tiersOf = (family: F) => sortTiers(definitions[family].tiers)

  const acceptedScopes = (family: F, tier: ScopeTier) => {
    if (!tiersOf(family).includes(tier)) throw new Error(`scope family ${family} has no ${tier} tier`)
    return [
      ...tiersOf(family).filter(t => atOrAbove(tier).includes(t)).map(t => `${family}:${t}`),
      family,
      ...atOrAbove(tier).map(t => `all:${t}`)
    ]
  }

  const familyScopes = (family: F) => [family, ...tiersOf(family).map(t => `${family}:${t}`), ...Object.keys(globalScopes)]

  const scopeDescriptions = (locale: ScopeLocale) => {
    const out: Record<string, string> = {}
    for (const family of families) {
      const descriptions = definitions[family].descriptions
      out[family] = descriptions.umbrella[locale]
      for (const tier of tiersOf(family)) out[`${family}:${tier}`] = descriptions[tier]![locale]
    }
    for (const [scope, description] of Object.entries(globalScopes)) out[scope] = description[locale]
    return out
  }

  return { families, acceptedScopes, familyScopes, scopeDescriptions }
}

const schemeDescriptions: LocalizedText = {
  fr: "Jeton d'accès délivré par simple-directory. Un jeton sans claim de scope est une session de premier niveau, non restreinte. Un jeton avec scope ne donne accès qu'aux opérations couvertes par ses scopes, dans la limite du rôle de son identité.",
  en: 'Access token issued by simple-directory. A token without a scope claim is a first party session, unrestricted. A token with a scope claim only reaches the operations its scopes cover, within the role of its identity.'
}

/**
 * The OpenAPI oauth2 security scheme of a service: client credentials flow on simple-directory's
 * token exchange and the vocabulary's scopes (data-fair merges them into the platform document).
 */
export function oauth2SecurityScheme (vocabulary: Pick<ScopeVocabulary<string>, 'scopeDescriptions'>, options: { directoryUrl: string, locale: ScopeLocale }) {
  return {
    type: 'oauth2' as const,
    description: schemeDescriptions[options.locale],
    flows: {
      clientCredentials: {
        tokenUrl: `${options.directoryUrl}/api/auth/nhi-token`,
        scopes: vocabulary.scopeDescriptions(options.locale)
      }
    }
  }
}

/**
 * The oauth2 part of an operation's OpenAPI security: one alternative per accepted scope (standard
 * OpenAPI reads the scopes of one requirement as all needed). What a global tier scope grants is
 * read from the operations that list it.
 */
export function oauth2Alternatives (accepted: string | string[]): { oauth2: string[] }[] {
  return (Array.isArray(accepted) ? accepted : [accepted]).map(scope => ({ oauth2: [scope] }))
}
