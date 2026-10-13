type Obj = Record<string, any>

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)

const merge = (target: Obj, source: Obj) => {
  for (const [key, value] of Object.entries(source)) {
    target[key] = isObj(value) && isObj(target[key]) ? merge({ ...target[key] }, value) : value
  }
  return target
}

/**
 * Config overrides (dev/dev.json "optional") of the optional compose services that are not running.
 * Exported as NODE_CONFIG by the api pane: node-config merges it over the config files, like a
 * local-development file but without touching one the developer may already have.
 */
export const absentConfig = (optional: Record<string, Obj>, running: string[]) => {
  const result: Obj = {}
  for (const [service, overrides] of Object.entries(optional)) {
    if (!running.includes(service)) merge(result, overrides)
  }
  return result
}
