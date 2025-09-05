'use client'

import Select from '@/components/select'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import * as htmlToImage from 'html-to-image'
import { IconSortAscending2Filled } from '@tabler/icons-react'
import NumberInput from '@/components/number-input'
import { useParamsStore } from '@/lib/session-store'

async function downloadGrid(columns: number, user: string) {
	const node = document.getElementById('fm-grid')
	const dpr = window.devicePixelRatio
	if (!node) return
	const dataUrl = await htmlToImage.toPng(node, {
		canvasHeight: columns * 128 * dpr * 2,
		canvasWidth: columns * 128 * dpr * 2,
		backgroundColor: '#000000',
	})
	const date = new Date()
	const link = document.createElement('a')
	link.download = `grid_${user}_${date
		.getDate()
		.toString()
		.padStart(2, '0')}${date
		.getMonth()
		.toString()
		.padStart(2, '0')}${date.getFullYear()}_${date
		.getHours()
		.toString()
		.padStart(2, '0')}${date.getMinutes().toString().padStart(2, '0')}${date
		.getSeconds()
		.toString()
		.padStart(2, '0')}.png`
	link.href = dataUrl
	link.click() // Triggers the download
}

export function useGridSize() {
	const [rows, setRows] = useParamsStore<number>('rows', 5)
	const [columns, setColumns] = useParamsStore<number>('cols', 5)
	return { rows, setRows, columns, setColumns }
}

type SortType = 'playcount' | 'name' | 'artist' | 'random' | 'custom'

const sortOptions: { label: string; value: SortType }[] = [
	{ label: 'Plays', value: 'playcount' },
	{ label: 'Name', value: 'name' },
	{ label: 'Artist', value: 'artist' },
	{ label: 'Random', value: 'random' },
]

export function useSort() {
	const [sort, setSort, { isPending }] = useParamsStore<SortType>(
		'sort',
		'playcount'
	)
	return { sort, setSort, isPending }
}

export default function Toolbar() {
	const { user } = useParams()
	const { rows, setRows, columns, setColumns } = useGridSize()
	const { sort, setSort } = useSort()

	const [loading, setLoading] = useState(false)

	function cleanAndSetRows(value: number | null) {
		if (value === null) return
		if (value < 1) value = 1
		if (value > 10) value = 10
		setRows(value)
	}
	function cleanAndSetCols(value: number | null) {
		if (value === null) return
		if (value < 1) value = 1
		if (value > 10) value = 10
		setColumns(value)
	}

	async function download() {
		if (!user) return
		if (!columns || !rows) return
		setLoading(true)
		await downloadGrid(columns, user as string)
		setLoading(false)
	}

	return (
		<div className="flex h-20 w-full shrink-0 items-center p-5 gap-5 border-t border-neutral-800 bg-neutral-950 z-20">
			<div className="w-1/3 flex items-center justify-start gap-1">
				<Select
					value={sort}
					items={sortOptions}
					onChange={(v) => setSort(v as SortType)}
					icon={<div className="text-neutral-500">sort by</div>}
				/>
			</div>
			<div className="w-1/3 flex items-center justify-center gap-1">
				<NumberInput
					required
					leftIcon={<div className="text-neutral-500">X</div>}
					min={1}
					max={10}
					value={rows}
					onChange={cleanAndSetRows}
				/>
				<NumberInput
					required
					leftIcon={<div className="text-neutral-500">Y</div>}
					min={1}
					max={10}
					value={columns}
					onChange={cleanAndSetCols}
				/>
				{/* <Select
					value={columns.toString()}
					items={gridSizes}
					onChange={v => setColumns(parseInt(v))}
          icon={<IconLayoutGridFilled className="size-4 text-neutral-300" />}
				/> */}
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
