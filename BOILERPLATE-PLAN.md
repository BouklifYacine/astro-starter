# Plan de construction — Boilerplate Astro (version adaptée)

## Objectif

Un template GitHub clonable pour livrer un site vitrine ou une landing TPE/PME en moins d’une heure après configuration : pages statiques, blog typé, formulaire sécurisé, emails transactionnels, SEO initial et pages légales à compléter.

## Règles

1. Trois sources de vérité : `src/config/site.config.ts`, `src/content/` et les secrets de l’environnement.
2. Le clone doit démarrer avec des placeholders fonctionnels.
3. Les options désactivées sont supprimées par `scripts/init.mjs`; les booléens ne pilotent que les comportements runtime.
4. Le template contient la forme, pas les textes, preuves ou assets d’un client.
5. Les fournisseurs sont derrière `src/lib/adapters/`.
6. Chaque règle importante possède une vérification proportionnée.

## Compatibilité vérifiée le 12 août 2026

| Technologie | Version retenue | Adaptation |
| --- | --- | --- |
| Astro | `^7.2.1` | dernière version stable vérifiée |
| Cloudflare | `@astrojs/cloudflare ^14.2.1` | exige Astro `>=7.2.0` |
| React | `^19.2.8` | îlot du formulaire uniquement |
| Tailwind | `^4.3.3` + `@tailwindcss/vite` | configuration CSS-first |
| TypeScript | `6.0.3` | patch stable actuel |
| Zod | `^4.4.3` | config, formulaire et collections |
| Runtime | Bun `1.3.14` | `packageManager` fixé pour CI locale |

### API adaptées

- Les bindings Cloudflare utilisent `import { env } from "cloudflare:workers"`; `Astro.locals.runtime.env` est supprimé.
- `astro:env/client` et `astro:env/server` fournissent le typage. Les secrets restent optionnels au build et obligatoires au runtime de l’API.
- Les collections sont dans `src/content.config.ts` et utilisent `glob()` depuis `astro/loaders`.
- La pagination est `blog/[...page].astro`; les articles sont `blog/[slug].astro`, car deux catch-all au même niveau sont ambigus.
- Le défaut est `output: "static"`, avec la seule route on-demand `src/pages/api/leads.ts`.
- Lighthouse bloque sur LCP, CLS et TBT ; l’INP est observé en production et n’est pas prétendu mesurable en laboratoire.

## P0 — Socle

1. Valider R1 avec un build réel : `astro:env` et `cloudflare:workers` cohabitent sans exposer de secret.
2. Écrire `docs/CONTRACTS.md` et les garde-fous I1, I2, I3, I7, I8, I13.
3. Valider `site.config.ts` par Zod.
4. Ajouter les ports `KVStore`, `MailProvider`, `LeadDestination`, `CaptchaProvider` et les adaptateurs Cloudflare/Upstash, Resend, n8n et Turnstile.
5. Ajouter le pipeline leads : validation dérivée de `site.form.fields`, origine, honeypot, délai, rate-limit, idempotence et réponses JSON.
6. Ajouter `init.mjs` : configuration, suppression physique des modules et suppression de l’article d’exemple.
7. Ajouter les templates mail et les layouts SEO.
8. Configurer Astro, `astro:env`, `trailingSlash: "always"`, sitemap et `vite.optimizeDeps`.
9. Ajouter les pages d’erreur et vérifier le statut 404.
10. Ajouter le provisioning Cloudflare et GitHub.

## P1 — Gain de temps

- Design tokens, composants marketing génériques, formulaire `client:visible`.
- Content Layer local avec schémas séparés, blog et pagination.
- robots.txt nommé pour les crawlers, llms.txt, schema.org et consentement analytics.
- Workflows de déploiement et de preview.

## P2 — Robustesse

- Headers de sécurité, vérification post-build, liens morts, audit accessibilité et budget Lighthouse.
- `lastmod` uniquement lorsqu’une date de contenu est disponible ; aucune date de build globale artificielle.

## P3 — À ajouter au besoin

CMS éditable, adaptateurs supplémentaires, templates de pages, i18n, workflows n8n de référence et configuration agent.

## Exclusions

Ne pas copier les pages métier, les textes, les articles, les assets de marque, les IDs KV, les clés de vérification ou les documents d’audit du site source.
