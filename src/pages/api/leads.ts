import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";

import { resolveAdapters } from "../../lib/adapters";
import { getLeadConfig, hasLeadConfiguration } from "../../lib/leads/config";
import {
  acceptSubmission,
  getSubmissionState,
  releaseSubmission,
  reserveSubmission,
} from "../../lib/leads/idempotency";
import { consumeLeadRateLimit } from "../../lib/leads/rate-limit";
import {
  getClientIp,
  hasMinimumFormDelay,
  isAllowedOrigin,
  readJsonBody,
} from "../../lib/leads/request";
import { leadError, leadSuccess } from "../../lib/leads/responses";
import { parseLeadRequest } from "../../lib/leads/validation";
import type { RuntimeEnv } from "../../lib/leads/types";
import { leadAutoReply, leadNotification } from "../../lib/mail/templates";

// Astro 7 + @astrojs/cloudflare 14 no longer exposes runtime bindings through
// Astro.locals.runtime.env. The current adapter exposes them through this module.
export const prerender = false;

function unavailable(): Response {
  return leadError(
    502,
    "SERVICE_UNAVAILABLE",
    "Le service de demandes est momentanément indisponible.",
  );
}

export const POST: APIRoute = async ({ request }) => {
  const runtime = env as unknown as RuntimeEnv;
  const config = getLeadConfig(runtime);
  if (!hasLeadConfiguration(runtime)) return unavailable();

  if (!isAllowedOrigin(request.headers.get("Origin"), request.url, config.siteUrl)) {
    return leadError(403, "INVALID_ORIGIN", "Cette origine n’est pas autorisée.");
  }

  const body = await readJsonBody(request);
  if (body.kind === "invalid-content-type") {
    return leadError(400, "INVALID_CONTENT_TYPE", "Le format de la demande est invalide.");
  }
  if (body.kind === "payload-too-large") {
    return leadError(413, "PAYLOAD_TOO_LARGE", "La demande est trop volumineuse.");
  }
  if (body.kind === "invalid-json") {
    return leadError(400, "INVALID_JSON", "Le contenu JSON est invalide.");
  }

  const parsedLead = parseLeadRequest(body.value);
  if (!parsedLead.success) {
    return leadError(400, "INVALID_REQUEST", "Certains champs sont invalides.");
  }
  const lead = parsedLead.data;
  if (lead.website) return leadError(400, "BOT_DETECTED", "La demande ne peut pas être traitée.");
  if (!hasMinimumFormDelay(lead.startedAt)) {
    return leadError(400, "FORM_TOO_FAST", "La demande ne peut pas être traitée.");
  }

  const adapters = resolveAdapters(runtime);
  if (!adapters.lead || !adapters.captcha) return unavailable();
  const isDevelopment = import.meta.env.DEV;
  const existingSubmission = await getSubmissionState({
    submissionId: lead.submissionId,
    store: adapters.kv,
    isDevelopment,
  });
  if (existingSubmission.kind === "unavailable") return unavailable();
  if (existingSubmission.kind === "accepted") return leadSuccess(config.bookingUrl);
  if (existingSubmission.kind === "processing") {
    return leadError(504, "WEBHOOK_TIMEOUT", "La demande est encore en cours de traitement. Réessayez plus tard.");
  }

  const ip = getClientIp(request, isDevelopment);
  if (!ip) return leadError(403, "INVALID_ORIGIN", "La vérification de sécurité a échoué.");
  const rateLimit = await consumeLeadRateLimit({ ip, store: adapters.kv, isDevelopment });
  if (rateLimit.kind === "unavailable") return unavailable();
  if (rateLimit.kind === "limited") {
    return leadError(429, "RATE_LIMITED", "Trop de tentatives. Réessayez dans quelques minutes.", {
      "Retry-After": rateLimit.retryAfterSeconds.toString(),
    });
  }

  const captcha = await adapters.captcha.verify(lead.turnstileToken, ip);
  if (captcha === "unavailable") return unavailable();
  if (captcha === "rejected") return leadError(403, "TURNSTILE_REJECTED", "La vérification de sécurité a échoué.");

  const reservation = await reserveSubmission({
    submissionId: lead.submissionId,
    store: adapters.kv,
    isDevelopment,
  });
  if (reservation.kind === "unavailable") return unavailable();
  if (reservation.kind === "accepted") return leadSuccess(config.bookingUrl);
  if (reservation.kind === "processing") {
    return leadError(504, "WEBHOOK_TIMEOUT", "La demande est encore en cours de traitement. Réessayez plus tard.");
  }

  const delivery = await adapters.lead.deliver(lead);
  if (delivery === "timeout") {
    return leadError(504, "WEBHOOK_TIMEOUT", "La demande prend trop de temps. Réessayez plus tard.");
  }
  if (delivery !== "accepted") {
    await releaseSubmission({ submissionId: lead.submissionId, store: adapters.kv, isDevelopment });
    return leadError(502, "WEBHOOK_REJECTED", "La demande n’a pas pu être transmise. Réessayez plus tard.");
  }

  if (adapters.mail) {
    if (lead.email) await adapters.mail.send(leadAutoReply(lead));
    await adapters.mail.send(leadNotification(lead));
  }

  if (!(await acceptSubmission({ submissionId: lead.submissionId, store: adapters.kv, isDevelopment }))) {
    return unavailable();
  }
  return leadSuccess(config.bookingUrl);
};
