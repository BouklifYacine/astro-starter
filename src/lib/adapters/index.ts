import { site } from "../../config/site.config";
import type { RuntimeEnv } from "../leads/types";
import { TurnstileCaptchaProvider } from "./captcha/turnstile";
import { CloudflareKVStore } from "./kv/cloudflare";
import { UpstashKVStore } from "./kv/upstash";
import { N8nLeadDestination } from "./lead/n8n";
import { ResendMailProvider } from "./mail/resend";
import type { CaptchaProvider, KVStore, LeadDestination, MailProvider } from "./types";

function value(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export interface ResolvedAdapters {
  kv?: KVStore;
  mail?: MailProvider;
  lead?: LeadDestination;
  captcha?: CaptchaProvider;
}

export function resolveAdapters(runtime: RuntimeEnv): ResolvedAdapters {
  let kv: KVStore | undefined;
  if (site.providers.kv === "cloudflare" && runtime.LEAD_RATE_LIMIT) {
    kv = new CloudflareKVStore(runtime.LEAD_RATE_LIMIT);
  }
  if (
    site.providers.kv === "upstash" &&
    value(runtime.UPSTASH_REDIS_REST_URL) &&
    value(runtime.UPSTASH_REDIS_REST_TOKEN)
  ) {
    kv = new UpstashKVStore(
      value(runtime.UPSTASH_REDIS_REST_URL)!,
      value(runtime.UPSTASH_REDIS_REST_TOKEN)!,
    );
  }

  const mail =
    site.providers.mail === "resend" &&
    value(runtime.RESEND_API_KEY) &&
    value(runtime.MAIL_FROM)
      ? new ResendMailProvider(value(runtime.RESEND_API_KEY)!, value(runtime.MAIL_FROM)!)
      : undefined;

  const lead =
    site.providers.lead === "n8n" &&
    value(runtime.N8N_LEADS_WEBHOOK_URL) &&
    value(runtime.N8N_WEBHOOK_SECRET)
      ? new N8nLeadDestination(
          value(runtime.N8N_LEADS_WEBHOOK_URL)!,
          value(runtime.N8N_WEBHOOK_SECRET)!,
        )
      : undefined;

  const captcha =
    site.providers.captcha === "turnstile" && value(runtime.TURNSTILE_SECRET_KEY)
      ? new TurnstileCaptchaProvider(value(runtime.TURNSTILE_SECRET_KEY)!)
      : undefined;

  return { kv, mail, lead, captcha };
}

export type {
  CaptchaProvider,
  KVStore,
  LeadDestination,
  MailMessage,
  MailProvider,
  ProviderDelivery,
} from "./types";
