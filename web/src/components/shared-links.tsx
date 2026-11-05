import { Dialog } from "@base-ui/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchSnapshotManagement, revokeSnapshot, SnapshotAPIError, type SnapshotManagement } from "@/lib/snapshot-api";
import { readSharedLinks, type RememberedShare } from "@/lib/shared-links";

const button = "border border-neutral-700 px-3 py-2 hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-white disabled:opacity-50";
const input = "w-full border border-neutral-700 bg-neutral-900 p-2 text-sm";

export function ManagedShare({ id, credential, remembered }: {
  id: string; credential: string; remembered?: RememberedShare;
}) {
  const [result, setResult] = useState<SnapshotManagement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [confirm, setConfirm] = useState(false);
  const running = useRef(false);
  const mounted = useRef(false);
  const valid = /^[A-Za-z0-9_-]{32}$/.test(id) && /^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/.test(credential);
  const publicUrl = `${window.location.origin}/s/${id}`;
  const managementUrl = `${window.location.origin}/manage/${id}#token=${credential}`;

  const check = useCallback(async () => {
    if (!valid || running.current) return;
    running.current = true; setBusy(true); setError("");
    try {
      const current = await fetchSnapshotManagement(id, credential);
      if (mounted.current) setResult(current);
    } catch (err) {
      if (mounted.current) setError(err instanceof SnapshotAPIError && err.status === 404
        ? "Snapshot or management credential not found. Keep your saved link; check that it is complete."
        : "Status unavailable. Your management access has been kept. Retry when the connection is available.");
    } finally { running.current = false; if (mounted.current) setBusy(false); }
  }, [id, credential, valid]);
  useEffect(() => {
    mounted.current = true;
    void check();
    return () => { mounted.current = false; };
  }, [check]);

  async function remove() {
    if (running.current) return;
    running.current = true; setBusy(true); setError(""); setFeedback("");
    try {
      await revokeSnapshot(id, credential);
      if (mounted.current) {
        setResult((current) => current ? { ...current, status: "revoked" } : current);
        setFeedback("Snapshot deleted. Viewing and downloading are blocked.");
        setConfirm(false);
      }
    } catch {
      if (mounted.current) {
        setError("Deletion could not be confirmed. It may have succeeded. Check status before trying again. Your management access has been kept.");
        setConfirm(false);
      }
    } finally { running.current = false; if (mounted.current) setBusy(false); }
  }
  async function copy(value: string, label: string) {
    try { await navigator.clipboard.writeText(value); setFeedback(`${label} copied.`); }
    catch { setFeedback("Could not copy. Select the link and copy it manually."); }
  }

  if (!valid) return <p role="alert">Invalid management link. Open the complete saved link, including #token= and its credential.</p>;
  const snapshot = result?.snapshot ?? remembered;
  return <article className="space-y-3 border border-neutral-700 p-4 break-words">
    <h2 className="text-lg">{snapshot?.title || "Untitled grid"}</h2>
    {snapshot && <p>Expires {new Date(snapshot.expiresAt).toLocaleString()}</p>}
    <p role="status">{busy ? "Checking…" : error ? "Current status unknown" : result ? `Status: ${result.status}` : "Status not checked"}</p>
    {error && <p role="alert">{error}</p>}
    <button className={button} disabled={busy} onClick={() => void check()}>Check status</button>
    <label className="block">Public viewing link
      <input className={input} readOnly value={publicUrl} onFocus={(event) => event.target.select()} />
    </label>
    <a className="inline-block underline" href={publicUrl} rel="noreferrer" target="_blank">Open public snapshot</a>
    <button className={button} onClick={() => void copy(publicUrl, "Public link")}>Copy public link</button>
    <label className="block">Private management link
      <input className={input} readOnly value={managementUrl} onFocus={(event) => event.target.select()} />
    </label>
    <button className={button} onClick={() => void copy(managementUrl, "Management link")}>Copy management link</button>
    {result?.status === "active" && !confirm && <button className={button} disabled={busy || !!error} onClick={() => setConfirm(true)}>Delete snapshot</button>}
    {confirm && <div className="space-y-2">
      <p>Delete this snapshot? Its public link will stop working.</p>
      <button className={button} disabled={busy} onClick={() => void remove()}>Confirm deletion</button>
      <button className={button} disabled={busy} onClick={() => setConfirm(false)}>Cancel deletion</button>
    </div>}
    {feedback && <p role="status">{feedback}</p>}
  </article>;
}

export default function SharedLinksDialog() {
  const [open, setOpen] = useState(false);
  const [records, setRecords] = useState<RememberedShare[]>([]);
  const [error, setError] = useState("");
  function load() {
    try { setRecords(readSharedLinks()); setError(""); }
    catch { setError("Saved links could not be read. Keep your browser data and use a separately saved management link."); }
  }
  useEffect(() => {
    if (!open) return;
    const update = () => load();
    window.addEventListener("storage", update);
    return () => window.removeEventListener("storage", update);
  }, [open]);
  return <Dialog.Root open={open} onOpenChange={(value) => { setOpen(value); if (value) load(); }}>
    <Dialog.Trigger className="p-1 text-left hover:bg-neutral-900">Your shared links</Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/70" />
      <Dialog.Popup className="fixed inset-4 z-50 mx-auto max-w-xl overflow-y-auto border border-neutral-700 bg-neutral-950 text-neutral-300 p-5 space-y-4 font-code">
        <Dialog.Title className="text-xl">Your shared links</Dialog.Title>
        <Dialog.Description>These links are remembered only in this browser. Clearing browser data loses this list. Separately saved private management links work until expiry or deletion. External services may keep cached previews.</Dialog.Description>
        <Dialog.Close className={button}>Close</Dialog.Close>
        {error ? <p role="alert">{error}</p> : records.length === 0 ? <p>No shared links saved in this browser.</p> : records.map((record) => <ManagedShare key={record.id} id={record.id} credential={record.managementToken} remembered={record} />)}
      </Dialog.Popup>
    </Dialog.Portal>
  </Dialog.Root>;
}
