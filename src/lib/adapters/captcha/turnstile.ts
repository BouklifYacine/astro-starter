import type { CaptchaProvider } from "../types";

const TURNSTILE_SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export class TurnstileCaptchaProvider implements CaptchaProvider {
  public constructor(
    private readonly secret: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  public async verify(
    token: string,
    ip: string | null,
  ): Promise<"verified" | "rejected" | "unavailable"> {
    try {
      const body = new URLSearchParams({
        secret: this.secret,
        response: token,
        ...(ip ? { remoteip: ip } : {}),
      });
      const response = await this.fetchImpl(TURNSTILE_SITEVERIFY_URL, {
        method: "POST",
        body,
      });
      if (!response.ok) {
        return "unavailable";
      }
      const payload = (await response.json()) as { success?: boolean };
      return payload.success ? "verified" : "rejected";
    } catch {
      return "unavailable";
    }
  }
}
