import type { MailMessage, MailProvider, ProviderDelivery } from "../types";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export class ResendMailProvider implements MailProvider {
  public constructor(
    private readonly apiKey: string,
    private readonly from: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  public async send(message: MailMessage): Promise<ProviderDelivery> {
    try {
      const response = await this.fetchImpl(RESEND_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: this.from,
          to: message.to,
          subject: message.subject,
          html: message.html,
          text: message.text,
          ...(message.replyTo ? { reply_to: message.replyTo } : {}),
        }),
      });
      return response.ok ? "accepted" : "rejected";
    } catch {
      return "unavailable";
    }
  }
}
