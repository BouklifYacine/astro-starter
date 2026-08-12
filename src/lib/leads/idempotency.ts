import type { KVStore } from "../adapters/types";

const SUBMISSION_TTL_SECONDS = 24 * 60 * 60;
const MEMORY_SUBMISSION_MAX_ENTRIES = 1_000;
type SubmissionState = "processing" | "accepted";
interface MemorySubmission { state: SubmissionState; expiresAt: number }

const memorySubmissions = new Map<string, MemorySubmission>();
const localProcessingSubmissions = new Set<string>();

export type SubmissionLookup =
  | { kind: "new" }
  | { kind: "processing" }
  | { kind: "accepted" }
  | { kind: "unavailable" };

function submissionKey(submissionId: string): string {
  return `lead-submission:v1:${submissionId}`;
}

function pruneMemorySubmissions(now: number): void {
  for (const [key, submission] of memorySubmissions) {
    if (submission.expiresAt <= now) memorySubmissions.delete(key);
  }
  while (memorySubmissions.size >= MEMORY_SUBMISSION_MAX_ENTRIES) {
    const oldestKey = memorySubmissions.keys().next().value;
    if (!oldestKey) break;
    memorySubmissions.delete(oldestKey);
  }
}

function parseState(value: string | null): SubmissionState | null {
  return value === "processing" || value === "accepted" ? value : null;
}

async function getMemoryState(key: string, now: number): Promise<SubmissionState | null> {
  pruneMemorySubmissions(now);
  return memorySubmissions.get(key)?.state ?? null;
}

function setMemoryState(key: string, state: SubmissionState, now: number): void {
  pruneMemorySubmissions(now);
  memorySubmissions.set(key, { state, expiresAt: now + SUBMISSION_TTL_SECONDS * 1000 });
}

export async function getSubmissionState({
  submissionId,
  store,
  isDevelopment,
  now = Date.now(),
}: {
  submissionId: string;
  store?: KVStore;
  isDevelopment: boolean;
  now?: number;
}): Promise<SubmissionLookup> {
  const key = submissionKey(submissionId);
  if (!store) {
    if (!isDevelopment) return { kind: "unavailable" };
    return { kind: (await getMemoryState(key, now)) ?? "new" };
  }
  try {
    return { kind: parseState(await store.get(key)) ?? "new" };
  } catch {
    return isDevelopment ? { kind: (await getMemoryState(key, now)) ?? "new" } : { kind: "unavailable" };
  }
}

export async function reserveSubmission({
  submissionId,
  store,
  isDevelopment,
  now = Date.now(),
}: {
  submissionId: string;
  store?: KVStore;
  isDevelopment: boolean;
  now?: number;
}): Promise<SubmissionLookup> {
  const key = submissionKey(submissionId);
  if (localProcessingSubmissions.has(key)) return { kind: "processing" };
  const existing = await getSubmissionState({ submissionId, store, isDevelopment, now });
  if (existing.kind !== "new") return existing;
  localProcessingSubmissions.add(key);
  if (!store) {
    if (!isDevelopment) {
      localProcessingSubmissions.delete(key);
      return { kind: "unavailable" };
    }
    setMemoryState(key, "processing", now);
    return { kind: "new" };
  }
  try {
    await store.set(key, "processing", SUBMISSION_TTL_SECONDS);
    return { kind: "new" };
  } catch {
    localProcessingSubmissions.delete(key);
    if (isDevelopment) {
      setMemoryState(key, "processing", now);
      return { kind: "new" };
    }
    return { kind: "unavailable" };
  }
}

export async function acceptSubmission({
  submissionId,
  store,
  isDevelopment,
  now = Date.now(),
}: {
  submissionId: string;
  store?: KVStore;
  isDevelopment: boolean;
  now?: number;
}): Promise<boolean> {
  const key = submissionKey(submissionId);
  try {
    if (store) await store.set(key, "accepted", SUBMISSION_TTL_SECONDS);
    else if (isDevelopment) setMemoryState(key, "accepted", now);
    else return false;
    return true;
  } catch {
    if (isDevelopment) {
      setMemoryState(key, "accepted", now);
      return true;
    }
    return false;
  } finally {
    localProcessingSubmissions.delete(key);
  }
}

export async function releaseSubmission({
  submissionId,
  store,
  isDevelopment,
}: {
  submissionId: string;
  store?: KVStore;
  isDevelopment: boolean;
}): Promise<void> {
  const key = submissionKey(submissionId);
  try {
    if (store) await store.delete(key);
    else if (isDevelopment) memorySubmissions.delete(key);
  } finally {
    localProcessingSubmissions.delete(key);
  }
}
