'use client'
import 'client-only'

import React, {
	FunctionComponent,
	ReactNode,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { createPortal } from 'react-dom'

import {
	Active,
	Announcements,
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

type SortableProps = {
	activationConstraint?: PointerActivationConstraint
	animateLayoutChanges?: AnimateLayoutChanges
	adjustScale?: boolean
	collisionDetection?: CollisionDetection
	coordinateGetter?: KeyboardCoordinateGetter
	dropAnimation?: DropAnimation | null
	getNewIndex?: NewIndexGetter
	handle?: boolean
	columns: number
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
	strategy?: SortingStrategy
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

export function Sortable({
	activationConstraint,
	animateLayoutChanges,
	adjustScale = false,
	collisionDetection = closestCenter,
	coordinateGetter = sortableKeyboardCoordinates,
	dropAnimation = dropAnimationConfig,
	getNewIndex,
	handle = false,
	columns = 5,
	items: initialItems,
	measuring,
	modifiers,
	removable,
	reorderItems = arrayMove,
	strategy = rectSortingStrategy,
	useDragOverlay = true,
}: SortableProps) {
	const [items, setItems] = useState(initialItems || [])
	const [activeId, setActiveId] = useState<string | null>(null)
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
		() => items.slice(0, columns * columns),
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
			<div className={cn('flex w-full box-border p-5 justify-center')}>
				<SortableContext id="" items={trimmedItems} strategy={strategy}>
					<GridContainer {...props} columns={columns} >
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
					</GridContainer>
				</SortableContext>
			</div>
			{useDragOverlay && typeof document !== 'undefined'
				? createPortal(
						<DragOverlay
							adjustScale={adjustScale}
							dropAnimation={dropAnimation}
						>
							{activeId != null ? (
								<Album
									value={items[activeIndex]}
									handle={handle}
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

type GridContainerProps = {
	children: React.ReactNode
	columns: number
}

export function GridContainer({ children, columns }: GridContainerProps) {
	return (
		<ul
      id="fm-grid"
			className={'w-fit grid grid-cols-[repeat(var(--col-count),1fr)]'}
			style={
				{
					'--col-count': columns,
				} as React.CSSProperties
			}
		>
			{children}
		</ul>
	)
}

type GridProps = {
	items: {
		album: string
		img: string
		artist: string
		id: string
	}[]
	size: number
}

const props: Partial<SortableProps> = {
	adjustScale: true,
	strategy: rectSortingStrategy,
}

export default function Grid({ items, size }: GridProps) {
	return (
		<Sortable
			items={items}
			columns={size}
		/>
	)
}
