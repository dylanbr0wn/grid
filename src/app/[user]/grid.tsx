'use client'
import 'client-only'
import { ScrollArea } from '@base-ui-components/react/scroll-area'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import {
	DragOverlay,
	DndContext,
	KeyboardSensor,
	MouseSensor,
	ScreenReaderInstructions,
	TouchSensor,
	useSensor,
	useSensors,
} from '@dnd-kit/core'
import {
	arrayMove,
	useSortable,
	SortableContext,
	sortableKeyboardCoordinates,
	rectSortingStrategy,
} from '@dnd-kit/sortable'
import { Album, AlbumProps } from './album'

import Toolbar from './toolbar'
import { useParamsStore } from '@/lib/session-store'
import { sortAlbums, SortType, useSort } from '@/lib/sort'

const screenReaderInstructions: ScreenReaderInstructions = {
	draggable: `
    To pick up a sortable item, press the space bar.
    While sorting, use the arrow keys to move the item.
    Press space again to drop the item in its new position, or press escape to cancel.
  `,
}

type GridProps = {
	albums: Album[]
}

export default function Grid({
	albums: initialAlbums,
}: GridProps) {
	const [albums, setAlbums] = useState<Album[]>(initialAlbums)
	const [activeId, setActiveId] = useState<string | null>(null)
	const [columns] = useParamsStore<number>('cols', 5)
	const [rows] = useParamsStore<number>('rows', 5)
	const { sort, setSort } = useSort()

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
	const activeIndex = useMemo(() => activeId != null ? getIndex(activeId) : -1, [activeId, getIndex])

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
							className="relative w-full"
              style={{
                height: 'calc(100% - 40px)'
              }}
						>
							<ScrollArea.Viewport
								className="grid grid-cols-3 px-2 relative overscroll-contain overflow-x-hidden max-h-full"
								style={{ 
                  width: (128 * 3) + 16,
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
						<DragOverlay dropAnimation={{ duration: 0, easing: 'ease-in' }}>
							{activeId != null ? (
								<Album
									value={albums[activeIndex]}
									index={activeIndex}
									dragOverlay
                  priority={true}
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
