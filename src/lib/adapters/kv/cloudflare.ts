import type { CloudflareKVBinding } from "../../leads/types";
import type { KVStore } from "../types";

export class CloudflareKVStore implements KVStore {
  public constructor(private readonly binding: CloudflareKVBinding) {}

  public get(key: string): Promise<string | null> {
    return this.binding.get(key, { type: "text" });
  }

  public set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    return this.binding.put(
      key,
      value,
      ttlSeconds ? { expirationTtl: ttlSeconds } : undefined,
    );
  }

  public delete(key: string): Promise<void> {
    return this.binding.delete(key);
  }
}
