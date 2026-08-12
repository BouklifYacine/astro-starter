import { z } from 'zod';

import { site } from '@/config/site.config';
import type { FormField } from '@/config/schema';

export const MAX_LEAD_BODY_BYTES = 16 * 1024;

const PHONE_PATTERN = /^[+()0-9][0-9().\s-]{5,31}$/;

/**
 * Builds the request schema from `site.config.form.fields`.
 *
 * The original implementation hardcoded one client's fields (a `service` enum of
 * that agency's offers, a mandatory `company`), which meant rewriting validation
 * and the form component for every project — exactly the cost the boilerplate is
 * supposed to remove. Field definitions now drive both the schema and the markup.
 */
function fieldSchema(field: FormField): z.ZodType {
  const base = (() => {
    switch (field.type) {
      case 'email':
        return z.string().trim().max(field.max ?? 254).refine(
          (value) => value.length === 0 || z.email().safeParse(value).success,
          { message: 'Adresse email invalide.' },
        );
      case 'tel':
        return z.string().trim().max(field.max ?? 32).refine(
          (value) => value.length === 0 || PHONE_PATTERN.test(value),
          { message: 'Numéro de téléphone invalide.' },
        );
      case 'select':
        return field.options?.length
          ? z.string().trim().refine((value) => value.length === 0 || field.options!.includes(value), {
              message: 'Valeur non autorisée.',
            })
          : z.string().trim();
      case 'checkbox':
        return z.coerce.boolean();
      case 'text':
      case 'textarea':
      default:
        return z.string().trim().max(field.max ?? 2000);
    }
  })();

  if (field.type === 'checkbox') {
    return field.required ? z.literal(true) : base;
  }

  const text = base as z.ZodType<string>;

  if (!field.required) {
    // Empty optional fields arrive as "" from a form; normalize to undefined so the
    // destination never receives a key with an empty string in it.
    return text.transform((value) => value || undefined).optional();
  }

  return text.refine((value) => value.length >= (field.min ?? 1), {
    message: field.min ? `${field.min} caractères minimum.` : 'Ce champ est requis.',
  });
}

const optionalUtm = z.string().trim().max(200).optional();

export function buildLeadSchema() {
  const shape: Record<string, z.ZodType> = {
    submissionId: z.uuid(),
    startedAt: z.number().int().positive(),
    // Honeypot: present in the DOM, hidden from humans, must stay empty.
    website: z.string().max(200).optional(),
    captchaToken: z.string().trim().max(4096).optional(),
    utm: z
      .object({
        source: optionalUtm,
        medium: optionalUtm,
        campaign: optionalUtm,
        term: optionalUtm,
        content: optionalUtm,
      })
      .strict()
      .optional(),
  };

  for (const field of site.form.fields) {
    shape[field.name] = fieldSchema(field);
  }

  if (site.form.requireAcknowledgement) {
    shape.acknowledgement = z.literal(true);
  }

  if (site.form.marketingOptIn) {
    // A SEPARATE, always-optional box. Bundling marketing consent into the main
    // submission is what makes a consent invalid.
    shape.marketingOptIn = z.coerce.boolean().optional();
  }

  return z.object(shape).strict();
}

const leadSchema = buildLeadSchema();

export interface LeadPayload {
  submissionId: string;
  startedAt: number;
  website?: string;
  captchaToken?: string;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
  acknowledgement?: boolean;
  marketingOptIn?: boolean;
  [key: string]: unknown;
}

export type ParseResult =
  | { success: true; data: LeadPayload }
  | { success: false; fieldErrors: Record<string, string> };

export function parseLeadRequest(value: unknown): ParseResult {
  const result = leadSchema.safeParse(value);

  if (result.success) {
    return { success: true, data: result.data as LeadPayload };
  }

  // Field-level messages are returned so the form can point at the offending input
  // instead of showing one generic failure. Nothing here echoes user input back.
  const fieldErrors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0];
    if (typeof key === 'string' && !fieldErrors[key]) {
      fieldErrors[key] = issue.message;
    }
  }

  return { success: false, fieldErrors };
}

/** Extracts only the configured form fields, as strings, for delivery. */
export function toLeadFields(payload: LeadPayload): Record<string, string> {
  const fields: Record<string, string> = {};

  for (const field of site.form.fields) {
    const value = (payload as Record<string, unknown>)[field.name];
    if (value === undefined || value === null || value === '') continue;
    fields[field.name] = String(value);
  }

  return fields;
}
