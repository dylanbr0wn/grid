'use client'

import Select from '@/components/select'
import { useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import * as htmlToImage from 'html-to-image'
import { jetBrainsMono } from '../layout'

const gridSizes = [
	{ label: '1 x 1', value: '1' },
	{ label: '2 x 2', value: '2' },
	{ label: '3 x 3', value: '3' },
	{ label: '4 x 4', value: '4' },
	{ label: '5 x 5', value: '5' },
]

async function downloadGrid(columns: number) {
	const node = document.getElementById('fm-grid')
	const dpr = window.devicePixelRatio
	if (!node) return
	const dataUrl = await htmlToImage.toPng(node, {
		canvasHeight: columns * 128 * dpr,
		canvasWidth: columns * 128 * dpr,
		backgroundColor: '#000000',
    style: {
      fontFamily: jetBrainsMono.style.fontFamily
      
    },
		cacheBust: true,
	})
	const link = document.createElement('a')
	link.download = 'my-node.png'
	link.href = dataUrl
	link.click() // Triggers the download
}

export function useToolbar() {
	const searchParams = useSearchParams()
	function updateGridSize(gridSize: string) {
		const params = new URLSearchParams(searchParams.toString())
		params.set('gridSize', gridSize)
		window.history.pushState(null, '', `?${params.toString()}`)
	}

	const columns = useMemo(() => {
		const params = new URLSearchParams(searchParams.toString())
		const size = params.get('gridSize')
		if (!size || isNaN(parseInt(size))) {
			return 5
		}
		return parseInt(size)
	}, [searchParams])
	return { columns, updateGridSize }
}

export default function Toolbar() {
	const { columns, updateGridSize } = useToolbar()
  const [loading, setLoading] = useState(false)

  async function download() {
    setLoading(true)
    await downloadGrid(columns)
    setLoading(false)
  }

	return (
		<div className="flex h-20 w-full shrink-0 items-center p-5 gap-5 border-t border-neutral-800 bg-neutral-950">
			<div className="w-1/3"></div>
			<div className="w-1/3 flex items-center justify-center">
				<Select
					value={columns.toString()}
					items={gridSizes}
					onChange={updateGridSize}
				/>
			</div>
			<div className="w-1/3 flex items-center justify-end">
				<button
          disabled={loading}
					onClick={download}
					className=" border border-gray-200 p-2 w-32 text-base text-neutral-300 disabled:opacity-50 bg-neutral-950 hover:bg-neutral-900 data-[loading=true]:cursor-wait data-[loading=true]:bg-neutral-900"
          data-loading={loading}
				>
					{loading ? 'Loading...' : 'Download'}
				</button>
			</div>
		</div>
	)
}
