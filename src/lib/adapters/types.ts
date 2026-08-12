import type { LeadRequest } from "../leads/types";

export interface KVStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface MailMessage {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

export type ProviderDelivery = "accepted" | "rejected" | "timeout" | "unavailable";

export interface MailProvider {
  send(message: MailMessage): Promise<ProviderDelivery>;
}

export interface LeadDestination {
  deliver(lead: LeadRequest): Promise<ProviderDelivery>;
}

export interface CaptchaProvider {
  verify(token: string, ip: string | null): Promise<"verified" | "rejected" | "unavailable">;
}

export type KVProvider = "cloudflare" | "upstash";
export type MailProviderName = "resend";
export type LeadProviderName = "n8n";
export type CaptchaProviderName = "turnstile";
export type CMSProviderName = "files";
