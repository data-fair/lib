// ─────────────────────────────────────────────────────────────────────────────
// Schéma VJSF — Génération de types TypeScript (x-exports)
// ─────────────────────────────────────────────────────────────────────────────

// Le schéma (public/config-schema.json) génère automatiquement les types
// TypeScript utilisés dans le code de l'app.

export default {
  // Seul export nécessaire : le fichier servi à DataFair est le schéma lui-même
  'x-exports': ['types'],

  type: 'object',
  // ... le reste du schéma
  properties: {
    datasets: { /* ... */ },
    chart: { /* ... */ }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline de build
// ─────────────────────────────────────────────────────────────────────────────

// 1. Le schéma vit là où il est servi, édité à la main, avec ses $defs et $ref
//    public/config-schema.json

// 2. Ré-export d'une ligne, uniquement pour que df-build-types le trouve
//    src/config/schema.ts
//    export { default } from '../../public/config-schema.json' with { type: 'json' }

// 3. Génération des types (dans package.json)
//    "build-types": "df-build-types src/config"

// 4. Fichiers générés dans src/config/.type/ (git-ignorés)
//    • index.d.ts        → types TypeScript (importés dans le code)
//    • index.js          → runtime types (si besoin)

// 5. Utilisation dans le code
//    import type { _JlResolved } from '@/config/.type/index.js'
//    export type AnyConfig = _JlResolved

// ─────────────────────────────────────────────────────────────────────────────
// Bonnes pratiques
// ─────────────────────────────────────────────────────────────────────────────

// • Servir le schéma avec ses $ref — jamais .type/resolved-schema.json, qui
//   inline chaque $ref et multiplie ce que json-layout doit compiler, à chaque
//   montage du formulaire (cf. SKILL.md § Pipeline de build)
// • Ne jamais modifier manuellement les fichiers dans src/config/.type/
// • Relancer "npm run build-types" après chaque modification du schéma
