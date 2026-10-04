import { PLACEHOLDER_IMG } from "./util";
import * as htmlToImage from "html-to-image";

export { freezeGridSnapshot, SnapshotCaptureError, SNAPSHOT_IMAGE_LIMIT } from "./snapshot-capture";
export type { FrozenGridSnapshot, SnapshotCaptureResult, FailedCover } from "./snapshot-capture";

export async function gridToJpeg(node: HTMLElement, width: number, height: number) {
  return await htmlToImage.toJpeg(node, {
    canvasHeight: height,
    canvasWidth: width,
    backgroundColor: "#000000",
    imagePlaceholder: PLACEHOLDER_IMG,
    quality: 1,
    type: "image/jpeg",
    includeQueryParams: true,
    filter: (node) => {
      return !(node as HTMLElement).classList?.contains("no-export");
    },
  });
}

export async function gridToPng(node: HTMLElement, width: number, height: number) {
  return await htmlToImage.toPng(node, {
    canvasHeight: height,
    canvasWidth: width,
    backgroundColor: "#000000",
    imagePlaceholder: PLACEHOLDER_IMG,
    quality: 1,
    type: "image/png",
    includeQueryParams: true,
    filter: (node) => {
      return !(node as HTMLElement).classList?.contains("no-export");
    },
  });
}

export async function gridToBlob(node: HTMLElement, width: number, height: number) {
  return await htmlToImage.toBlob(node, {
    canvasHeight: height,
    canvasWidth: width,
    backgroundColor: "#000000",
    imagePlaceholder: PLACEHOLDER_IMG,
    quality: 1,
    type: "image/png",
    includeQueryParams: true,
    filter: (node) => {
      return !(node as HTMLElement).classList?.contains("no-export");
    }
  });
}

export async function gridToWebp(node: HTMLElement, width: number, height: number) {
  const canvas = await htmlToImage.toCanvas(node, {
    canvasHeight: height,
    canvasWidth: width,
    backgroundColor: "`#000000`",
    imagePlaceholder: PLACEHOLDER_IMG,
    includeQueryParams: true,
    filter: (node) => {
      return !(node as HTMLElement).classList?.contains("no-export");
    },
  });
  const dataUrl = canvas.toDataURL("image/webp", 1);
  if (!dataUrl.startsWith("data:image/webp")) {
    throw new Error("WebP export is not supported by this browser");
  }
  return dataUrl;
}
