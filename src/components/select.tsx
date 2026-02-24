"use client";
import { cn } from '@/lib/util'
import { Field } from '@base-ui/react'
import { Select as BSelect } from '@base-ui/react/select'
import { IconCheck, IconChevronDown } from '@tabler/icons-react'
import * as motion from 'motion/react-client'
import { useState } from 'react'

type SelectProps = {
	items: Record<string, string>
	onChange: (value: string | null) => void
	className?: string
	label?: string
	description?: string
	value?: string
  disabled?: boolean
	icon?: React.ReactNode
}

export default function Select({
	items,
	onChange,
	className,
	label,
	description,
	value,
	icon,
  disabled = false,
}: SelectProps) {
  const [open, setOpen] = useState(false)
	return (
		<Field.Root disabled={disabled} className="flex h-full max-w-64 flex-col items-start gap-1">
			{label && (
				<Field.Label className="text-xs font-medium text-neutral-500">
					{label}
				</Field.Label>
			)}
			<BSelect.Root value={value} items={items} onValueChange={onChange} onOpenChange={setOpen}>
				<BSelect.Trigger
					className={cn(
						'flex h-full min-w-36 items-center gap-2 pr-3 pl-3.5 text-sm text-neutral-300 select-none hover:bg-neutral-900 focus-visible:outline focus-visible:-outline-offset-1 focus-visible:outline-teal-400 data-popup-open:bg-neutral-900 cursor-default relative',
						className,
            disabled && 'opacity-50 pointer-events-none'
					)}
				>
					{icon}
					<BSelect.Value />
					<div className="grow" />
					<BSelect.Icon className="flex">
						<IconChevronDown className="size-3" />
					</BSelect.Icon>
					<motion.div
						className={cn(
							'absolute right-0 left-0 bottom-0 h-px bg-neutral-400 group-focus-within:h-0.5 group-focus-within:z-1 data transition-colors',
							open && ' bg-white'
						)}
						layout
						transition={{
							duration: 0.15,
						}}
						style={{
							height: open ? 3 : 1,
						}}
					/>
				</BSelect.Trigger>
				<BSelect.Portal>
					<BSelect.Positioner
						className="outline-none select-none z-10 font-code"
						side="bottom"
						alignItemWithTrigger={false}
					>
						<BSelect.ScrollUpArrow className="top-0 z-1 flex h-4 w-full cursor-default items-center justify-center  bg-neutral-900 text-center text-xs before:absolute before:-top-full before:left-0 before:h-full before:w-full before:content-[''] data-[direction=down]:bottom-0 data-[direction=down]:before:-bottom-full" />
						<BSelect.Popup className="group max-h-(--available-height) origin-(--transform-origin) overflow-y-auto  bg-neutral-950 text-neutral-300 shadow-lg shadow-neutral-900  transition-[transform,scale,opacity] data-ending-style:scale-90 data-ending-style:opacity-0 data-[side=none]:data-ending-style:transition-none data-starting-style:scale-90 data-starting-style:opacity-0 data-[side=none]:data-starting-style:scale-100 data-[side=none]:data-starting-style:opacity-100 data-[side=none]:data-starting-style:transition-none dark:shadow-none border border-neutral-700">
							{Object.entries(items).map(([value, label]) => (
								<BSelect.Item
									key={label}
									value={value}
									className="grid min-w-(--anchor-width) cursor-default grid-cols-[0.75rem_1fr] items-center gap-2 py-2 pr-4 pl-2.5 text-sm leading-4 outline-none select-none group-data-[side=none]:min-w-[calc(var(--anchor-width)+1rem)] group-data-[side=none]:pr-12 group-data-[side=none]:text-base group-data-[side=none]:leading-4 data-highlighted:relative data-highlighted:z-0 data-highlighted:text-neutral-50 data-highlighted:before:absolute data-highlighted:before:inset-x-0 data-highlighted:before:inset-y-0 data-highlighted:before:z-[-1]  data-highlighted:before:bg-neutral-900 pointer-coarse:py-2.5 pointer-coarse:text-[0.925rem]"
								>
									<BSelect.ItemIndicator className="col-start-1">
										<IconCheck className="size-3" />
									</BSelect.ItemIndicator>
									<BSelect.ItemText className="col-start-2">
										{label}
									</BSelect.ItemText>
								</BSelect.Item>
							))}
						</BSelect.Popup>
						<BSelect.ScrollDownArrow className="bottom-0 z-1 flex h-4 w-full cursor-default items-center justify-center bg-neutral-950 text-center text-xs before:absolute before:-top-full before:left-0 before:h-full before:w-full before:content-[''] data-[direction=down]:bottom-0 data-[direction=down]:before:-bottom-full" />
					</BSelect.Positioner>
				</BSelect.Portal>
			</BSelect.Root>

			{description && (
				<Field.Description className="text-sm text-neutral-500">
					{description}
				</Field.Description>
			)}
		</Field.Root>
	)
}
