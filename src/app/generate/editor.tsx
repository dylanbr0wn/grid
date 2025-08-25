'use client'
import Input from '@/components/input'
import Grid from './grid'
import { useState } from 'react'
import * as htmlToImage from 'html-to-image'

type EditorProps = {
	data: {
		album: string
		img: string
		artist: string
		id: string
	}[]
	gridSize: string
}

function downloadGrid() {
	const node = document.getElementById('fm-grid')
	if (!node) return
	htmlToImage
		.toPng(node, {
			skipFonts: true,
		})
		.then(function (dataUrl) {
			const link = document.createElement('a')
			link.download = 'my-node.png'
			link.href = dataUrl
			link.click() // Triggers the download
		})
}

export default function Editor({ data, gridSize }: EditorProps) {
	return (
		<div className="flex">
			<div className="w-96">
				<button
					onClick={downloadGrid}
					className="mb-4 rounded-md border border-gray-200 p-2 w-32 text-base text-neutral-300"
				>
					Export
				</button>
			</div>
			<Grid items={data} size={parseInt(gridSize)} />
		</div>
	)
}
