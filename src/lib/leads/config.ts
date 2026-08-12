import { site } from "../../config/site.config";
import { getSiteUrl } from "../site-url";
import type { LeadConfig, RuntimeEnv } from "./types";

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function getLeadConfig(runtime: RuntimeEnv): LeadConfig {
  const configuredSiteUrl = stringValue(runtime.SITE_URL);
  const bookingUrl = stringValue(runtime.CAL_BOOKING_URL);
  return {
    siteUrl: configuredSiteUrl && isHttpUrl(configuredSiteUrl)
      ? configuredSiteUrl
      : getSiteUrl().href,
    bookingUrl:
      bookingUrl && isHttpUrl(bookingUrl) ? bookingUrl : undefined,
  };
}

export function hasLeadConfiguration(runtime: RuntimeEnv): boolean {
  return Boolean(
    site.form.enabled &&
      stringValue(runtime.TURNSTILE_SECRET_KEY) &&
      stringValue(runtime.N8N_LEADS_WEBHOOK_URL) &&
      stringValue(runtime.N8N_WEBHOOK_SECRET),
  );
}
