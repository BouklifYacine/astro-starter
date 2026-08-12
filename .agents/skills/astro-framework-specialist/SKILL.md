---
name: astro-framework-specialist
description: Apply current Astro best practices when designing, implementing, reviewing, or refactoring Astro components, islands, content collections, routing, data fetching, images, integrations, SSR, accessibility, configuration, and deployment in .astro, .ts, .js, .md, .mdx, or astro.config.* files.
---

# Astro Framework Specialist

Use this skill as the Astro quality layer for the boilerplate and for projects built from it. Keep Astro static-first, make rendering and hydration decisions explicit, preserve the project's existing conventions, and verify changes against the Astro version actually installed.

## Operating workflow

1. Inspect before editing: `package.json`, the package manager lockfile, `astro.config.*`, `tsconfig.json`, `src/`, existing project instructions, and the installed Astro version.
2. Classify the feature as static, hybrid, or server-rendered before choosing an API.
3. Identify the data source, request-time requirements, browser interactivity, accessibility requirements, and deployment target.
4. Implement the smallest Astro-native solution that fits the decision. Do not add Tailwind, a UI framework, an adapter, a collection, or a dependency merely because this skill mentions it.
5. Run the project's existing checks and build command. If the Astro version or API behavior is uncertain, consult the current official Astro documentation before coding.

If `.claude/context/memory/learnings.md` exists, read it before changing the project. If it does not exist, continue without creating a memory system only for this skill.

## Rendering decisions

### Static output by default

Use static rendering for landing pages, marketing sites, portfolios, documentation, and content that changes on deploy rather than per request. Keep request-only APIs out of prerendered pages.

### Hybrid output

Use hybrid/on-demand rendering when most of the site can remain static but some routes or components need cookies, sessions, personalization, a database, authentication, or request-time API data. Prefer a server island when only a small part of an otherwise static page needs request-time data.

### Server output

Use server output when most pages require request-time data or the application is primarily authenticated and dynamic. Explain the caching and deployment consequences before changing the whole project to server rendering.

Reconsider the choice when many pages use `prerender = false`, a static build becomes unreasonably slow, or only one small component is forcing the entire page to render on demand.

## Islands and hydration

- Render static content in `.astro` components. Do not use React, Vue, Svelte, or Solid for static-only markup.
- Add a `client:*` directive only when a component needs browser interactivity.
- Use `client:load` for interaction required immediately at page load.
- Use `client:idle` for non-urgent interaction after the page becomes idle.
- Use `client:visible` for interaction below the fold or inside a viewport-triggered region.
- Use `client:media` when a media query determines whether the island is needed.
- Use `client:only="framework"` only when the component cannot be server-rendered, and document why.
- Do not hydrate an entire navigation, footer, card list, or page when a small `<script>` or a smaller island solves the interaction.
- Use `server:defer` only for request-time server content, with an appropriate on-demand rendering setup and serializable props. Provide useful fallback content.

The absence of a directive is intentional: it produces static HTML with no framework JavaScript.

## Astro component conventions

- Define a typed `Props` interface for component inputs and destructure `Astro.props` with sensible defaults.
- Keep component responsibilities narrow and compose `.astro` components before introducing a framework component.
- Keep styles scoped beside the component unless the rule is genuinely document-wide.
- Use semantic HTML, visible focus states, keyboard support, useful labels, correct heading order, and reduced-motion behavior.
- Keep browser APIs in scripts or client components, never in server-side component frontmatter.
- Do not pass non-serializable values to `server:defer` components.

Example:

```astro
---
interface Props {
  title: string;
  count?: number;
}

const { title, count = 0 } = Astro.props;
---

<section aria-labelledby="section-title">
  <h2 id="section-title">{title}</h2>
  <p>{count} items</p>
</section>
```

## Content and data

- Use Markdown or MDX for content-heavy pages when that matches the project.
- Use `src/content.config.ts` with `defineCollection()` and a loader from `astro/loaders` for structured collections in current Astro versions.
- Choose `glob()` for one file per entry, `file()` for a structured JSON/YAML/TOML source, and a custom loader for a remote or generated source.
- Add a Zod schema whenever collection data has a meaningful structure; schema validation is strongly recommended, but a collection is not required for every simple page.
- Query structured content with `getCollection()` or `getEntry()` from `astro:content`, and use the current rendering API for Markdown/MDX entries.
- Treat `Astro.glob()` as a legacy/simple local-file technique, not as a replacement for typed content collections.
- Use `getStaticPaths()` for dynamic prerendered routes. Do not access request-only data from a prerendered page.
- Handle missing entries, failed fetches, invalid responses, and empty states explicitly.
- Keep secrets on the server and validate external data at the boundary.

Example collection:

```ts
// src/content.config.ts
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    draft: z.boolean().default(false),
    tags: z.array(z.string()).optional(),
  }),
});

export const collections = { blog };
```

## Images and assets

- Prefer importing local images from `src/` and using `Image` or `Picture` from `astro:assets` when Astro can process and optimize them.
- Use `<img>` when an image is intentionally unprocessed, comes from `public/` or a remote URL, has a dynamic client-side source, or the format is not supported by the image pipeline.
- Always provide meaningful `alt` text; use `alt=""` for decorative images.
- Provide dimensions for public or remote images when needed to prevent layout shift.
- Do not use string paths for local `src/` assets when an import is required by Astro's asset pipeline.

## Configuration, environment, and integrations

- Keep `astro.config.*` minimal and explain every integration, adapter, experimental flag, and output-mode change.
- Use `astro:env` for type-safe environment variables when the project needs schema-validated env access; never expose secrets to client code.
- Add an adapter only when the deployment target requires SSR or on-demand rendering.
- Keep integrations and framework components limited to a demonstrated need.
- For forms and server actions, validate input, return predictable errors, and keep authorization checks server-side.
- For sessions, middleware, and `Astro.request`, verify that the route runs on demand and does not accidentally become a prerendered route.
- For i18n, keep locale routing, canonical URLs, and fallback behavior explicit.

## Styling and performance

- Follow the boilerplate's existing styling system. Tailwind is optional, not an Astro requirement.
- Preserve Astro's zero-JavaScript default for static content.
- Split large interactive components into a static Astro shell plus the smallest island that needs state.
- Avoid unnecessary client-side navigation, global event listeners, and duplicate View Transition listeners.
- Optimize the critical rendering path, image dimensions, font loading, and above-the-fold layout; measure before adding complexity.

## Review checklist

When reviewing or refactoring Astro code, report concrete file-level findings and check:

- Is the rendering mode justified by request-time data?
- Is JavaScript shipped only for actual interaction?
- Are client directives appropriate for urgency and viewport position?
- Are framework components necessary, or can Astro render the markup?
- Are content collections configured in the current `src/content.config.*` format with loaders and useful schemas?
- Are images handled with the appropriate `astro:assets` or native HTML path?
- Are props, fetches, errors, env variables, sessions, and API inputs typed and validated?
- Are accessibility, SEO metadata, canonical URLs, redirects, and reduced motion handled?
- Does the implementation match the installed Astro version and deployment adapter?
- Did the change introduce an unnecessary dependency, hydration boundary, adapter, or speculative folder?

## Expected implementation output

When implementing an Astro feature, provide:

1. The files changed and the reason for each change.
2. The static/hybrid/server decision.
3. The hydration strategy, including why a directive is or is not used.
4. Any content schema, image, environment, adapter, or integration decision.
5. Verification results from the project's available typecheck, lint, test, and build commands.

## Official references

Use the current Astro documentation when an API depends on the installed version:

- [Islands architecture](https://docs.astro.build/en/concepts/islands/)
- [Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Content collections](https://docs.astro.build/en/guides/content-collections/)
- [Images](https://docs.astro.build/en/guides/images/)
- [Server islands](https://docs.astro.build/en/guides/server-islands/)
- [Environment variables](https://docs.astro.build/en/guides/environment-variables/)
- [Actions](https://docs.astro.build/en/guides/actions/)
