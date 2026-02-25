import { PLACEHOLDER_IMG } from "./util";
import * as htmlToImage from "html-to-image";

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
