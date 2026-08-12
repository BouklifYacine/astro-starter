import { validateSiteConfig } from "./schema";

export const site = validateSiteConfig({
  name: "Nom du site",
  legalName: "RAISON SOCIALE À COMPLÉTER",
  domain: "example.com",
  lang: "fr",
  locale: "fr_FR",

  brand: {
    themeColor: "#2563eb",
    favicon: "/favicon.svg",
    ogImage: "/og-default.svg",
  },

  contact: {
    email: "contact@example.com",
    phone: "",
    address: "Adresse à compléter",
  },

  legal: {
    status: "Statut juridique à compléter",
    siren: "",
    address: "Adresse à compléter",
    email: "contact@example.com",
  },

  navigation: [
    { label: "Accueil", href: "/" },
    { label: "Services", href: "/#services" },
    { label: "À propos", href: "/#apropos" },
    { label: "Blog", href: "/blog/" },
    { label: "Contact", href: "/contact/" },
  ],

  providers: {
    kv: "cloudflare",
    mail: "resend",
    lead: "n8n",
    captcha: "turnstile",
    cms: "files",
  },

  seo: {
    titleTemplate: "%s | Nom du site",
    defaultTitle: "Nom du site",
    defaultDescription: "Description du site à compléter avant la mise en ligne.",
    ogImage: "/og-default.svg",
    verification: { google: "", bing: "" },
    noindexPaths: [
      "/merci/",
      "/mentions-legales/",
      "/politique-confidentialite/",
      "/gestion-cookies/",
    ],
    indexNowKey: "",
  },

  form: {
    enabled: true,
    legalBasis: "precontractual",
    privacyNotice:
      "Les informations envoyées servent uniquement à répondre à votre demande. Consultez la politique de confidentialité pour connaître la base légale, les destinataires, la durée de conservation et vos droits.",
    requireAcknowledgement: false,
    fields: [
      {
        name: "name",
        label: "Nom",
        type: "text",
        required: true,
        placeholder: "Votre nom",
      },
      {
        name: "company",
        label: "Entreprise",
        type: "text",
        required: true,
        placeholder: "Nom de votre entreprise",
      },
      {
        name: "email",
        label: "E-mail",
        type: "email",
        placeholder: "vous@example.com",
      },
      {
        name: "phone",
        label: "Téléphone",
        type: "tel",
        placeholder: "+33 6 00 00 00 00",
      },
      {
        name: "service",
        label: "Sujet",
        type: "select",
        required: true,
        options: [
          { value: "site", label: "Site vitrine" },
          { value: "automation", label: "Automatisation" },
          { value: "other", label: "Autre demande" },
        ],
      },
      {
        name: "need",
        label: "Votre demande",
        type: "textarea",
        required: true,
        placeholder: "Décrivez votre besoin en quelques lignes.",
      },
      {
        name: "newsletter",
        label: "Je souhaite recevoir les actualités utiles du site.",
        type: "checkbox",
        required: false,
      },
    ],
  },

  crawlers: {
    allow: [
      "GPTBot",
      "ClaudeBot",
      "Google-Extended",
      "CCBot",
      "Amazonbot",
      "Applebot-Extended",
      "meta-externalagent",
    ],
    disallow: ["Bytespider"],
    contentSignal: "ai-train=no, ai-input=yes",
  },

  features: {
    analytics: false,
    darkMode: false,
    booking: false,
  },
});

export type { FormField, SiteConfig } from "./schema";
