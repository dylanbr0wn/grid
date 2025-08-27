'use client'
import 'client-only'
import { ScrollArea } from '@base-ui-components/react/scroll-area'

import React, { useEffect, useMemo, useRef, useState } from 'react'
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
	AnimateLayoutChanges,
	NewIndexGetter,
} from '@dnd-kit/sortable'
import { Album } from './album'
import { cn } from '@/lib/util'

import Toolbar, { useToolbar } from './toolbar'

type SortableProps = {
	activationConstraint?: PointerActivationConstraint
	animateLayoutChanges?: AnimateLayoutChanges
	adjustScale?: boolean
	collisionDetection?: CollisionDetection
	coordinateGetter?: KeyboardCoordinateGetter
	dropAnimation?: DropAnimation | null
	getNewIndex?: NewIndexGetter
	handle?: boolean
	items?: {
		album: string
		img: string
		artist: string
		id: string
	}[]
	measuring?: MeasuringConfiguration
	modifiers?: Modifiers
	removable?: boolean
	reorderItems?: typeof arrayMove
	style?: React.CSSProperties
	useDragOverlay?: boolean
	isDisabled?(id: UniqueIdentifier): boolean
}

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

export default function Grid({
	activationConstraint,
	animateLayoutChanges,
	adjustScale = false,
	collisionDetection = closestCenter,
	coordinateGetter = sortableKeyboardCoordinates,
	dropAnimation = dropAnimationConfig,
	getNewIndex,
	handle = false,
	items: initialItems,
	measuring,
	modifiers,
	removable,
	reorderItems = arrayMove,
	useDragOverlay = true,
}: SortableProps) {
	const [items, setItems] = useState(initialItems || [])
	const strategy = useRef<SortingStrategy>(rectSortingStrategy)
	const [activeId, setActiveId] = useState<string | null>(null)
	const { columns } = useToolbar()

	const sensors = useSensors(
		useSensor(MouseSensor, {
			activationConstraint,
		}),
		useSensor(TouchSensor, {
			activationConstraint,
		}),
		useSensor(KeyboardSensor, {
			// Disable smooth scrolling in Cypress automated tests
			coordinateGetter,
		})
	)
	const isFirstAnnouncement = useRef(true)
	const getIndex = (id: string) => items.findIndex((item) => item.id === id)
	const activeIndex = activeId != null ? getIndex(activeId) : -1

	const onRemove = (id: UniqueIdentifier) => {
		const index = getIndex(id as string)
		if (index !== -1) {
			setItems((items) => {
				const newItems = [...items]
				newItems.splice(index, 1)
				return newItems
			})
		}
	}

	useEffect(() => {
		if (activeId == null) {
			isFirstAnnouncement.current = true
		}
	}, [activeId])

	const trimmedItems = useMemo(
		() => items.slice(0, Math.min(columns * columns, items.length)),
		[items, columns]
	)

	const extraItems = useMemo(
		() => {
      if (items.length > columns * columns) {
        return items.slice(columns * columns)
      }
      return []
    },
		[items, columns]
	)

	return (
		<DndContext
			accessibility={{
				screenReaderInstructions,
			}}
			sensors={sensors}
			collisionDetection={collisionDetection}
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
						setItems((items) => reorderItems(items, activeIndex, overIndex))
					}
				}
			}}
			onDragCancel={() => setActiveId(null)}
			measuring={measuring}
			modifiers={modifiers}
		>
			<div
				className={cn('h-full flex w-full box-border justify-center relative')}
			>
				<SortableContext items={items} strategy={rectSortingStrategy}>
					<div className="h-full shrink-0 border-r border-neutral-800 overflow-hidden relative">
						<div className="h-10 border-b border-neutral-800 flex items-center justify-center">
							<h5 className="h-10 text-lg/loose mb-0 uppercase font-code">extras</h5>
						</div>
						<ScrollArea.Root className="h-[calc(100%-40px)] relative">
							<ScrollArea.Viewport className="h-full mr-2">
								<div className="grid grid-cols-3 p-2">
									{extraItems.map((value, index) => (
										<SortableItem
											key={value.id}
											value={value}
											handle={handle}
											index={index}
											onRemove={onRemove}
											animateLayoutChanges={animateLayoutChanges}
											useDragOverlay={useDragOverlay}
											getNewIndex={getNewIndex}
										/>
									))}
								</div>
							</ScrollArea.Viewport>
							<ScrollArea.Scrollbar className="flex w-1 justify-center bg-neutral-900 opacity-0 transition-opacity delay-300 data-[hovering]:opacity-100 data-[hovering]:delay-0 data-[hovering]:duration-75 data-[scrolling]:opacity-100 data-[scrolling]:delay-0 data-[scrolling]:duration-75">
								<ScrollArea.Thumb className="w-full bg-neutral-500" />
							</ScrollArea.Scrollbar>
						</ScrollArea.Root>
					</div>
					<div className="w-full h-full">
						<div className='h-[calc(100%-80px)] flex justify-center items-center'>
							<ul
								id="fm-grid"
								className={
									'grid grid-cols-[repeat(var(--col-count),1fr)]'
								}
								style={
									{
										'--col-count': columns,
										width: columns * 128,
										height: columns * 128,
									} as React.CSSProperties
								}
							>
								{trimmedItems.map((value, index) => (
									<SortableItem
										key={value.id}
										value={value}
										handle={handle}
										index={index}
										onRemove={onRemove}
										animateLayoutChanges={animateLayoutChanges}
										useDragOverlay={useDragOverlay}
										getNewIndex={getNewIndex}
									/>
								))}
							</ul>
						</div>
						<Toolbar />
					</div>
				</SortableContext>
			</div>
			{useDragOverlay && typeof document !== 'undefined'
				? createPortal(
						<DragOverlay
							adjustScale={adjustScale}
							dropAnimation={dropAnimation}
						>
							{activeId != null ? (
								<Album value={items[activeIndex]} handle={handle} dragOverlay />
							) : null}
						</DragOverlay>,
						document.body
				  )
				: null}
		</DndContext>
	)
}

interface SortableItemProps {
	animateLayoutChanges?: AnimateLayoutChanges
	disabled?: boolean
	getNewIndex?: NewIndexGetter
	value: {
		album: string
		img: string
		artist: string
		id: string
	}
	index: number
	handle: boolean
	useDragOverlay?: boolean
	onRemove(id: UniqueIdentifier): void
}

export function SortableItem({
	disabled,
	animateLayoutChanges,
	getNewIndex,
	value,
	index,
	onRemove,
	// style,
	useDragOverlay,
}: SortableItemProps) {
	const {
		active,
		attributes,
		isDragging,
		isSorting,
		listeners,
		overIndex,
		setNodeRef,
		transform,
		transition,
	} = useSortable({
		id: value.id,
		animateLayoutChanges,
		disabled,
		getNewIndex,
	})

	return (
		<Album
			ref={setNodeRef}
			value={value}
			disabled={disabled}
			dragging={isDragging}
			sorting={isSorting}
			index={index}
			onRemove={() => onRemove(value.id as UniqueIdentifier)}
			transform={transform}
			transition={transition}
			listeners={listeners}
			data-index={index}
			data-id={value.id}
			dragOverlay={!useDragOverlay && isDragging}
			// {...attributes}
		/>
	)
}
