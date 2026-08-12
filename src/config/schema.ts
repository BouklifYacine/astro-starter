import { z } from "zod";

const providerSchema = z.object({
  kv: z.enum(["cloudflare", "upstash"]),
  mail: z.literal("resend"),
  lead: z.literal("n8n"),
  captcha: z.literal("turnstile"),
  cms: z.literal("files"),
});

const formFieldSchema = z.object({
  name: z.string().regex(/^[a-z][a-zA-Z0-9_]*$/),
  label: z.string().min(1),
  type: z.enum(["text", "email", "tel", "textarea", "select", "checkbox"]),
  required: z.boolean().default(false),
  placeholder: z.string().optional(),
  options: z
    .array(z.object({ value: z.string().min(1), label: z.string().min(1) }))
    .optional(),
});

export const siteSchema = z
  .object({
    name: z.string().min(1),
    legalName: z.string().min(1),
    domain: z.string().min(1),
    lang: z.string().regex(/^[a-z]{2}$/),
    locale: z.string().min(2),
    brand: z.object({
      themeColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      favicon: z.string().startsWith("/"),
      ogImage: z.string().startsWith("/"),
    }),
    contact: z.object({
      email: z.email(),
      phone: z.string(),
      address: z.string(),
    }),
    legal: z.object({
      status: z.string(),
      siren: z.string(),
      address: z.string(),
      email: z.email(),
    }),
    navigation: z.array(
      z.object({ label: z.string().min(1), href: z.string().startsWith("/") }),
    ),
    providers: providerSchema,
    seo: z.object({
      titleTemplate: z.string().min(1),
      defaultTitle: z.string().min(1),
      defaultDescription: z.string().min(1),
      ogImage: z.string().startsWith("/"),
      verification: z.object({ google: z.string(), bing: z.string() }),
      noindexPaths: z.array(z.string().startsWith("/")),
      indexNowKey: z.string(),
    }),
    form: z
      .object({
        enabled: z.boolean(),
        legalBasis: z.enum(["precontractual", "consent", "legal_obligation", "legitimate_interest"]),
        privacyNotice: z.string().min(1),
        requireAcknowledgement: z.boolean(),
        fields: z.array(formFieldSchema).min(1),
      })
      .superRefine((form, context) => {
        const names = new Set(form.fields.map((field) => field.name));
        for (const requiredName of ["name", "company", "need"]) {
          if (!names.has(requiredName)) {
            context.addIssue({
              code: "custom",
              path: ["fields"],
              message: `Le champ obligatoire ${requiredName} manque dans la configuration du formulaire.`,
            });
          }
        }
        if (!names.has("email") && !names.has("phone")) {
          context.addIssue({
            code: "custom",
            path: ["fields"],
            message: "Le formulaire doit proposer un e-mail ou un téléphone.",
          });
        }
      }),
    crawlers: z.object({
      allow: z.array(z.string()),
      disallow: z.array(z.string()),
      contentSignal: z.string(),
    }),
    features: z.object({
      analytics: z.boolean(),
      darkMode: z.boolean(),
      booking: z.boolean(),
    }),
  })
  .strict();

export type SiteConfig = z.infer<typeof siteSchema>;
export type FormField = z.infer<typeof formFieldSchema>;

export function validateSiteConfig(value: unknown): SiteConfig {
  return siteSchema.parse(value);
}
