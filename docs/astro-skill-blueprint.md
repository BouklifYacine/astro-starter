# Blueprint — Skill Astro sur mesure

> Document de conception. Inventaire exhaustif de ce que le skill doit couvrir, avant écriture.
> Base de vérité : **Astro 6** (doc officielle consultée le 2026-08-12).

---

## 0. Contexte & décisions

| Décision | Choix retenu |
|---|---|
| Adaptateurs à couvrir en profondeur | **Cloudflare Workers**, **Vercel**, **Node / VPS / Docker** |
| Types de projet cibles | **Site vitrine / marketing** + **Blog / contenu / docs** |
| Intégrations à documenter | **Tailwind v4 + design system**, **islands React/Vue/Svelte**, **CMS headless / data externe**, **SEO / i18n / analytics** |
| Format | **SKILL.md court (routeur) + `references/` modulaires** chargés à la demande |

### Conséquences directes sur le contenu

- Vitrine + blog ⇒ **`output: 'static'` par défaut**, on-demand à la carte (`export const prerender = false`) ou via **server islands**. Le skill doit *décourager* `output: 'server'` global pour ces deux cas.
- Trois adaptateurs ⇒ il faut une **matrice de portabilité** (ce qui marche partout vs ce qui est spécifique) sinon le code écrit pour Cloudflare cassera sur Node et inversement.
- CMS headless ⇒ **loaders Content Layer custom** + **live collections** (nouveau en 6, stable) + stratégie d'invalidation (webhook rebuild vs ISR vs cache).

---

## 1. État des lieux des skills existants

| Skill | Verdict | Détail |
|---|---|---|
| `.agents/skills/astro-expert/` (Smithery) | **À supprimer** | Contenu générique, tronqué en plein milieu (`"Write concise, techni"`), et **faux sur Astro 6** : recommande `Astro.glob()` (supprimé), `src/content/config.ts` (déplacé en `src/content.config.ts`), impose Tailwind comme une règle Astro, "Iron Law" n°5 formulée autour d'une API morte. Protocole mémoire qui pointe vers un fichier inexistant. |
| `.agents/skills/astro-framework-specialist/` | **Base à reprendre** | Structure et ton corrects (workflow d'inspection, décisions de rendu, checklist de revue). Manque : routing avancé, adaptateurs, intégrations concrètes, déploiement, SEO/i18n, perf mesurée, Astro 6. Emploie encore le vocabulaire "hybrid" (mode supprimé depuis Astro 5). |

**Plan** : nouveau skill `astro` (nom court, invocable), qui absorbe le meilleur de `astro-framework-specialist`, et suppression des deux anciens + de l'entrée `skills-lock.json`.

---

## 2. Architecture de fichiers proposée

```
.agents/skills/astro/
├── SKILL.md                      # ~150 lignes : identité, workflow, arbre de décision, table de routage vers references/
├── references/
│   ├── 01-rendering-routing.md   # static/server, prerender, routing, priorité, redirects, rewrites, endpoints
│   ├── 02-adapters.md            # Cloudflare / Vercel / Node : matrice + config + pièges
│   ├── 03-content.md             # Content Layer, loaders, schémas Zod 4, live collections, CMS headless
│   ├── 04-islands.md             # hydratation, directives client:*, server:defer, state partagé
│   ├── 05-styling.md             # Tailwind v4, styles scoped, cascade, design tokens
│   ├── 06-assets.md              # astro:assets, responsive images, Fonts API, OG images
│   ├── 07-seo-i18n.md            # sitemap, robots, canonical, hreflang, i18n routing, schema.org
│   ├── 08-server-data.md         # middleware, actions, sessions, endpoints, env & secrets
│   ├── 09-perf-security.md       # budget JS, CWV, CSP, cache, prefetch, ClientRouter
│   ├── 10-integrations-api.md    # écrire/auditer une intégration, hooks, injectRoute…
│   └── 11-astro6-migration.md    # breaking changes v5→v6 + détection de version
├── templates/                    # snippets copiables (content.config.ts, middleware, astro.config par adapter)
└── checklists/
    ├── review.md                 # checklist de revue de code
    └── ship.md                   # checklist avant déploiement
```

**Règle de chargement** (à écrire dans SKILL.md) : ne jamais charger plus de 2 références par tâche ; le SKILL.md contient la table « symptôme → fichier ».

---

## 3. TABLE MAÎTRESSE — modules × contenu × pièges

Priorité : **P0** = sans ça le skill est inutile · **P1** = fort différenciant · **P2** = confort.

| # | Module | Ce que le skill doit contenir | Piège principal évité | Prio |
|---|---|---|---|---|
| 01 | Rendu & routing | Arbre de décision static/on-demand, `prerender` par route, ordre de priorité des routes, `getStaticPaths`, params rest, redirects, rewrites, 404/500, endpoints | Passer tout le site en `output: 'server'` pour une seule page dynamique | P0 |
| 02 | Adaptateurs | Matrice CF/Vercel/Node, config type par cible, accès aux bindings, limites runtime, headers/cache | Écrire du code Node (`fs`, `process.env`) qui casse sur workerd | P0 |
| 03 | Contenu | `src/content.config.ts`, loaders `glob`/`file`/custom, Zod 4, `reference()`, `render()`, live collections | Utiliser `Astro.glob()` (supprimé en v6) ou l'ancien dossier `src/content/config.ts` | P0 |
| 04 | Islands | Choix de la directive, coût JS réel, `server:defer`, state partagé, `client:only` | `client:load` partout ⇒ Astro devient un SPA lent | P0 |
| 05 | Styling | Tailwind 4 via `@tailwindcss/vite`, scoped styles, `is:global`, `define:vars`, ordre de cascade | Installer `@astrojs/tailwind` (obsolète) ou casser l'ordre des styles en v6 | P1 |
| 06 | Assets | `<Image>`/`<Picture>`, `layout` responsive, `priority`, remote patterns, Fonts API, OG images | Image service incompatible avec l'adaptateur ⇒ build vert, prod cassée | P0 |
| 07 | SEO & i18n | `@astrojs/sitemap`, canonical, OG/Twitter, JSON-LD, hreflang, config i18n, helpers `astro:i18n` | `redirectToDefaultLocale` dont le défaut a changé en v6 | P1 |
| 08 | Serveur & données | Middleware, Actions, Sessions, endpoints API, `astro:env`, secrets | Utiliser une Action/session sur une page prerendue | P0 |
| 09 | Perf & sécurité | Budget JS, CWV, CSP intégré, `Astro.cache` (exp.), prefetch, `<ClientRouter />` | CSP qui casse les scripts inline des islands | P1 |
| 10 | API d'intégration | Hooks, `injectRoute`, `addMiddleware`, `injectTypes`, audit d'une intégration tierce | Intégration tierce non maintenue qui bloque la montée en version | P2 |
| 11 | Migration v6 | Liste des breaking changes, détection de version installée, procédure `@astrojs/upgrade` | Le modèle applique des patterns Astro 4/5 sur un projet 6 | P0 |

---

## 4. Détail par domaine

### A. Rendu & routing (`01-rendering-routing.md`)

| Sujet | Contenu du skill | Piège / erreur classique | Prio |
|---|---|---|---|
| Modes de sortie | `output: 'static'` (défaut) ou `'server'` uniquement. **`'hybrid'` n'existe plus** | Le skill actuel parle encore de "hybrid" | P0 |
| Opt-in/out par route | `export const prerender = false` (en static) / `= true` (en server) | Oublier que le fichier entier bascule, pas juste un composant | P0 |
| Arbre de décision | Donnée à la requête ? cookie/session ? perso ? → sinon static | Passer en server "au cas où" | P0 |
| Ordre de priorité des routes | 1. routes réservées (`_astro/`, `_server_islands/`, `_actions/`) · 2. chemins plus spécifiques · 3. statiques > dynamiques · 4. `[param]` > `[...rest]` · 5. dynamique prerendue > dynamique serveur · 6. endpoints > pages · 7. fichiers > redirects · 8. alphabétique | Créer `[...slug].astro` à la racine qui avale tout | P0 |
| `getStaticPaths()` | Retour `{ params, props }`, pagination via `paginate()`, un seul rest param par fichier | Accéder à `Astro.request`/cookies dedans | P0 |
| Params rest | `[...path]` avec `undefined` pour la racine | Slug de collection contenant `/` sans rest param | P1 |
| Redirects config | `redirects: { '/old': '/new', '/old/[...s]': '/new/[...s]' }`, objet `{ status, destination }` en SSR | Croire qu'un redirect override un fichier existant (non) | P1 |
| Rewrites | `Astro.rewrite()` / `next('/path')` — re-exécute le middleware | Boucle de rewrite infinie | P1 |
| Endpoints API | `src/pages/api/*.ts`, export `GET`/`POST`, `Response` standard | En v6 : **pas de trailing slash sur les endpoints à extension**, quelle que soit `build.trailingSlash` | P1 |
| Pages 404/500 | `src/pages/404.astro`, `500.astro`, comportement selon adaptateur | 404 custom non servie en static sur certains hébergeurs | P1 |
| Exclusion | Préfixe `_` pour fichiers/dossiers non routés | Composants posés dans `src/pages/` | P2 |
| `trailingSlash` | Cohérence config ↔ liens internes ↔ canonical ↔ redirects hébergeur | Double redirect 301 qui pénalise le SEO | P1 |

### B. Adaptateurs (`02-adapters.md`) — le cœur du sujet

**Matrice de portabilité** (le tableau le plus utile du skill) :

| Capacité | Cloudflare Workers | Vercel | Node (standalone) |
|---|---|---|---|
| Runtime | `workerd` (dev **et** prod depuis v6) | Node serverless / edge | Node 22+ |
| API Node | Partiel, nécessite `nodejs_compat` + compat date ≥ 2024-09-23 | Complet (runtime node) | Complet |
| Accès env | `import { env } from 'cloudflare:workers'` — **`Astro.locals.runtime` supprimé** | `process.env` | `process.env` |
| Secrets locaux | `.dev.vars` + `wrangler secret put` | `.env` + dashboard | `.env` |
| Sessions | KV auto-provisionné (`sessionKVBindingName`, défaut `SESSION`) | driver à configurer | filesystem par défaut |
| Images | `imageService: 'cloudflare-binding'` (défaut), `'cloudflare'`, `'passthrough'`, `'compile'` | Vercel Image Optimization, `devImageService` | `sharp` |
| Cache / revalidation | Caches API + `_headers` | **ISR** (`expiration`, `bypassToken`, exclusions) | à gérer soi-même (reverse proxy) |
| Streaming HTML | oui | oui | oui (`experimentalDisableStreaming` pour couper) |
| Middleware edge | via Workers | `edgeMiddleware` + `middlewareMode: 'edge'` (locals sérialisés en JSON) | n/a |
| Géoloc / contexte | `Astro.request.cf`, `Astro.locals.cfContext` (`waitUntil`) | headers Vercel | headers proxy |
| Fichiers statiques | assets Workers, `_headers` / `_redirects` dans `public/` | automatique | servis par l'adaptateur (ou CDN) |

**Points à documenter par adaptateur :**

| Adaptateur | À couvrir | Pièges spécifiques |
|---|---|---|
| Cloudflare | `wrangler.jsonc` minimal (`name` + `main: "@astrojs/cloudflare/entrypoints/server"`), `wrangler types`, bindings D1/KV/R2, `prerenderEnvironment: 'node' \| 'workerd'`, entrypoint Worker custom, déploiement multi-env (`CLOUDFLARE_ENV=... astro build && wrangler deploy`) | **Support Cloudflare Pages supprimé** (migrer vers Workers) · deps CommonJS qui explosent dans workerd · prérendu qui tourne désormais dans workerd par défaut · KV en cohérence éventuelle (~60 s) |
| Vercel | `isr`, `maxDuration`, `imagesConfig`, `webAnalytics`, `skewProtection` | ISR ignore les query params · edge middleware sérialise `locals` en JSON (pas d'objets complexes) |
| Node | `mode: 'standalone' \| 'middleware'`, `HOST`/`PORT`, `SERVER_CERT_PATH`, `bodySizeLimit`, `staticHeaders`, Dockerfile type | En mode middleware, **les statiques ne sont pas servis** : à câbler soi-même · pas de chargement auto du `.env` |
| Aucun (static pur) | Build 100 % statique, hébergement objet/CDN | Utiliser une Action/session/middleware runtime sans adaptateur | 

**Règle transverse à écrire** : *toute API runtime doit être choisie en fonction de l'adaptateur déclaré dans `astro.config`* ; si le projet vise plusieurs cibles, isoler l'accès plateforme derrière un module `src/lib/platform.ts`.

### C. Contenu & CMS (`03-content.md`)

| Sujet | Contenu du skill | Piège | Prio |
|---|---|---|---|
| Content Layer | `src/content.config.ts` + `defineCollection({ loader, schema })` | Ancien `src/content/config.ts` + collections legacy (supprimées en v6) | P0 |
| Loaders builtin | `glob()` (1 fichier = 1 entrée), `file()` (1 fichier = N entrées, `id` obligatoire) | `file()` sans `id` explicite | P0 |
| Loaders custom | Contrat du Loader API pour CMS/API/DB, cache & `digest`, `store` | Refetch complet à chaque build (build lent) | P1 |
| Schémas | **Zod 4** importé de `astro/zod` (plus `astro:content`), `z.email()` au lieu de `z.string().email()`, `createSchema()` pour les loaders | Copier des schémas Zod 3 | P0 |
| Références | `reference('authors')`, résolution via `getEntry()` | Oublier de résoudre la référence avant rendu | P1 |
| Rendu | `render(entry)` → `<Content />` + `headings` | Ancien `entry.render()` | P1 |
| Requêtes | `getCollection(name, filter)`, `getEntry()` | **Ordre non déterministe** : toujours trier explicitement | P0 |
| Drafts | Filtrer `draft` via schéma + filtre de collection, distinguer dev/prod | Drafts publiés en prod | P1 |
| Live collections | `src/live.config.ts`, `defineLiveCollection`, `getLiveCollection`/`getLiveEntry`, gestion d'erreur explicite, `cacheHint` | **Pas de MDX, pas d'optimisation d'image, pas de persistance** · nécessite un adaptateur | P1 |
| Images dans le contenu | helper `image()` dans le schéma | Chemin string au lieu de l'import | P1 |
| CMS headless | Patterns Sanity / Storyblok / Directus / Notion : loader custom vs client direct, preview/draft mode, webhook → rebuild vs live collection | Fetch CMS dans le frontmatter d'un composant (N+1 requêtes) | P1 |
| Markdown/MDX | `@astrojs/mdx`, remark/rehype, Shiki 4, composants dans MDX | v6 : **les IDs de titres conservent les tirets finaux** (ancres cassées après migration) | P1 |
| Sync | `astro sync` / `s + Enter` après changement de schéma | Types périmés, erreurs fantômes | P2 |

### D. Islands & hydratation (`04-islands.md`)

| Sujet | Contenu | Piège | Prio |
|---|---|---|---|
| Décision | Arbre : contenu statique → `.astro` · interaction → island · besoin de données requête → `server:defer` | Utiliser React pour du markup statique | P0 |
| Directives | `client:load` / `idle` / `visible` (+ `{rootMargin}`) / `media` / `only` | `client:load` par défaut réflexe | P0 |
| Absence de directive | Volontaire = HTML statique, 0 JS framework | Croire à un oubli et « corriger » | P0 |
| `client:only` | Nécessite le nom du framework, casse le SSR/SEO | Utilisé pour contourner une erreur SSR au lieu de la corriger | P1 |
| Server islands | `server:defer`, slot `fallback`, props **sérialisables** (pas de fonctions, pas de cycles), GET chiffré ~2048 o puis POST non caché | `Astro.url` = URL de l'island, pas de la page (lire `Referer`) · déploiements rolling → fixer `ASTRO_KEY` (`astro create-key`) | P1 |
| State partagé | nanostores entre islands, ou remonter l'état dans un seul island | Context React à travers des islands séparés (ne marche pas) | P1 |
| Scripts vanilla | `<script>` (bundlé, scoped) vs `is:inline` vs island | Charger 40 ko de framework pour un toggle de menu | P0 |
| Passage de props | Sérialisation des props d'island, coût dans le HTML | Passer un objet CMS entier à un island | P1 |
| Slots | `<slot />` dans un island framework, limites | Slots Astro dans un composant `client:only` | P2 |

### E. Styling & design system (`05-styling.md`)

| Sujet | Contenu | Piège | Prio |
|---|---|---|---|
| Tailwind v4 | `astro add tailwind` → plugin **`@tailwindcss/vite`** + `@import "tailwindcss";` dans un CSS | Installer/garder `@astrojs/tailwind` (v3, obsolète) | P0 |
| Design tokens | `@theme` Tailwind 4, variables CSS, dark mode, cohérence avec les tokens du projet | Dupliquer les tokens entre Tailwind et le CSS scoped | P1 |
| Styles scoped | `<style>` scoped par défaut, `:global()`, `is:global` | Fuite de styles via `is:global` généralisé | P1 |
| `define:vars` | Passage de variables serveur → CSS | Attend une valeur non sérialisable | P2 |
| Ordre de cascade | `<link>` < imports < scoped ; **v6 : scripts et styles rendus dans l'ordre de déclaration** (inversé avant) | Régression visuelle silencieuse à la migration | P1 |
| Inline vs link | `inlineStylesheets`, `assetsInlineLimit` (4 ko) | CSS critique en `<link>` bloquant | P2 |
| `class:list` | Composition conditionnelle de classes | Concaténation manuelle bugguée | P2 |

### F. Assets : images & fonts (`06-assets.md`)

| Sujet | Contenu | Piège | Prio |
|---|---|---|---|
| `<Image />` | Import depuis `src/`, dimensions inférées, `alt` obligatoire | `<img>` brut pour une image locale optimisable | P0 |
| `<Picture />` | `formats={['avif','webp']}` + fallback | Générer 6 formats inutiles | P2 |
| Responsive | `layout: 'constrained' \| 'full-width' \| 'fixed'`, `priority`, `fit`, `position`, breakpoints configurables | Absence de `priority` sur l'image LCP | P0 |
| Sources | `src/` (optimisé) vs `public/` (brut) vs distant (autorisation requise) | Image distante non optimisée faute de `image.domains`/`remotePatterns` | P1 |
| `getImage()` | Génération programmatique (OG images, endpoints) | **Throw si appelé côté client** en v6 | P1 |
| Image services | `sharp` (défaut), `passthrough`, no-op, service de l'hébergeur | Service incompatible avec l'adaptateur (cf. matrice B) | P0 |
| Changements v6 | Crop activé par défaut sans `fit` · **jamais d'upscaling** · `format` rasterise les SVG | Images qui changent de rendu après migration | P1 |
| SVG | Import de composant SVG, props `width`/`height`/`fill` | **Indisponible dans un composant framework** | P1 |
| Fonts API | `fonts: [{ provider, name, cssVariable, weights, subsets, fallbacks }]` + `<Font cssVariable preload />` depuis `astro:assets` | Preload de toutes les fontes ⇒ concurrence avec le LCP | P1 |
| Fallbacks | `optimizedFallbacks` (réduction du CLS) | Désactiver sans mesurer | P2 |
| OG images | Génération dynamique via endpoint + `experimental_getFontFileURL()` | Police introuvable en runtime edge | P2 |

### G. SEO, i18n, analytics (`07-seo-i18n.md`)

| Sujet | Contenu | Piège | Prio |
|---|---|---|---|
| Head component | Composant `<SEO>` centralisé : title/description, canonical absolue, OG, Twitter, robots | Balises dupliquées entre layout et page | P0 |
| `site` | Config `site` obligatoire pour canonical/sitemap/RSS | Canonical relative | P0 |
| Sitemap | `@astrojs/sitemap`, filtres, `customPages`, i18n | Pages noindex présentes dans le sitemap | P1 |
| robots.txt | Généré ou statique, lien vers le sitemap | robots.txt bloquant en prod par copier-coller de staging | P1 |
| JSON-LD | Organization / WebSite / Article / BreadcrumbList typés | Schema inventé non validé | P1 |
| RSS | `@astrojs/rss` + collection blog | Contenu tronqué / dates invalides | P1 |
| i18n routing | `i18n: { locales, defaultLocale, routing, fallback, domains }`, `prefixDefaultLocale`, `manual` | **v6 : `redirectToDefaultLocale` passe à `false` par défaut et ne s'applique que si `prefixDefaultLocale: true`** | P1 |
| Helpers | `getRelativeLocaleUrl()`, `Astro.currentLocale`, `Astro.preferredLocale` | URLs de langue codées en dur | P1 |
| hreflang | Générés depuis la config i18n, self-référence incluse | hreflang sans réciprocité | P1 |
| Fallback de langue | `fallbackType: 'redirect' | 'rewrite'` | Rewrite qui expose du contenu non traduit sans hreflang correct | P2 |
| Analytics | Script tiers en `is:inline` ou `partytown`, consentement, impact CWV | Tag manager qui annule le budget JS | P2 |

### H. Serveur, formulaires & données (`08-server-data.md`)

| Sujet | Contenu | Piège | Prio |
|---|---|---|---|
| Middleware | `src/middleware.ts`, `onRequest(context, next)`, `defineMiddleware()`, `sequence()` | Export `default` au lieu de `onRequest` | P0 |
| `locals` | Typage `App.Locals` dans `env.d.ts` | Réassigner `locals` (erreur runtime) · absent dans les pages d'erreur si le middleware a planté | P1 |
| Exécution | Build-time pour les pages prerendues, requête pour l'on-demand | Attendre les cookies dans un middleware sur page statique | P0 |
| Actions | `defineAction({ input, accept, handler })`, `Astro.getActionResult()`, `isInputError()`, `ActionError`, pattern POST/Redirect/GET | **Exige l'on-demand** : formulaire sur page prerendue = échec silencieux | P0 |
| Validation form | `z.coerce.boolean()` pour checkbox, `z.instanceof(File)`, champs vides = `null` | Schéma JSON appliqué à un `FormData` | P1 |
| Endpoints | `GET`/`POST` exportés, `Response`, `APIContext` | Endpoint prerendu qui tente de lire le body | P1 |
| Sessions | `session: { driver: sessionDrivers.x(...) }`, `Astro.session.get/set/destroy/regenerate`, typage `App.SessionData`, `session: false` pour alléger | **Non supporté en edge middleware** · drivers par défaut seulement sur Node/CF/Netlify | P1 |
| Env vars | `PUBLIC_` pour le client ; **v6 : `import.meta.env` toujours inliné, jamais coercé** (tout est string) | `import.meta.env.PORT` traité comme un number | P0 |
| `astro:env` | `envField` + `context`/`access`, `getSecret()` | Utiliser `astro:env` **dans `astro.config`** (impossible) · `.env` non chargé dans la config | P1 |
| Secrets | Jamais dans le client, vérification côté serveur des autorisations | Secret exposé via un prefix `PUBLIC_` | P0 |
| Cache (exp.) | `experimental.cache` + `Astro.cache.set({ maxAge, swr, tags })`, invalidation liée aux live collections | Flag expérimental utilisé sans le signaler | P2 |

### I. Perf & sécurité (`09-perf-security.md`)

| Sujet | Contenu | Piège | Prio |
|---|---|---|---|
| Budget JS | Objectif : 0 ko sur les pages marketing/blog ; mesurer le poids par island | « C'est Astro donc c'est rapide » | P0 |
| CWV | LCP (image + fonte), CLS (dimensions, fallbacks), INP (islands) | Optimiser sans mesurer | P1 |
| `<ClientRouter />` | Ex-`<ViewTransitions />` (**supprimé en v6**), events `astro:page-load`, réinitialisation des scripts | Listeners dupliqués à chaque navigation | P1 |
| Prefetch | `prefetch` config + `data-astro-prefetch`, stratégies | **Option `with` de `prefetch()` supprimée en v6** | P2 |
| CSP | **Stable en v6** : `security: { csp: true }`, hachage auto des scripts/styles, directives custom | CSP activée qui casse analytics/inline tiers · interaction avec les images responsive | P1 |
| Headers | `_headers` (CF/Netlify), `staticHeaders` (Node), config Vercel | Headers de sécurité présents en static, absents en SSR | P1 |
| Cache HTTP | Immutable sur `_astro/`, stratégie par type de route | `Cache-Control` par défaut inadapté sur les pages SSR | P1 |
| Rendu (exp.) | `experimental.queuedRendering`, `experimental.rustCompiler` (+ `@astrojs/compiler-rs`) | Activer un flag expérimental sur un projet client sans mention | P2 |

### J. API d'intégration (`10-integrations-api.md`)

| Sujet | Contenu | Prio |
|---|---|---|
| Hooks | `astro:config:setup`, `astro:route:setup`, `astro:routes:resolved`, `astro:config:done`, `astro:server:setup/start/done`, `astro:build:start/setup/ssr/generated/done` | P2 |
| Utilitaires | `updateConfig`, `addRenderer`, `injectRoute`, `injectScript` (`head-inline`/`before-hydration`/`page`/`page-ssr`), `addMiddleware`, `addWatchFile`, `addClientDirective`, `addDevToolbarApp`, `injectTypes`, `createCodegenDir`, `setAdapter`, `setPrerenderer` | P2 |
| Breaking v6 | `routes` retiré de `astro:build:done` → `astro:routes:resolved` · `entryPoints` retiré de `astro:build:ssr` · `astro:ssr-manifest` → `astro:config/server` | P1 |
| Grille d'audit | Avant d'ajouter une intégration : maintenue ? compatible v6 ? compatible avec l'adaptateur ? remplaçable par 10 lignes ? coût JS client ? | P1 |
| Intégrations officielles | `@astrojs/mdx`, `sitemap`, `rss`, `partytown`, `react`/`vue`/`svelte`/`preact`/`solid`, `db`, `markdoc`, `alpinejs` | P1 |

### K. Migration & versions (`11-astro6-migration.md`)

| Changement v6 | Action |
|---|---|
| Node ≥ 22.12, Vite 7, Zod 4, Shiki 4 | Vérifier `package.json` + CI |
| `Astro.glob()` **supprimé** | → `import.meta.glob()` ou Content Layer |
| `<ViewTransitions />` **supprimé** | → `<ClientRouter />` |
| Collections legacy supprimées | → `src/content.config.ts` + loaders |
| `z` depuis `astro:content` / `astro:schema` déprécié | → `astro/zod` |
| `emitESMImage()` | → `emitImageMetadata()` |
| Config `.cjs`/`.cts` interdite | → `.mjs`/`.ts`/`.mts` |
| Driver de session en string déprécié | → `sessionDrivers.x()` |
| `NodeApp`, `loadManifest()`, `loadApp()`, `createExports()`/`start()` | → `createApp()` depuis `astro/app/entrypoint`, `entrypointResolution: 'auto'` |
| Flags stabilisés à retirer de la config | `experimental.csp`, `fonts`, `liveContentCollections`, `preserveScriptOrder`, `staticImportMetaEnv`, `headingIdCompat`, `failOnPrerenderConflict` |
| `context.rewrite()` dans les Actions supprimé | Retirer l'appel |
| Encodage `%25` dans les routes | Renommer les fichiers |
| Adaptateurs officiels | Tous en version majeure : relire le changelog de celui utilisé |

**Règle à inscrire dans le SKILL.md** : *lire la version d'Astro installée avant toute recommandation d'API ; si < 6, appliquer les patterns de la version installée et proposer la migration séparément.*

---

## 5. Iron laws candidates (max 7, à trancher)

1. Lire `package.json` + `astro.config.*` + l'adaptateur **avant** d'écrire une ligne d'Astro.
2. Statique par défaut ; l'on-demand se justifie route par route, jamais globalement pour un site vitrine ou un blog.
3. Aucune directive `client:*` sans interaction navigateur réelle, et jamais `client:load` sans justification.
4. Tout contenu structuré passe par le Content Layer avec schéma Zod ; `Astro.glob()` n'existe plus.
5. Toute API runtime doit être compatible avec l'adaptateur déclaré ; pas d'API Node sur workerd.
6. Toute image locale optimisable passe par `astro:assets` avec `alt` et dimensions ; l'image LCP porte `priority`.
7. Aucune dépendance, intégration, adaptateur ou dossier ajouté sans besoin démontré.

## 6. Anti-patterns (table à intégrer telle quelle dans le skill)

| Anti-pattern | Pourquoi ça échoue | Correctif |
|---|---|---|
| `output: 'server'` pour une page dynamique | Perd le cache CDN sur tout le site | `prerender = false` sur la route, ou server island |
| `client:load` systématique | Hydrate tout au chargement | `visible`/`idle`, ou script vanilla |
| `Astro.glob()` | Supprimé en Astro 6 | `getCollection()` / `import.meta.glob()` |
| `src/content/config.ts` | Emplacement legacy | `src/content.config.ts` |
| `@astrojs/tailwind` | Intégration v3 obsolète | `@tailwindcss/vite` + `@import "tailwindcss"` |
| `Astro.locals.runtime` sur Cloudflare | API supprimée par l'adaptateur v6 | `import { env } from 'cloudflare:workers'` |
| Formulaire + Action sur page prerendue | L'action n'a pas de serveur | `prerender = false` sur la page du formulaire |
| Fetch CMS dans chaque composant | N+1 requêtes au build | Charger une fois dans la page / loader |
| `getCollection()` sans tri | Ordre non déterministe | Trier explicitement |
| Props lourdes dans un `server:defer` | Dépasse 2048 o → POST non cachable | Passer un identifiant, refetch côté serveur |
| Secret sans préfixe vérifié | Fuite dans le bundle client | `astro:env` avec `access: 'secret'` |

---

## 7. Ce qui reste à décider avant écriture

1. **Nom + emplacement du skill** : `.agents/skills/astro/` (portable Codex/Claude) ou `.claude/skills/` ? Le repo a déjà les deux conventions.
2. **Suppression** des skills `astro-expert` et `astro-framework-specialist` + nettoyage de `skills-lock.json` : confirmé ?
3. **Templates** : veut-on livrer un `astro.config` prêt par adaptateur, un `content.config.ts`, un composant `<SEO>` et un layout de base dans `templates/` ?
4. **Hooks** : reprendre le mécanisme `pre-execute.cjs`/`post-execute.cjs` de `astro-expert` (par ex. bloquer un `client:load` non justifié, vérifier la version d'Astro) ou rester déclaratif ?
5. **Langue du skill** : anglais (convention des skills) avec ce blueprint en français comme doc interne ?
