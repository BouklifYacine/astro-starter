import { z } from "zod";

import { site } from "../../config/site.config";
import type { FormField } from "../../config/schema";
import type { LeadRequest } from "./types";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[+()0-9][0-9().\s-]{5,31}$/;

function stringField(field: FormField): z.ZodTypeAny {
  const max = field.name === "need" ? 2_000 : 254;
  const base = z.string().trim().max(max);
  const schema = field.required || field.name === "need"
    ? base.min(field.name === "need" ? 20 : 1)
    : base.transform((value) => value || undefined).optional();
  let result: z.ZodTypeAny = schema;
  if (field.type === "email") {
    result = result.refine(
      (value: unknown) => value === undefined || (typeof value === "string" && emailPattern.test(value)),
      "Adresse e-mail invalide.",
    );
  }
  if (field.type === "tel") {
    result = result.refine(
      (value: unknown) => value === undefined || (typeof value === "string" && phonePattern.test(value)),
      "Numéro de téléphone invalide.",
    );
  }
  return result;
}

function fieldSchema(field: FormField): z.ZodTypeAny {
  if (field.type === "checkbox") {
    return field.required ? z.literal(true) : z.boolean().optional().default(false);
  }
  return stringField(field);
}

function buildSchema() {
  const shape: Record<string, z.ZodTypeAny> = {
    submissionId: z.uuid(),
    turnstileToken: z.string().trim().min(1).max(4096),
    website: z.string().trim().max(200).optional(),
    startedAt: z.number().int().positive(),
    consent: z.literal(true),
    utm: z
      .object({
        source: z.string().trim().max(200).optional(),
        medium: z.string().trim().max(200).optional(),
        campaign: z.string().trim().max(200).optional(),
        term: z.string().trim().max(200).optional(),
        content: z.string().trim().max(200).optional(),
      })
      .strict()
      .optional(),
  };

  for (const field of site.form.fields) {
    shape[field.name] = fieldSchema(field);
  }

  return z.object(shape).strict().superRefine((value, context) => {
    const record = value as Record<string, unknown>;
    const email = typeof record.email === "string" ? record.email : "";
    const phone = typeof record.phone === "string" ? record.phone : "";
    if (!email && !phone) {
      context.addIssue({
        code: "custom",
        path: ["email"],
        message: "Un e-mail ou un téléphone est requis.",
      });
    }
  });
}

const leadRequestSchema = buildSchema();

export function parseLeadRequest(value: unknown):
  | { success: true; data: LeadRequest }
  | { success: false } {
  const result = leadRequestSchema.safeParse(value);
  if (!result.success) {
    return { success: false };
  }

  const data = result.data as Record<string, unknown>;
  const fields = Object.fromEntries(
    site.form.fields.map((field) => [field.name, data[field.name]]),
  );

  return {
    success: true,
    data: {
      submissionId: String(data.submissionId),
      name: String(data.name),
      company: String(data.company),
      email: typeof data.email === "string" ? data.email : undefined,
      phone: typeof data.phone === "string" ? data.phone : undefined,
      service: typeof data.service === "string" ? data.service : "",
      need: String(data.need),
      consent: true,
      turnstileToken: String(data.turnstileToken),
      website: typeof data.website === "string" ? data.website : undefined,
      startedAt: Number(data.startedAt),
      newsletter: data.newsletter === true,
      fields,
      utm: data.utm as LeadRequest["utm"],
    },
  };
}
