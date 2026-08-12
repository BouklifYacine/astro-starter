import { MAX_LEAD_BODY_BYTES, MIN_FORM_DELAY_MS } from "./types";

export type JsonBodyResult =
  | { kind: "ok"; value: unknown }
  | { kind: "invalid-content-type" }
  | { kind: "payload-too-large" }
  | { kind: "invalid-json" };

function isJsonContentType(contentType: string | null): boolean {
  return contentType?.split(";", 1)[0]?.trim().toLowerCase() === "application/json";
}

function isOverLimit(contentLength: string | null): boolean {
  return Boolean(contentLength && /^\d+$/.test(contentLength) && Number(contentLength) > MAX_LEAD_BODY_BYTES);
}

export async function readJsonBody(request: Request): Promise<JsonBodyResult> {
  if (!isJsonContentType(request.headers.get("Content-Type"))) {
    return { kind: "invalid-content-type" };
  }
  if (isOverLimit(request.headers.get("Content-Length"))) {
    return { kind: "payload-too-large" };
  }
  if (!request.body) {
    return { kind: "invalid-json" };
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_LEAD_BODY_BYTES) {
        await reader.cancel();
        return { kind: "payload-too-large" };
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return { kind: "ok", value: JSON.parse(new TextDecoder().decode(bytes)) as unknown };
  } catch {
    return { kind: "invalid-json" };
  }
}

export function isAllowedOrigin(origin: string | null, requestUrl: string, siteUrl: string): boolean {
  if (!origin) return false;
  try {
    const requestOrigin = new URL(requestUrl).origin;
    const configuredOrigin = new URL(siteUrl).origin;
    return new URL(origin).origin === requestOrigin || new URL(origin).origin === configuredOrigin;
  } catch {
    return false;
  }
}

export function hasMinimumFormDelay(startedAt: number, now = Date.now()): boolean {
  return startedAt <= now - MIN_FORM_DELAY_MS;
}

function isPlausibleIp(value: string): boolean {
  return /^[0-9a-fA-F:.]+$/.test(value);
}

export function getClientIp(request: Request, isDevelopment: boolean): string | null {
  const cloudflareIp = request.headers.get("CF-Connecting-IP")?.trim();
  if (cloudflareIp && isPlausibleIp(cloudflareIp)) return cloudflareIp;
  if (!isDevelopment) return null;
  const forwardedIp = request.headers.get("X-Forwarded-For")?.split(",", 1)[0]?.trim();
  return forwardedIp && isPlausibleIp(forwardedIp) ? forwardedIp : "local";
}
