export const MAX_LEAD_BODY_BYTES = 16 * 1024;
export const LEAD_RATE_LIMIT_MAX_ATTEMPTS = 5;
export const LEAD_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
export const MIN_FORM_DELAY_MS = 2 * 1000;

export interface LeadUtm {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
}

export interface LeadRequest {
  submissionId: string;
  name: string;
  company: string;
  email?: string;
  phone?: string;
  service: string;
  need: string;
  consent: true;
  turnstileToken: string;
  website?: string;
  startedAt: number;
  newsletter?: boolean;
  fields: Record<string, unknown>;
  utm?: LeadUtm;
}

export interface CloudflareKVBinding {
  get(key: string, options?: { type?: "text" }): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface RuntimeEnv {
  SITE_URL?: string;
  TURNSTILE_SECRET_KEY?: string;
  N8N_LEADS_WEBHOOK_URL?: string;
  N8N_WEBHOOK_SECRET?: string;
  RESEND_API_KEY?: string;
  MAIL_FROM?: string;
  MAIL_REPLY_TO?: string;
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
  CAL_BOOKING_URL?: string;
  LEAD_RATE_LIMIT?: CloudflareKVBinding;
}

export interface LeadConfig {
  siteUrl: string;
  bookingUrl?: string;
}
