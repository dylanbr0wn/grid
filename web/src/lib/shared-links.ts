import { type } from "arktype";
import type { SnapshotPublication } from "./snapshot-api";
import { SNAPSHOT_IMAGE_LIMIT } from "./snapshot-capture";

export const SHARED_LINKS_KEY = "grid-shared-links-v1";
const PENDING_DATABASE = "grid-publication-v1";
const share = type({
  id: /^[A-Za-z0-9_-]{32}$/,
  title: "string",
  createdAt: "string",
  expiresAt: "string",
  managementToken: /^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/,
});
export type RememberedShare = typeof share.infer;
export type PendingPublication = { key: string; image: Blob; title: string; retryAt: number };

/** A bounded credential list, separate from grid-albums-storage. */
export function rememberShare(result: SnapshotPublication): void {
  const raw = localStorage.getItem(SHARED_LINKS_KEY);
  const parsed = raw === null ? [] : type("string.json.parse").to(share.array())(raw);
  if (parsed instanceof type.errors) throw new Error("Saved links could not be read.");
  const record: RememberedShare = {
    id: result.id, title: result.title, createdAt: result.createdAt,
    expiresAt: result.expiresAt, managementToken: result.managementToken,
  };
  // Never evict another management credential without the creator's choice.
  const others = parsed.filter((item) => item.id !== record.id);
  if (others.length >= 50) throw new Error("Saved links are full.");
  localStorage.setItem(SHARED_LINKS_KEY, JSON.stringify([record, ...others]));
}

function validatePending(value: unknown): PendingPublication | null {
  if (value === undefined) return null;
  const pending = value as PendingPublication;
  if (!pending || typeof pending.key !== "string" || !/^[A-Za-z0-9_-]{53}[AQgw]$/.test(pending.key) ||
    !(pending.image instanceof Blob) || pending.image.type !== "image/png" ||
    pending.image.size <= 0 || pending.image.size > SNAPSHOT_IMAGE_LIMIT ||
    typeof pending.title !== "string" || [...pending.title].length > 200 ||
    !Number.isFinite(pending.retryAt) || pending.retryAt < 0) {
    throw new Error("The saved publication could not be read. Keep this browser's data for recovery.");
  }
  return pending;
}

async function pendingTransaction<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore, complete: (value: T) => void) => void,
): Promise<T> {
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(PENDING_DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore("pending");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("Browser recovery storage is unavailable."));
    request.onblocked = () => reject(new Error("Close other Grid tabs and try again."));
  });
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction("pending", mode);
      let value: T;
      transaction.oncomplete = () => resolve(value);
      transaction.onerror = transaction.onabort = () => reject(new Error("Browser recovery storage is unavailable."));
      operation(transaction.objectStore("pending"), (result) => { value = result; });
    });
  } finally { database.close(); }
}

export async function readPendingPublication(): Promise<PendingPublication | null> {
  const value = await pendingTransaction<unknown>("readonly", (store, complete) => {
    const request = store.get("publication");
    request.onsuccess = () => complete(request.result);
  });
  return validatePending(value);
}

/** Atomic across tabs: an unresolved publication always wins over a new request. */
export async function retainPublication(pending: PendingPublication): Promise<PendingPublication> {
  const value = await pendingTransaction<unknown>("readwrite", (store, complete) => {
    const request = store.get("publication");
    request.onsuccess = () => {
      if (request.result !== undefined) complete(request.result);
      else { store.add(pending, "publication"); complete(pending); }
    };
  });
  return validatePending(value)!;
}

export async function delayPublication(key: string, retryAt: number): Promise<void> {
  await pendingTransaction<void>("readwrite", (store, complete) => {
    const request = store.get("publication");
    request.onsuccess = () => {
      if (request.result?.key === key) store.put({ ...request.result, retryAt }, "publication");
      complete(undefined);
    };
  });
}

export async function clearPendingPublication(key: string): Promise<void> {
  await pendingTransaction<void>("readwrite", (store, complete) => {
    const request = store.get("publication");
    request.onsuccess = () => {
      if (request.result?.key === key) store.delete("publication");
      complete(undefined);
    };
  });
}
