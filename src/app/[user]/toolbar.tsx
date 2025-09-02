'use client'

import Select from '@/components/select'
import { useParams, useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import * as htmlToImage from 'html-to-image'
import { IconGrid3x3, IconGridPattern, IconGridPatternFilled, IconGridScan, IconLayoutGrid, IconLayoutGridFilled } from '@tabler/icons-react'
import Input from '@/components/input'
import NumberInput from '@/components/number-input'
import { useParamsStore } from '@/lib/session-store'

const gridSizes = [
	{ label: '1 x 1', value: '1' },
	{ label: '2 x 2', value: '2' },
	{ label: '3 x 3', value: '3' },
	{ label: '4 x 4', value: '4' },
	{ label: '5 x 5', value: '5' },
]

async function downloadGrid(columns: number, user:string) {
	const node = document.getElementById('fm-grid')
	const dpr = window.devicePixelRatio
	if (!node) return
	const dataUrl = await htmlToImage.toPng(node, {
		canvasHeight: columns * 128 * dpr *2,
		canvasWidth: columns * 128 * dpr *2,
		backgroundColor: '#000000',
	})
  const date = new Date()
	const link = document.createElement('a')
	link.download = `grid_${user}_${date.getDate().toString().padStart(2,'0')}${date.getMonth().toString().padStart(2,'0')}${date.getFullYear()}_${date.getHours().toString().padStart(2,'0')}${date.getMinutes().toString().padStart(2,'0')}${date.getSeconds().toString().padStart(2,'0')}.png`
	link.href = dataUrl
	link.click() // Triggers the download
}



export default function Toolbar() {
	const {user} = useParams()

  const [columns, setColumns] = useParamsStore<number>('cols', 5)
  const [rows, setRows] = useParamsStore<number>('rows', 5)
  const [loading, setLoading] = useState(false)

  function cleanAndSetRows(value: number | null) {
    console.log('value', value)
    if (value === null) return
    if (value < 1) value = 1
    if (value > 10) value = 10
    setRows(value)
  }
  function cleanAndSetCols(value: number | null) {
    console.log('value', value)
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
			<div className="w-1/3"></div>
			<div className="w-1/3 flex items-center justify-center gap-1">
        <NumberInput 
          required
          leftIcon={<div>X</div>}
          min={1}
          max={10}
          value={rows}
          onChange={cleanAndSetRows}
         />
         <NumberInput 
          required
          leftIcon={<div>Y</div>}
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
