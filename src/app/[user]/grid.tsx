'use client'
import 'client-only'
import { ScrollArea } from '@base-ui-components/react/scroll-area'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import {
	closestCenter,
	CollisionDetection,
	DragOverlay,
	DndContext,
	DropAnimation,
	KeyboardSensor,
	KeyboardCoordinateGetter,
	Modifiers,
	MouseSensor,
	MeasuringConfiguration,
	PointerActivationConstraint,
	ScreenReaderInstructions,
	TouchSensor,
	UniqueIdentifier,
	useSensor,
	useSensors,
	defaultDropAnimationSideEffects,
} from '@dnd-kit/core'
import {
	arrayMove,
	useSortable,
	SortableContext,
	sortableKeyboardCoordinates,
	SortingStrategy,
	rectSortingStrategy,
} from '@dnd-kit/sortable'
import { Album, AlbumProps } from './album'

import Toolbar from './toolbar'
import { useParamsStore, useSessionStore } from '@/lib/session-store'
import { GridAlbum } from '@/lib/lastfm'
import { sortAlbums, SortType, useSort } from '@/lib/sort'

const dropAnimationConfig: DropAnimation = {
	sideEffects: defaultDropAnimationSideEffects({
		styles: {
			active: {
				opacity: '0.5',
			},
		},
	}),
}

const screenReaderInstructions: ScreenReaderInstructions = {
	draggable: `
    To pick up a sortable item, press the space bar.
    While sorting, use the arrow keys to move the item.
    Press space again to drop the item in its new position, or press escape to cancel.
  `,
}

async function getImageBrightness(src: string): Promise<number> {
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

function MakeAlbums(items: GridAlbum[]): Album[] {
	return items.map(({ imgs, ...item }) => {
		return {
			...item,
			img: imgs.large || imgs.small || imgs.fallback || '/placeholder.png',
			textColor: 'white',
			textBackground: false,
		}
	})
}

type GridProps = {
	items: GridAlbum[]
}

export default function Grid({
	items: initialItems,
}: GridProps) {
	const [brightnessLookup] = useSessionStore<
		Record<string, number>
	>('album:brightness', {})
	const [albums, setAlbums] = useState<Album[]>(MakeAlbums(initialItems ?? []))
	const strategy = useRef<SortingStrategy>(rectSortingStrategy)
	const [activeId, setActiveId] = useState<string | null>(null)
	const [columns] = useParamsStore<number>('cols', 5)
	const [rows] = useParamsStore<number>('rows', 5)
	const { sort, setSort, isPending } = useSort()
	const isSetup = useRef(false)
	const [hasBrightCalcOnce, setHasBrightCalcOnce] = useState(false)

	const sensors = useSensors(
		useSensor(MouseSensor),
		useSensor(TouchSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		})
	)
	const isFirstAnnouncement = useRef(true)
	const getIndex = useCallback(
		(id: string) => albums?.findIndex((item) => item.id === id) ?? -1,
		[albums]
	)
	const activeIndex = activeId != null ? getIndex(activeId) : -1

	const trimmedItems = useMemo(() => {
		if (!columns || !rows) return []
		if (!albums) return []
		return albums.slice(0, Math.min(columns * rows, albums.length))
	}, [albums, columns, rows])

	const extraItems = useMemo(() => {
		if (!albums) return []
		if (!columns || !rows) return []
		if (albums.length > columns * rows) {
			return albums.slice(columns * rows)
		}
		return []
	}, [albums, columns, rows])

	const setTextColor = useCallback((index: number, color: string) => {
		setAlbums((albums) => {
			if (index === -1) return albums
			const newItems = [...(albums ?? [])]
			newItems[index] = {
				...newItems[index],
				textColor: color,
			}
			return newItems
		})
	}, [])

	const setTextBackground = useCallback(
		(index: number, background: boolean) => {
			setAlbums((albums) => {
				if (index === -1) return albums
				const newItems = [...(albums ?? [])]
				newItems[index] = {
					...newItems[index],
					textBackground: background,
				}
				return newItems
			})
		},
		[]
	)

	const lookupBrightness = useCallback(
		(album: Album) => {
			if (!album.id) return undefined
			if (!brightnessLookup) return undefined
			return brightnessLookup[album.id]
		},
		[brightnessLookup]
	)

	const adustBrightness = useCallback(async (albums: Album[]) => {
		if (hasBrightCalcOnce) return albums
		const items = [...albums]
		const brightnessArray = await Promise.allSettled(
			items.map((album) => {
				const cached = lookupBrightness(album)
				if (cached !== undefined) {
					return Promise.resolve(cached)
				}
				return getImageBrightness(album.img)
			})
		)
		brightnessArray.forEach((brightness, index) => {
			if (brightness.status === 'rejected') {
			} else {
				if (brightness.value > 200) {
					items[index].textBackground = false
					items[index].textColor = 'black'
				} else if (brightness.value > 160) {
					items[index].textBackground = true
					items[index].textColor = 'black'
				} else if (brightness.value > 60) {
					items[index].textBackground = true
					items[index].textColor = 'white'
				} else {
					items[index].textBackground = false
					items[index].textColor = 'white'
				}
			}
		})
		setHasBrightCalcOnce(true)
		return items
	}, [hasBrightCalcOnce, lookupBrightness])

	useEffect(() => {
		if (isSetup.current) return
		if (!initialItems) return

		const albums = MakeAlbums(initialItems)
		setAlbums(albums)
		isSetup.current = true
	}, [initialItems, adustBrightness])

	const updateSort = useCallback(
		(newSort: SortType) => {
			setSort(newSort as any)
			setAlbums((albums) => sortAlbums(albums ?? [], newSort))
		},
		[setSort]
	)

	useEffect(() => {
		if (activeId == null) {
			isFirstAnnouncement.current = true
		}
	}, [activeId])

	if (!albums) return null
	if (!columns || !rows) return null

	return (
		<DndContext
			accessibility={{
				screenReaderInstructions,
			}}
			sensors={sensors}
			onDragStart={({ active }) => {
				if (!active) {
					return
				}
				setActiveId(active.id as string)
				if (trimmedItems.find((item) => item.id === active.id)) {
					strategy.current = rectSortingStrategy
				}
			}}
			onDragEnd={({ over }) => {
				setActiveId(null)

				if (over) {
					const overIndex = getIndex(over.id as string)
					if (activeIndex !== overIndex) {
						setAlbums((albums) =>
							arrayMove(albums ?? [], activeIndex, overIndex)
						)
						setSort('custom')
					}
				}
			}}
			onDragCancel={() => setActiveId(null)}
		>
			<div className="h-full flex w-screen relative">
				<SortableContext items={albums} strategy={rectSortingStrategy} >
					<div
						className="h-full shrink-0 border-r border-neutral-800 overflow-hidden relative flex flex-col"
						style={{ width: 3 * 128 + 16 }}
					>
						<div className="h-10 border-b border-neutral-800 flex items-center justify-center shrink-0">
							<h5 className=" text-sm tracking-[0.5rem]  mb-0 uppercase font-code">
								extras
							</h5>
						</div>
						<ScrollArea.Root
							className="relative w-full h-full"
						>
							<ScrollArea.Viewport
								className="grid grid-cols-3 px-2 relative overscroll-contain overflow-x-hidden"
								style={{ 
                  width: (128 * 3) + 16,
                  height: 'calc(100% - 40px)'
                }}

							>
								{extraItems.map((value, index) => (
									<SortableItem
										key={value.id}
										value={value}
										index={trimmedItems.length + index}
										setTextBackground={setTextBackground}
										setTextColor={setTextColor}
									/>
								))}
							</ScrollArea.Viewport>
							<ScrollArea.Scrollbar className="flex w-1 justify-center bg-neutral-900 opacity-0 transition-opacity delay-300 data-[hovering]:opacity-100 data-[hovering]:delay-0 data-[hovering]:duration-75 data-[scrolling]:opacity-100 data-[scrolling]:delay-0 data-[scrolling]:duration-75">
								<ScrollArea.Thumb className="w-full bg-neutral-500" />
							</ScrollArea.Scrollbar>
						</ScrollArea.Root>
					</div>
					<div className="w-full h-full">
						<ScrollArea.Root
							className="h-[calc(100%-80px)] relative"
							style={
								{
									'--col-count': columns,
								} as React.CSSProperties
							}
						>
							<ScrollArea.Viewport className="h-full flex justify-center items-center-safe">
								<div
									id="fm-grid"
									className={
										'shrink-0 grid grid-cols-[repeat(var(--col-count),1fr)] auto-rows-min h-full'
									}
									style={
										{
											width: columns * 128,
											height: rows * 128,
										} as React.CSSProperties
									}
								>
									{trimmedItems.map((value, index) => (
										<SortableItem
											key={value.id}
											value={value}
											index={index}
											setTextBackground={setTextBackground}
											setTextColor={setTextColor}
											priority={true}
										/>
									))}
								</div>
							</ScrollArea.Viewport>
							<ScrollArea.Scrollbar className="flex w-1 justify-center bg-neutral-900 opacity-0 transition-opacity delay-300 data-[hovering]:opacity-100 data-[hovering]:delay-0 data-[hovering]:duration-75 data-[scrolling]:opacity-100 data-[scrolling]:delay-0 data-[scrolling]:duration-75">
								<ScrollArea.Thumb className="w-full bg-neutral-500" />
							</ScrollArea.Scrollbar>
						</ScrollArea.Root>
						<Toolbar updateSort={updateSort} sort={sort ?? 'playcount'} />
					</div>
				</SortableContext>
			</div>
			{typeof document !== 'undefined'
				? createPortal(
						<DragOverlay adjustScale={false} dropAnimation={dropAnimationConfig}>
							{activeId != null ? (
								<Album
									value={albums[activeIndex]}
									index={activeIndex}
									dragOverlay
								/>
							) : null}
						</DragOverlay>,
						document.body
				  )
				: null}
		</DndContext>
	)
}

type SortableItemProps = {
	disabled?: boolean
	value: Album
	index: number
} & Pick<AlbumProps, 'priority' | 'setTextBackground' | 'setTextColor'>

export function SortableItem({
	disabled,
	value,
	index,
	...props
}: SortableItemProps) {
	const {
		attributes,
		isDragging,
		isSorting,
		listeners,
		setNodeRef,
		transform,
		transition,
	} = useSortable({
		id: value.id,
		disabled,
	})

	return (
		<Album
			ref={setNodeRef}
			value={value}
			disabled={disabled}
			dragging={isDragging}
			sorting={isSorting}
			index={index}
			transform={transform}
			transition={transition}
			listeners={listeners}
			data-index={index}
			data-id={value.id}
			{...props}
			{...attributes}
		/>
	)
}
