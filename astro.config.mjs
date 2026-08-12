// @ts-check
import { createRequire } from "node:module";

// Astro 7.2's Vite 8 module runner can evaluate a legacy CommonJS dependency
// while loading this file. Define the Node bridge before loading Astro's config
// and integrations so that dependency keeps its correct execution semantics.
const projectRequire = createRequire(import.meta.url);
const sourceMapRequire = createRequire(projectRequire.resolve("source-map-js/lib/source-map-generator.js"));
const sourceMapRelativeDependencies = new Set([
  "./array-set",
  "./base64-vlq",
  "./base64",
  "./binary-search",
  "./mapping-list",
  "./quick-sort",
  "./source-map-consumer",
  "./source-node",
  "./util",
]);

globalThis.require = (specifier) => sourceMapRelativeDependencies.has(specifier)
  ? sourceMapRequire(specifier)
  : projectRequire(specifier);

const { defineConfig, envField } = await import("astro/config");
const { default: cloudflare } = await import("@astrojs/cloudflare");
const { default: react } = await import("@astrojs/react");
const { default: sitemap } = await import("@astrojs/sitemap");
const { default: tailwindcss } = await import("@tailwindcss/vite");

const siteUrl = process.env.SITE_URL?.trim() || "https://example.com";
const noindexPaths = new Set([
  "/merci/",
  "/mentions-legales/",
  "/politique-confidentialite/",
  "/gestion-cookies/",
]);

export default defineConfig({
  site: siteUrl,
  output: "static",
  trailingSlash: "always",
  redirects: {},
  // This starter does not use Astro Sessions; do not auto-provision a SESSION KV.
  session: false,
  adapter: cloudflare({
    imageService: "compile",
    prerenderEnvironment: "node",
  }),
  env: {
    schema: {
      SITE_URL: envField.string({
        context: "server",
        access: "public",
        optional: true,
      }),
      PUBLIC_TURNSTILE_SITE_KEY: envField.string({
        context: "client",
        access: "public",
        optional: true,
      }),
      PUBLIC_GA4_MEASUREMENT_ID: envField.string({
        context: "client",
        access: "public",
        optional: true,
      }),
      PUBLIC_POSTHOG_KEY: envField.string({
        context: "client",
        access: "public",
        optional: true,
      }),
      PUBLIC_POSTHOG_HOST: envField.string({
        context: "client",
        access: "public",
        default: "https://eu.i.posthog.com",
      }),
      TURNSTILE_SECRET_KEY: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      N8N_LEADS_WEBHOOK_URL: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      N8N_WEBHOOK_SECRET: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      RESEND_API_KEY: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      MAIL_FROM: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      MAIL_REPLY_TO: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      UPSTASH_REDIS_REST_URL: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      UPSTASH_REDIS_REST_TOKEN: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      CAL_BOOKING_URL: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
    },
    // Provider secrets are runtime bindings in production; do not require them
    // during a default clone/build. The API route reports missing configuration.
    validateSecrets: false,
  },
  integrations: [
    react(),
    sitemap({
      filter: (page) => ![...noindexPaths].some((path) => page.endsWith(path)),
      // Content-aware lastmod values are handled by the content workflow. Pages
      // without a content date intentionally omit lastmod instead of claiming that
      // the whole site changed at every deployment.
      serialize: (item) => item,
    }),
  ],
  vite: {
    resolve: {
      // Prevent duplicate React identities in dev, which otherwise breaks hooks
      // after hydration in interactive islands.
      dedupe: ["react", "react-dom"],
    },
    optimizeDeps: {
      include: ["react", "react-dom", "react-dom/client", "react/jsx-runtime"],
    },
    // Tailwind v4 imports source-map-js through a CommonJS compatibility path.
    // Vite 8 otherwise evaluates that external file as ESM during config loading.
    ssr: {
      external: ["css-tree", "source-map-js"],
      noExternal: [],
    },
    plugins: [tailwindcss()],
  },
});
