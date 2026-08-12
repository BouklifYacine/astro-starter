import type { KVStore } from "../types";

interface UpstashResponse {
  result?: unknown;
  error?: string;
}

export class UpstashKVStore implements KVStore {
  public constructor(
    private readonly url: string,
    private readonly token: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private async command(command: string[]): Promise<unknown> {
    const response = await this.fetchImpl(this.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
    });
    const payload = (await response.json()) as UpstashResponse;
    if (!response.ok || payload.error) {
      throw new Error(payload.error || "Upstash request failed");
    }
    return payload.result;
  }

  public async get(key: string): Promise<string | null> {
    const result = await this.command(["GET", key]);
    return result === null || typeof result === "undefined" ? null : String(result);
  }

  public async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const command = ["SET", key, value];
    if (ttlSeconds) {
      command.push("EX", String(ttlSeconds));
    }
    await this.command(command);
  }

  public async delete(key: string): Promise<void> {
    await this.command(["DEL", key]);
  }
}
