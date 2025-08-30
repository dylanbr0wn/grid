'use client'

import React, { useEffect } from 'react'

import type { DraggableSyntheticListeners } from '@dnd-kit/core'
import type { Transform } from '@dnd-kit/utilities'

import styles from './album.module.scss'
import { cn } from '@/lib/util'
import { ContextMenu } from '@base-ui-components/react'
import { IconCheck, IconChevronRight } from '@tabler/icons-react'

export type Album = {
    album: string;
    img: string;
    artist: string;
    id: string;
    textColor?: string;
    textBackground?: boolean;
}

export interface AlbumProps {
	dragOverlay?: boolean
	color?: string
	disabled?: boolean
	dragging?: boolean
	height?: number
	index?: number
	fadeIn?: boolean
	transform?: Transform | null
	listeners?: DraggableSyntheticListeners
	sorting?: boolean
	transition?: string | null
	wrapperStyle?: React.CSSProperties
	ref?: React.Ref<HTMLLIElement>
  setTextColor?(index: number, color: string): void
  setTextBackground?(index: number, background: boolean): void
	value: Album
	onRemove?(): void
}

export const Album = React.memo(
	({
		dragOverlay,
		dragging,
		disabled,
		fadeIn,
		height,
		index,
		listeners,
		onRemove,
		sorting,
		transition,
		transform,
		value,
		wrapperStyle,
    setTextColor,
    setTextBackground,
		ref,
		...props
	}: AlbumProps) => {

		useEffect(() => {
			if (!dragOverlay) {
				return
			}

			document.body.style.cursor = 'grabbing'

			return () => {
				document.body.style.cursor = ''
			}
		}, [dragOverlay])

		return (
			<li
				className={cn(
					styles.Wrapper,
					fadeIn && styles.fadeIn,
					sorting && styles.sorting,
					dragOverlay && styles.dragOverlay
				)}
				style={
					{
						...wrapperStyle,
						transition: [transition, wrapperStyle?.transition]
							.filter(Boolean)
							.join(', '),
						'--translate-x': transform
							? `${Math.round(transform.x)}px`
							: undefined,
						'--translate-y': transform
							? `${Math.round(transform.y)}px`
							: undefined,
						'--scale-x': transform?.scaleX ? `${transform.scaleX}` : undefined,
						'--scale-y': transform?.scaleY ? `${transform.scaleY}` : undefined,
						'--index': index,
					} as React.CSSProperties
				}
				ref={ref}
			>
				<ContextMenu.Root>
					<ContextMenu.Trigger
						className={cn(
							'flex grow items-center outline-none box-border list-none origin-center [-webkit-tap-highlight-color:transparent] font-normal whitespace-nowrap w-32 h-32 aspect-square relative transition-[box-shadow_200ms_cubic-bezier(0.18,0.67,0.6,1.22)] z-0 focus-visible:z-10 focus-visible:shadow-sm focus-visible:shadow-blue-500] font-code',
							styles.album,
							dragging && styles.dragging,
							dragOverlay && styles.dragOverlay,
							disabled && styles.disabled,
						)}
						{...listeners}
						{...props}
						tabIndex={0}
					>
            {value.img ? <img src={value.img} className="w-full h-full object-cover" /> : <div className='w-full h-full bg-neutral-950' />}
						<div className="flex items-center justify-center">
							<div className="absolute flex items-start flex-col justify-end top-0 left-0 text-wrap font-medium h-full pb-1 px-1 w-fit ">
								<div
									className="font-bold text-[9px]/[9px] pb-0.5"
									style={
										{
											color: value.textColor,
										} as React.CSSProperties
									}
								>
									<span
										className="break-words"
										style={
											{
												backgroundColor: value.textBackground
													? value.textColor === 'white'
														? 'black'
														: 'white'
													: 'transparent',
											} as React.CSSProperties
										}
									>
										{value.album}
									</span>
								</div>
								<div
									className="text-[7px] leading-[7px] font-medium "
									style={{
										color: value.textColor,
									}}
								>
									<span
										className="break-words"
										style={
											{
												backgroundColor: value.textBackground
													? value.textColor === 'white'
														? 'black'
														: 'white'
													: 'transparent',
											} as React.CSSProperties
										}
									>
										{value.artist}
									</span>
								</div>
							</div>
						</div>
					</ContextMenu.Trigger>
					<ContextMenu.Portal>
						<ContextMenu.Positioner className="outline-none">
							<ContextMenu.Popup className="origin-[var(--transform-origin)]  bg-neutral-950 py-1 text-neutral-300 shadow-lg shadow-gray-200 outline outline-gray-200 dark:shadow-none dark:-outline-offset-1 dark:outline-gray-300">
								<ContextMenu.SubmenuRoot>
									<ContextMenu.SubmenuTrigger className="flex cursor-default items-center justify-between gap-4 py-2 pr-4 pl-4 text-sm leading-4 outline-none select-none data-[highlighted]:relative data-[highlighted]:z-0 data-[highlighted]:text-neutral-50 data-[highlighted]:before:absolute data-[highlighted]:before:inset-x-1 data-[highlighted]:before:inset-y-0 data-[highlighted]:before:z-[-1] data-[highlighted]:before:rounded-sm data-[highlighted]:before:bg-neutral-900 data-[popup-open]:relative data-[popup-open]:z-0 data-[popup-open]:before:absolute data-[popup-open]:before:inset-x-1 data-[popup-open]:before:inset-y-0 data-[popup-open]:before:z-[-1]  data-[popup-open]:before:bg-neutral-900 data-[highlighted]:data-[popup-open]:before:bg-neutral-900">
										Text color <IconChevronRight className="size-3" />
									</ContextMenu.SubmenuTrigger>
									<ContextMenu.Portal>
										<ContextMenu.Positioner
											className="outline-none"
											alignOffset={-4}
											sideOffset={-4}
										>
											<ContextMenu.Popup className="origin-[var(--transform-origin)] bg-neutral-950 py-1 text-neutral-300 shadow-lg shadow-neutral-200 outline-1 outline-neutral-200 dark:shadow-none dark:-outline-offset-1 dark:outline-neutral-300">
												<ContextMenu.RadioGroup
													value={value.textColor}
													onValueChange={(value) => setTextColor?.(index ?? -1, value)}
												>
													<ContextMenu.RadioItem
														value="white"
														className="grid cursor-default gap-2 py-2 pr-4 pl-2.5 grid-cols-[0.75rem_1fr] text-sm leading-4 outline-none select-none data-[highlighted]:relative data-[highlighted]:z-0 data-[highlighted]:text-neutral-50 data-[highlighted]:before:absolute data-[highlighted]:before:inset-x-1 data-[highlighted]:before:inset-y-0 data-[highlighted]:before:z-[-1] data-[highlighted]:before:bg-neutral-900"
													>
														<ContextMenu.RadioItemIndicator className="col-start-1">
															<IconCheck className="size-3" />
														</ContextMenu.RadioItemIndicator>
														<span className="col-start-2">White</span>
													</ContextMenu.RadioItem>
													<ContextMenu.RadioItem
														value="black"
														className="grid grid-cols-[0.75rem_1fr] cursor-default gap-2 py-2 pr-4 pl-2.5 text-sm leading-4 outline-none select-none data-[highlighted]:relative data-[highlighted]:z-0 data-[highlighted]:text-neutral-50 data-[highlighted]:before:absolute data-[highlighted]:before:inset-x-1 data-[highlighted]:before:inset-y-0 data-[highlighted]:before:z-[-1] data-[highlighted]:before:bg-neutral-900"
													>
														<ContextMenu.RadioItemIndicator className="col-start-1">
															<IconCheck className="size-3" />
														</ContextMenu.RadioItemIndicator>
														<span className="col-start-2">Black</span>
													</ContextMenu.RadioItem>
												</ContextMenu.RadioGroup>
											</ContextMenu.Popup>
										</ContextMenu.Positioner>
									</ContextMenu.Portal>
								</ContextMenu.SubmenuRoot>
								<ContextMenu.CheckboxItem
									className="grid grid-cols-[0.75rem_1fr] cursor-default gap-2 py-2 pr-4 pl-2.5 text-sm leading-4 outline-none select-none data-[highlighted]:relative data-[highlighted]:z-0 data-[highlighted]:text-neutral-50 data-[highlighted]:before:absolute data-[highlighted]:before:inset-x-1 data-[highlighted]:before:inset-y-0 data-[highlighted]:before:z-[-1] data-[highlighted]:before:bg-neutral-900"
									onClick={() => setTextBackground?.(index ?? -1, !value.textBackground)}
								>
									<ContextMenu.CheckboxItemIndicator className="col-start-1">
										<IconCheck className="size-3" />
									</ContextMenu.CheckboxItemIndicator>
									<span className="col-start-2">Toggle text background</span>
								</ContextMenu.CheckboxItem>
							</ContextMenu.Popup>
						</ContextMenu.Positioner>
					</ContextMenu.Portal>
				</ContextMenu.Root>
			</li>
		)
	}
)
Album.displayName = 'Album'
