import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const PLACEHOLDER_IMG = "/img/placeholder.png";
export const CUSTOM_CONTAINER_KEY = "custom";
export const CUSTOM_SORT_KEY = `${CUSTOM_CONTAINER_KEY}-sort`
export const LAST_FM_CONTAINER_KEY = "lastfm";
export const LAST_FM_SORT_KEY = `${LAST_FM_CONTAINER_KEY}-sort`

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

export function getBrightnessStyle(brightness: number) {
  if (brightness > 200) {
    return {
      textColor: "black",
      textBackground: false,
    };
  } else if (brightness > 160) {
    return {
      textColor: "black",
      textBackground: true,
    };
  } else if (brightness > 60) {
    return {
      textColor: "white",
      textBackground: true,
    };
  } else {
    return {
      textColor: "white",
      textBackground: false,
    };
  }
}

export function getImageBrightness(
	img: HTMLImageElement
): number{
	let colorSum = 0
	const canvas = document.createElement('canvas')
	canvas.width = img.naturalWidth
	canvas.height = img.naturalHeight
  img.crossOrigin = "anonymous";

	const ctx = canvas.getContext('2d')
	if (!ctx) {
		return -1
	}
	ctx.drawImage(img, 0, 0)

	const imageData = ctx.getImageData(
		0,
		canvas.height * 0.75,
		canvas.width,
		canvas.height * 0.25
	)
	const data = imageData.data
	let r, g, b, avg
	for (let x = 0, len = data.length; x < len; x += 4) {
		r = data[x]
		g = data[x + 1]
		b = data[x + 2]

		avg = Math.floor((r + g + b) / 3)
		colorSum += avg
	}

	const brightness = Math.floor(
		colorSum / (canvas.width * canvas.height * 0.25)
	)
	canvas.remove()
	return brightness
}


export function generateId() {
  return Math.random().toString(36).substring(2, 9);
}
