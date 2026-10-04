import { toBlob } from "html-to-image";
import { getBrightnessStyle, getImageBrightness, PLACEHOLDER_IMG } from "./util";

export const SNAPSHOT_IMAGE_LIMIT = 10_000_000;
const ARTWORK_TIMEOUT = 15_000;

export type FailedCover = { index: number; label: string };
export type SnapshotCaptureResult =
  | { status: "artwork-failed"; failedCovers: FailedCover[] }
  | { status: "ready"; blob: Blob; width: number; height: number; failedCovers: FailedCover[] };

export class SnapshotCaptureError extends Error {
  constructor(public readonly code: "disposed" | "busy" | "render" | "too-large", message: string) {
    super(message);
    this.name = "SnapshotCaptureError";
  }
}

export type FrozenGridSnapshot = {
  /** Retry keeps this composition. Placeholders are used only with explicit consent. */
  capture(options?: { allowPlaceholders?: boolean }): Promise<SnapshotCaptureResult>;
  dispose(): void;
};

type Cover = {
  image: HTMLImageElement;
  container: HTMLElement | null;
  sources: string[];
  pixels?: string;
  brightness?: number;
  pendingStyle: boolean;
  failure: FailedCover;
};

function pixels(image: HTMLImageElement): string {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");
  if (!context || !canvas.width || !canvas.height) throw new Error("Artwork is unavailable");
  context.drawImage(image, 0, 0);
  return canvas.toDataURL("image/png");
}

function loadImage(source: string, signal: AbortSignal): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const finish = (error?: Error) => {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      image.onload = image.onerror = null;
      if (error) {
        image.removeAttribute("src");
        reject(error);
      } else resolve(image);
    };
    const abort = () => finish(new SnapshotCaptureError("disposed", "Snapshot capture was cancelled."));
    const timer = setTimeout(() => finish(new Error("Artwork timed out")), ARTWORK_TIMEOUT);
    image.crossOrigin = "anonymous";
    image.onload = () => finish();
    image.onerror = () => finish(new Error("Artwork could not be loaded"));
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
    else image.src = source;
  });
}

function settlePendingStyle(cover: Cover, brightness: number) {
  if (!cover.pendingStyle || !cover.container) return;
  const automatic = getBrightnessStyle(brightness);
  const color = cover.container.dataset.coverTextColor || automatic.textColor;
  const background = cover.container.dataset.coverTextBackground;
  const enabled = background === undefined ? automatic.textBackground : background === "true";
  cover.container.querySelectorAll<HTMLElement>("[data-cover-details] > div").forEach((label) => {
    label.style.color = color;
    label.style.setProperty("-webkit-text-fill-color", color);
    const span = label.querySelector("span");
    if (span) {
      span.style.color = color;
      span.style.setProperty("-webkit-text-fill-color", color);
      span.style.backgroundColor = enabled ? color === "white" ? "black" : "white" : "transparent";
    }
  });
}

/** Copy synchronously before any await, so editor changes cannot alter a capture or retry. */
export function freezeGridSnapshot(node: HTMLElement): FrozenGridSnapshot {
  const width = Number.parseFloat(node.style.width);
  const height = Number.parseFloat(node.style.height);
  if (![width, height].every((size) => size >= 128 && size <= 1280 && size % 128 === 0)) {
    throw new SnapshotCaptureError("render", "The grid must have between 1 and 10 rows and columns.");
  }
  const covers: Cover[] = [];
  const clone = (source: Node): Node | null => {
    if (!(source instanceof HTMLElement)) return source.cloneNode(true);
    if (source.classList.contains("no-export")) return null;
    // Creating images without src avoids starting an uncontrolled request while cloning.
    const target = document.createElement(source.tagName);
    for (const attribute of source.attributes) {
      if (!["src", "srcset", "id"].includes(attribute.name)) target.setAttribute(attribute.name, attribute.value);
    }
    const style = getComputedStyle(source);
    for (const name of style) target.style.setProperty(name, style.getPropertyValue(name));
    target.style.animation = "none";
    target.style.transition = "none";
    // Drag transforms and hover overlays are editor feedback, not the stored grid order.
    target.style.transform = "none";
    if (source.getAttribute("aria-roledescription") === "sortable") target.style.opacity = "1";
    target.className = "";
    if (source instanceof HTMLImageElement) {
      const container = source.closest<HTMLElement>("[data-cover-sources]");
      const sources: string[] = container ? JSON.parse(container.dataset.coverSources || "[]") : [source.currentSrc || source.src];
      const current = source.currentSrc || source.src;
      const placeholder = new URL(PLACEHOLDER_IMG, document.baseURI).href;
      const cover: Cover = {
        image: target as HTMLImageElement,
        container: null,
        sources: [...new Set([current, ...sources].filter(Boolean).map((url) => new URL(url, document.baseURI).href))].filter((url) => url !== placeholder),
        pendingStyle: style.opacity === "0",
        failure: { index: covers.length, label: source.alt || `Cover ${covers.length + 1}` },
      };
      if (source.complete && source.naturalWidth && current !== placeholder) {
        try {
          cover.pixels = pixels(source);
          if (cover.pendingStyle) cover.brightness = getImageBrightness(source);
        } catch { /* Retry CORS-safe sources during capture. */ }
      }
      covers.push(cover);
    }
    for (const child of source.childNodes) {
      const copied = clone(child);
      if (copied) target.appendChild(copied);
    }
    return target;
  };
  const frozen = clone(node) as HTMLElement;
  frozen.style.position = "relative";
  frozen.style.width = `${width}px`;
  frozen.style.height = `${height}px`;
  frozen.style.margin = "0";
  for (const cover of covers) {
    cover.container = cover.image.closest("[data-cover-sources]");
    if (cover.brightness !== undefined) settlePendingStyle(cover, cover.brightness);
  }
  const controller = new AbortController();
  let busy = false;
  let host: HTMLElement | undefined;
  const checkDisposed = () => {
    if (controller.signal.aborted) throw new SnapshotCaptureError("disposed", "Snapshot capture was cancelled.");
  };

  return {
    dispose() {
      controller.abort();
      host?.remove();
    },
    async capture({ allowPlaceholders = false } = {}) {
      checkDisposed();
      if (busy) throw new SnapshotCaptureError("busy", "A snapshot capture is already running.");
      busy = true;
      try {
        const outcomes = await Promise.allSettled(covers.map(async (cover) => {
          if (!cover.pixels) {
            for (const source of cover.sources) {
              checkDisposed();
              try {
                const image = await loadImage(source, controller.signal);
                cover.pixels = pixels(image);
                settlePendingStyle(cover, getImageBrightness(image));
                break;
              } catch { checkDisposed(); }
            }
          }
          checkDisposed();
          if (cover.pixels) {
            cover.image.src = cover.pixels;
            cover.image.style.opacity = "1";
            return null;
          }
          if (allowPlaceholders) {
            const image = await loadImage(PLACEHOLDER_IMG, controller.signal);
            cover.image.src = pixels(image);
            cover.image.style.opacity = "1";
            settlePendingStyle(cover, getImageBrightness(image));
          }
          return cover.failure;
        }));
        const failedCovers: FailedCover[] = [];
        for (const outcome of outcomes) {
          if (outcome.status === "rejected") throw outcome.reason;
          if (outcome.value) failedCovers.push(outcome.value);
        }
        if (failedCovers.length && !allowPlaceholders) return { status: "artwork-failed", failedCovers };
        host = document.createElement("div");
        host.style.cssText = "position:fixed;left:-100000px;top:0;pointer-events:none";
        host.setAttribute("aria-hidden", "true");
        host.inert = true;
        host.appendChild(frozen);
        document.body.appendChild(host);
        // Wait for fonts in the attached frozen layout, with bounded cancellation.
        await new Promise<void>((resolve, reject) => {
          const finish = (error?: Error) => {
            clearTimeout(timer);
            controller.signal.removeEventListener("abort", abort);
            if (error) reject(error); else resolve();
          };
          const abort = () => finish(new SnapshotCaptureError("disposed", "Snapshot capture was cancelled."));
          const timer = setTimeout(() => finish(new Error("Grid fonts timed out. Retry capture.")), ARTWORK_TIMEOUT);
          controller.signal.addEventListener("abort", abort, { once: true });
          void document.fonts.ready.then(() => finish(), () => finish(new Error("Grid fonts could not be loaded. Retry capture.")));
        });
        checkDisposed();
        await Promise.all(covers.map((cover) => cover.image.decode()));
        const blob = await toBlob(frozen, {
          width, height, canvasWidth: width, canvasHeight: height,
          pixelRatio: 2, skipAutoScale: true, backgroundColor: "#000000",
        });
        checkDisposed();
        if (!blob) throw new Error("PNG encoding failed");
        if (blob.size > SNAPSHOT_IMAGE_LIMIT) {
          throw new SnapshotCaptureError("too-large", "This PNG exceeds the 10 MB sharing limit. Use a smaller grid and capture again.");
        }
        return { status: "ready", blob, width: width * 2, height: height * 2, failedCovers };
      } catch (error) {
        if (error instanceof SnapshotCaptureError) throw error;
        throw new SnapshotCaptureError("render", error instanceof Error ? error.message : "Snapshot capture failed. Retry capture.");
      } finally {
        host?.remove();
        host = undefined;
        busy = false;
      }
    },
  };
}
