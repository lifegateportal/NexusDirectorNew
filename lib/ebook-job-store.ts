/**
 * ebook-job-store.ts
 * IndexedDB persistence for ebook generation jobs.
 * Each section is saved immediately after completion — pipeline is fully resumable.
 */

import { EbookJobStateSchema, type EbookJobState } from "@/lib/schemas/ebook";

const DB_NAME = "nexus-ebook-jobs";
const STORE_NAME = "jobs";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: "jobId" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveRemoteCheckpoint(state: EbookJobState): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(`/api/ebook/jobs/${encodeURIComponent(state.jobId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state),
      signal: controller.signal,
    });
    if (!response.ok) {
      console.warn(`[ebook-job-store] Remote checkpoint failed (${response.status})`);
    }
  } catch (err) {
    console.warn("[ebook-job-store] Remote checkpoint unavailable:", err);
  } finally {
    clearTimeout(timeout);
  }
}

async function getLocalEbookJob(jobId: string): Promise<EbookJobState | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const req = db.transaction(STORE_NAME, "readonly")
        .objectStore(STORE_NAME)
        .get(jobId);
      req.onsuccess = () => resolve((req.result as EbookJobState) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function getRemoteEbookJob(jobId: string): Promise<EbookJobState | null> {
  try {
    const response = await fetch(`/api/ebook/jobs/${encodeURIComponent(jobId)}`, { cache: "no-store" });
    if (!response.ok) return null;
    const payload = await response.json() as { state?: unknown };
    const parsed = EbookJobStateSchema.safeParse(payload.state);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function saveEbookJob(state: EbookJobState, retries = 2): Promise<void> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const db = await openDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).put({ ...state, updatedAt: new Date().toISOString() });
        tx.oncomplete = () => {
          console.log(`[ebook-job-store] Saved job ${state.jobId} (${state.currentStage})`);
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      });
      await saveRemoteCheckpoint(state);
      return;
    } catch (err) {
      const isLastAttempt = attempt === retries;
      console.error(`[ebook-job-store] Save failed (attempt ${attempt + 1}/${retries + 1}):`, err);
      if (isLastAttempt) throw err;
      await new Promise(r => setTimeout(r, 100 * (attempt + 1)));
    }
  }
}

export async function getEbookJob(jobId: string): Promise<EbookJobState | null> {
  const [local, remote] = await Promise.all([
    getLocalEbookJob(jobId),
    getRemoteEbookJob(jobId),
  ]);
  if (!local) return remote;
  if (!remote) return local;
  return Date.parse(remote.updatedAt) > Date.parse(local.updatedAt) ? remote : local;
}

export async function listEbookJobs(): Promise<EbookJobState[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE_NAME, "readonly")
      .objectStore(STORE_NAME)
      .getAll();
    req.onsuccess = () => resolve((req.result as EbookJobState[]) ?? []);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteEbookJob(jobId: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(jobId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function newJobId(): string {
  return `ebook-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
