import type { LeadRequest } from "../../leads/types";
import type { LeadDestination, ProviderDelivery } from "../types";

export interface N8nLeadPayload {
  submissionId: string;
  receivedAt: string;
  name: string;
  company: string;
  email?: string;
  phone?: string;
  service: string;
  need: string;
  consent: true;
  newsletter?: boolean;
  fields: Record<string, unknown>;
  utm?: LeadRequest["utm"];
}

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export async function signWebhookPayload(
  payload: string,
  timestamp: string,
  secret: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${payload}`),
  );
  return bytesToHex(signature);
}

export class N8nLeadDestination implements LeadDestination {
  public constructor(
    private readonly webhookUrl: string,
    private readonly webhookSecret: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  public async deliver(lead: LeadRequest): Promise<ProviderDelivery> {
    const payload: N8nLeadPayload = {
      submissionId: lead.submissionId,
      receivedAt: new Date().toISOString(),
      name: lead.name,
      company: lead.company,
      email: lead.email,
      phone: lead.phone,
      service: lead.service,
      need: lead.need,
      consent: true,
      newsletter: lead.newsletter,
      fields: lead.fields,
      utm: lead.utm,
    };
    const body = JSON.stringify(payload);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);

    try {
      const signature = await signWebhookPayload(body, timestamp, this.webhookSecret);
      const response = await this.fetchImpl(this.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Boilerplate-Signature": signature,
          "X-Boilerplate-Timestamp": timestamp,
          "X-Boilerplate-Submission-Id": lead.submissionId,
        },
        body,
        redirect: "error",
        signal: controller.signal,
      });
      return response.ok ? "accepted" : "rejected";
    } catch {
      return controller.signal.aborted ? "timeout" : "rejected";
    } finally {
      clearTimeout(timeout);
    }
  }
}
