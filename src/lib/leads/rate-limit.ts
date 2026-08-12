import type { KVStore } from "../adapters/types";
import {
  LEAD_RATE_LIMIT_MAX_ATTEMPTS,
  LEAD_RATE_LIMIT_WINDOW_MS,
} from "./types";

const MEMORY_RATE_LIMIT_MAX_ENTRIES = 1_000;
const memoryRateLimits = new Map<string, number[]>();

export type RateLimitResult =
  | { kind: "allowed" }
  | { kind: "limited"; retryAfterSeconds: number }
  | { kind: "unavailable" };

function parseTimestamps(value: string | null, cutoff: number): number[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((timestamp): timestamp is number =>
          typeof timestamp === "number" && Number.isFinite(timestamp) && timestamp > cutoff,
        )
      : [];
  } catch {
    return [];
  }
}

function pruneMemoryRateLimits(cutoff: number): void {
  for (const [key, timestamps] of memoryRateLimits) {
    const current = timestamps.filter((timestamp) => timestamp > cutoff);
    if (current.length) memoryRateLimits.set(key, current);
    else memoryRateLimits.delete(key);
  }
  while (memoryRateLimits.size >= MEMORY_RATE_LIMIT_MAX_ENTRIES) {
    const oldestKey = memoryRateLimits.keys().next().value;
    if (!oldestKey) break;
    memoryRateLimits.delete(oldestKey);
  }
}

function toResult(timestamps: number[], now: number): RateLimitResult {
  if (timestamps.length >= LEAD_RATE_LIMIT_MAX_ATTEMPTS) {
    const oldestAttempt = timestamps[0];
    return {
      kind: "limited",
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((oldestAttempt + LEAD_RATE_LIMIT_WINDOW_MS - now) / 1000),
      ),
    };
  }
  return { kind: "allowed" };
}

async function hashIp(ip: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function useMemoryRateLimit(key: string, now: number): RateLimitResult {
  const cutoff = now - LEAD_RATE_LIMIT_WINDOW_MS;
  pruneMemoryRateLimits(cutoff);
  const timestamps = (memoryRateLimits.get(key) ?? []).filter((timestamp) => timestamp > cutoff);
  const result = toResult(timestamps, now);
  if (result.kind !== "limited") memoryRateLimits.set(key, [...timestamps, now]);
  return result;
}

export async function consumeLeadRateLimit({
  ip,
  store,
  isDevelopment,
  now = Date.now(),
}: {
  ip: string;
  store?: KVStore;
  isDevelopment: boolean;
  now?: number;
}): Promise<RateLimitResult> {
  const key = `lead-rate:v1:${await hashIp(ip)}`;
  if (!store) return isDevelopment ? useMemoryRateLimit(key, now) : { kind: "unavailable" };
  const cutoff = now - LEAD_RATE_LIMIT_WINDOW_MS;
  try {
    const timestamps = parseTimestamps(await store.get(key), cutoff);
    const result = toResult(timestamps, now);
    if (result.kind === "limited") return result;
    await store.set(key, JSON.stringify([...timestamps, now]), Math.ceil(LEAD_RATE_LIMIT_WINDOW_MS / 1000));
    return result;
  } catch {
    return isDevelopment ? useMemoryRateLimit(key, now) : { kind: "unavailable" };
  }
}
