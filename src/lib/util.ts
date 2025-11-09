import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

export function getImageBrightness(
	img: HTMLImageElement
): number{
	let colorSum = 0
	const canvas = document.createElement('canvas')
	canvas.width = img.naturalWidth
	canvas.height = img.naturalHeight

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
