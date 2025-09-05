import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function getImageBrightness(src: string): Promise<number> {
  const { promise, resolve, reject } = Promise.withResolvers<number>()
  if (!src) {
    reject('No src provided')
    return promise
  }
	const img = document.createElement('img')
	img.crossOrigin = 'anonymous'
	img.src = src
	img.style.display = 'none'
	document.body.appendChild(img)
	let colorSum = 0

	img.onload = function () {
		// create canvas
		const canvas = document.createElement('canvas')
		canvas.width = img.naturalWidth
		canvas.height = img.naturalHeight

		const ctx = canvas.getContext('2d')
		if (!ctx) {
			reject('Could not get canvas context')
			return
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
			colorSum / (img.naturalWidth * img.naturalHeight * 0.25)
		)
		canvas.remove()
		resolve(brightness)
	}
	const res = await promise
	document.body.removeChild(img)
	return res
}