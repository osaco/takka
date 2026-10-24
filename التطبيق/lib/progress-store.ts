import { createInitialProgress } from "@/lib/demo-content";
import type { LocalProgress, PendingAttempt } from "@/lib/types";

const PROGRESS_PREFIX = "takka.progress.v1.";
const QUEUE_KEY = "takka.sync-queue.v1";
const DRAFT_PREFIX = "takka.draft.v1.";

export function storageKey(childId: string) {
  return `${PROGRESS_PREFIX}${childId}`;
}

export function readProgress(childId: string, childName: string, audioEnabled = true): LocalProgress {
  if (typeof window === "undefined") return createInitialProgress(childId, childName, audioEnabled);

  try {
    const raw = window.localStorage.getItem(storageKey(childId));
    if (!raw) return createInitialProgress(childId, childName, audioEnabled);
    const parsed = JSON.parse(raw) as LocalProgress;
    if (parsed.version !== 1 || parsed.childId !== childId) return createInitialProgress(childId, childName, audioEnabled);
    return { ...createInitialProgress(childId, childName, audioEnabled), ...parsed, childName, audioEnabled: parsed.audioEnabled ?? audioEnabled };
  } catch {
    return createInitialProgress(childId, childName, audioEnabled);
  }
}

export function writeProgress(progress: LocalProgress) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(progress.childId), JSON.stringify({ ...progress, updatedAt: new Date().toISOString() }));
}

export function addPendingAttempt(attempt: PendingAttempt) {
  if (typeof window === "undefined") return;
  const current = readPendingAttempts();
  if (current.some((item) => item.id === attempt.id)) return;
  window.localStorage.setItem(QUEUE_KEY, JSON.stringify([...current, attempt]));
}

export function readPendingAttempts(): PendingAttempt[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(QUEUE_KEY) ?? "[]") as PendingAttempt[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function removePendingAttempt(id: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(QUEUE_KEY, JSON.stringify(readPendingAttempts().filter((attempt) => attempt.id !== id)));
}

export function clearChildLocalData(childId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(storageKey(childId));
  const draftPrefix = `${DRAFT_PREFIX}${childId}`;
  for (const key of Object.keys(window.localStorage)) {
    if (key === draftPrefix || key.startsWith(`${draftPrefix}.`)) window.localStorage.removeItem(key);
  }
  window.localStorage.setItem(QUEUE_KEY, JSON.stringify(readPendingAttempts().filter((attempt) => attempt.child_id !== childId)));
}

export function clearAllTakkaLocalData() {
  if (typeof window === "undefined") return;
  for (const key of Object.keys(window.localStorage)) {
    if (key.startsWith(PROGRESS_PREFIX) || key.startsWith("takka.")) window.localStorage.removeItem(key);
  }
}
