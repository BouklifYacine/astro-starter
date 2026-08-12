import { describe, expect, it } from "vitest";

import { isAllowedOrigin, hasMinimumFormDelay } from "../src/lib/leads/request";
import { parseLeadRequest } from "../src/lib/leads/validation";

describe("lead boundary", () => {
  it("accepts the configured fields and rejects a fast submission", () => {
    const result = parseLeadRequest({
      submissionId: "00000000-0000-4000-8000-000000000000",
      startedAt: Date.now() - 3_000,
      turnstileToken: "token",
      consent: true,
      website: "",
      name: "Alex Martin",
      company: "Entreprise Exemple",
      email: "alex@example.com",
      phone: "",
      service: "site",
      need: "Je souhaite présenter mon activité avec une nouvelle page.",
      newsletter: false,
      utm: {},
    });
    expect(result.success).toBe(true);
    expect(hasMinimumFormDelay(Date.now() - 3_000)).toBe(true);
    expect(hasMinimumFormDelay(Date.now())).toBe(false);
  });

  it("limits accepted origins to the request or configured site", () => {
    expect(isAllowedOrigin("https://example.com", "https://example.com/contact/", "https://example.com")).toBe(true);
    expect(isAllowedOrigin("https://attacker.example", "https://example.com/contact/", "https://example.com")).toBe(false);
  });
});
