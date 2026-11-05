import { Dialog } from "@base-ui/react";
import { IconShare } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { freezeGridSnapshot, type FailedCover, type FrozenGridSnapshot } from "@/lib/snapshot-capture";
import { newPublicationKey, publishSnapshot, SnapshotAPIError, type SnapshotPublication } from "@/lib/snapshot-api";
import { clearPendingPublication, delayPublication, readPendingPublication, rememberShare, retainPublication, type PendingPublication } from "@/lib/shared-links";

type Phase = "loading" | "capturing" | "artwork-failed" | "capture-error" | "preview" | "publishing" | "publish-error" | "success" | "blocked";
const button = "border border-neutral-700 px-3 py-2 hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-white disabled:opacity-50 disabled:cursor-not-allowed";
const input = "w-full border border-neutral-700 bg-neutral-900 p-2 text-sm focus-visible:outline-2 focus-visible:outline-white";

function publicationFailure(error: unknown): string {
  if (!(error instanceof SnapshotAPIError)) return "The connection failed or the reply could not be read. Your link may have been created. Retry to recover the same link.";
  switch (error.status) {
    case 400: return "This image or title was rejected. Check the title and your device's clock, then discard this attempt and capture again.";
    case 409: return "This attempt already has different content. Keep the saved attempt for recovery; creating another link could duplicate it.";
    case 410: return "This attempt expired, was revoked, or its creation window closed. Discard it before creating a new link.";
    case 413: return "This image exceeds the sharing limit. Discard this attempt, use a smaller grid, and capture again.";
    case 415: return "The upload format was rejected. Discard this attempt and capture again.";
    case 429: return "Too many sharing attempts. Wait before retrying the same publication.";
    case 507: return "Sharing storage is full. Retry this publication later when space is available.";
    case 503: return "Sharing is unavailable. Your link may have been created. Retry when sharing is available to recover the same link.";
    default: return "Sharing failed. Your link may have been created. Retry to recover the same link.";
  }
}

export default function ShareDialog() {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("loading");
  const [title, setTitle] = useState("");
  const [image, setImage] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [failures, setFailures] = useState<FailedCover[]>([]);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [result, setResult] = useState<SnapshotPublication | null>(null);
  const [pending, setPending] = useState<PendingPublication | null>(null);
  const [discardable, setDiscardable] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [copyFeedback, setCopyFeedback] = useState("");
  const frozen = useRef<FrozenGridSnapshot | null>(null);
  const attempt = useRef<PendingPublication | null>(null);
  const running = useRef(false);
  const epoch = useRef(0);

  useEffect(() => {
    if (!image) { setPreviewUrl(""); return; }
    const url = URL.createObjectURL(image);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);
  useEffect(() => {
    const update = () => setSeconds(Math.max(0, Math.ceil(((pending?.retryAt || 0) - Date.now()) / 1000)));
    update();
    if (!open || !pending?.retryAt) return;
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [open, pending]);
  useEffect(() => () => { epoch.current++; frozen.current?.dispose(); }, []);

  function setAttempt(value: PendingPublication | null) {
    attempt.current = value;
    setPending(value);
    if (value) { setTitle(value.title); setImage(value.image); }
  }

  async function capture(allowPlaceholders = false) {
    if (!frozen.current || running.current) return;
    running.current = true;
    const current = epoch.current;
    setPhase("capturing"); setError("");
    try {
      const captured = await frozen.current.capture({ allowPlaceholders });
      if (current !== epoch.current) return;
      setFailures(captured.failedCovers);
      if (captured.status === "ready") {
        setImage(captured.blob); setPhase("preview");
      } else setPhase("artwork-failed");
    } catch (err) {
      if (current !== epoch.current) return;
      setError(err instanceof Error ? err.message : "Capture failed. Retry capture.");
      setPhase("capture-error");
    } finally { if (current === epoch.current) running.current = false; }
  }

  async function begin() {
    if (running.current) return;
    const current = ++epoch.current;
    setOpen(true); setPhase("loading"); setTitle(""); setImage(null);
    setFailures([]); setError(""); setWarning(""); setResult(null);
    setCopyFeedback(""); setDiscardable(false); setAttempt(null);
    frozen.current?.dispose(); frozen.current = null;
    // Freeze immediately on Share, before any browser-storage await.
    let freezeError = "";
    try {
      const node = document.getElementById("fm-grid");
      if (!node) throw new Error("The grid is unavailable. Close this dialog and try again.");
      frozen.current = freezeGridSnapshot(node);
    } catch (err) { freezeError = err instanceof Error ? err.message : "The grid could not be captured."; }
    try {
      const saved = await readPendingPublication();
      if (current !== epoch.current) return;
      if (saved) {
        frozen.current?.dispose(); frozen.current = null;
        setAttempt(saved); setPhase("preview");
        setWarning("A previous publication is waiting for recovery. Retry to recover the same link before sharing another grid.");
      } else if (freezeError) { setError(freezeError); setPhase("blocked"); }
      else await capture();
    } catch {
      if (current !== epoch.current) return;
      setError("This browser cannot save publication recovery data. Enable browser storage and try again. No link was requested.");
      setPhase("blocked");
    }
  }

  function changeOpen(next: boolean) {
    if (next) { void begin(); return; }
    // Keep the result reachable while the server may be committing the upload.
    if (running.current && phase === "publishing") return;
    ++epoch.current; running.current = false;
    frozen.current?.dispose(); frozen.current = null;
    setOpen(false); setImage(null);
  }

  async function publish() {
    if (running.current || !image || [...title].length > 200 || (attempt.current?.retryAt || 0) > Date.now()) return;
    running.current = true; setPhase("publishing"); setError(""); setDiscardable(false);
    let request: PendingPublication;
    try {
      const candidate = attempt.current || { key: newPublicationKey(), image, title, retryAt: 0 };
      request = await retainPublication(candidate);
      // Another tab may have saved an attempt since this preview opened.
      if (request.key !== candidate.key) {
        setAttempt(request); setPhase("preview");
        setWarning("A saved publication needs recovery. Review this preview and retry to recover the same link.");
        return;
      }
      setAttempt(request);
      if (request.retryAt > Date.now()) { setPhase("publish-error"); setError("Wait before retrying the same publication."); return; }
    } catch {
      setPhase("preview");
      setError("This browser could not save publication recovery data. Enable storage or free browser space, then try again. No link was requested.");
      return;
    } finally { running.current = false; }
    running.current = true;
    try {
      const published = await publishSnapshot(request.image, request.title, request.key, AbortSignal.timeout(30_000));
      setResult(published); setPhase("success"); setWarning("");
      // Preserve the on-screen result and durable request if the credential list fails.
      try {
        rememberShare(published);
        await clearPendingPublication(request.key);
        setAttempt(null);
      } catch {
        setWarning("Your link was created, but this browser could not save its management record. Copy and save the management link now. The saved attempt remains available for recovery.");
      }
    } catch (err) {
      setError(publicationFailure(err)); setPhase("publish-error");
      if (err instanceof SnapshotAPIError) {
        setDiscardable([400, 410, 413, 415].includes(err.status));
        if (err.retryAfter !== null) {
          const retryAt = Date.now() + err.retryAfter * 1000;
          setAttempt({ ...request, retryAt });
          try { await delayPublication(request.key, retryAt); }
          catch { setWarning("The retry delay could not be saved. Keep this dialog open until the waiting period ends."); }
        }
      }
    } finally { running.current = false; }
  }

  async function discard() {
    if (!discardable || !attempt.current || running.current) return;
    running.current = true;
    try {
      await clearPendingPublication(attempt.current.key);
      setAttempt(null); running.current = false; changeOpen(false);
    } catch { setWarning("The attempt could not be cleared. Enable browser storage and try again."); }
    finally { running.current = false; }
  }

  async function copy(value: string, label: string) {
    try { await navigator.clipboard.writeText(value); setCopyFeedback(`${label} copied.`); }
    catch { setCopyFeedback(`Could not copy ${label.toLowerCase()}. Select the link and copy it manually.`); }
  }

  return (
    <Dialog.Root open={open} onOpenChange={changeOpen}>
      <Dialog.Trigger className="border-l border-transparent hover:border-white p-1 hover:bg-neutral-900 flex items-center gap-2">
        <IconShare className="size-4" /><span>Share</span>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/70" />
        <Dialog.Popup className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-xl max-h-[calc(100dvh-2rem)] overflow-y-auto bg-neutral-950 p-5 text-white outline outline-neutral-700">
          <Dialog.Title className="text-lg font-mono mb-2">{result ? "Link created" : "Share your grid"}</Dialog.Title>
          <Dialog.Description className="text-sm text-neutral-400 mb-4">
            Publish a frozen image with an unlisted link. It expires after 90 days. Chat services may keep cached previews after you revoke it.
          </Dialog.Description>
          <div className="space-y-4">
            {previewUrl && <figure className="space-y-2">
              <img src={previewUrl} alt="Frozen grid preview" className="block mx-auto max-h-72 max-w-full object-contain" />
              {title && <figcaption className="text-sm break-words text-center">{title}</figcaption>}
            </figure>}
            {phase === "loading" && <p role="status">Checking for a saved publication…</p>}
            {phase === "capturing" && <p role="status">Waiting for artwork and preparing your preview…</p>}
            {failures.length > 0 && <div className="text-sm text-neutral-300">
              <p>{image ? "These covers use placeholders or blank spaces:" : "Artwork could not be loaded:"}</p>
              <ul className="list-disc pl-5 max-h-24 overflow-y-auto">
                {failures.map((cover) => <li key={cover.index}>Cover {cover.index + 1}: {cover.label}</li>)}
              </ul>
            </div>}
            {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
            {warning && <p role="status" className="text-sm text-amber-200">{warning}</p>}
            {!result && <>
              {image && <label className="block space-y-1 text-sm">
                <span>Title (optional)</span>
                <input className={input} value={title} maxLength={400} disabled={!!pending || phase === "publishing"} onChange={(event) => setTitle(event.target.value)} />
                {[...title].length > 200 && <span role="alert" className="text-rose-300">Use 200 characters or fewer.</span>}
              </label>}
              {pending && <p className="text-sm text-neutral-400">Retries keep this exact image and title. Closing the dialog saves this attempt for recovery.</p>}
              <div className="flex flex-wrap gap-2">
                {(phase === "artwork-failed" || phase === "capture-error") && <button className={button} onClick={() => void capture()}>Retry artwork and capture</button>}
                {phase === "artwork-failed" && <button className={button} onClick={() => void capture(true)}>Preview with placeholders</button>}
                {phase === "blocked" && <button className={button} onClick={() => void begin()}>Try again</button>}
                {image && <button className={button} disabled={phase === "publishing" || seconds > 0 || [...title].length > 200 || discardable} onClick={() => void publish()}>
                  {phase === "publishing" ? "Creating link…" : seconds > 0 ? `Retry in ${seconds}s` : pending ? "Retry publication" : "Create link"}
                </button>}
                {discardable && <button className={button} onClick={() => void discard()}>Discard attempt</button>}
              </div>
            </>}
            {result && <div className="space-y-4 text-sm">
              <p>Expires <time dateTime={result.expiresAt}>{new Date(result.expiresAt).toLocaleString()}</time>.</p>
              <label className="block space-y-1">
                <span>Public link</span>
                <input className={input} readOnly value={new URL(result.publicUrl, location.origin).href} onFocus={(event) => event.target.select()} />
              </label>
              <button className={button} onClick={() => void copy(new URL(result.publicUrl, location.origin).href, "Public link")}>Copy public link</button>
              <label className="block space-y-1">
                <span>Private management link</span>
                <input className={input} readOnly value={new URL(result.managementUrl, location.origin).href} onFocus={(event) => event.target.select()} />
              </label>
              <p className="text-neutral-400">Keep this link private and save it to manage or revoke your share.</p>
              <button className={button} onClick={() => void copy(new URL(result.managementUrl, location.origin).href, "Management link")}>Copy management link</button>
              {copyFeedback && <p role="status">{copyFeedback}</p>}
            </div>}
            <Dialog.Close disabled={phase === "publishing"} className={button}>{result ? "Done" : pending ? "Close" : "Cancel"}</Dialog.Close>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
