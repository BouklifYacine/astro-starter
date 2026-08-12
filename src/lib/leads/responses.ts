export type LeadErrorCode =
  | "METHOD_NOT_ALLOWED"
  | "INVALID_CONTENT_TYPE"
  | "PAYLOAD_TOO_LARGE"
  | "INVALID_JSON"
  | "INVALID_REQUEST"
  | "INVALID_ORIGIN"
  | "BOT_DETECTED"
  | "FORM_TOO_FAST"
  | "TURNSTILE_REJECTED"
  | "RATE_LIMITED"
  | "SERVICE_UNAVAILABLE"
  | "WEBHOOK_REJECTED"
  | "WEBHOOK_TIMEOUT";

const JSON_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
};

export function leadError(status: number, code: LeadErrorCode, message: string, headers?: HeadersInit): Response {
  const responseHeaders = new Headers(JSON_HEADERS);
  if (headers) {
    for (const [name, value] of new Headers(headers)) responseHeaders.set(name, value);
  }
  return new Response(JSON.stringify({ ok: false, code, message }), { status, headers: responseHeaders });
}

export function leadSuccess(bookingUrl?: string): Response {
  return new Response(JSON.stringify({ ok: true, bookingUrl }), { status: 201, headers: JSON_HEADERS });
}
