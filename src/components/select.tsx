import { cn } from '@/lib/util'
import { Field } from '@base-ui-components/react'
import { Select as BSelect } from '@base-ui-components/react/select'
import { IconCheck, IconChevronDown } from '@tabler/icons-react'
import * as motion from 'motion/react-client'
import { useState } from 'react'

type SelectProps = {
	items: { label: string; value: string }[]
	onChange: (value: string) => void
	className?: string
	label?: string
	description?: string
	value?: string
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
}: SelectProps) {
  const [open, setOpen] = useState(false)
	return (
		<Field.Root className="flex h-full max-w-64 flex-col items-start gap-1">
			{label && (
				<Field.Label className="text-xs font-medium text-neutral-500">
					{label}
				</Field.Label>
			)}
			<BSelect.Root value={value} items={items} onValueChange={onChange} onOpenChange={setOpen}>
				<BSelect.Trigger
					className={cn(
						'flex h-full min-w-36 items-center gap-2 pr-3 pl-3.5 text-sm text-neutral-300 select-none hover:bg-neutral-900 focus-visible:outline focus-visible:-outline-offset-1 focus-visible:outline-teal-400 data-[popup-open]:bg-neutral-900 cursor-default relative',
						className
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
							'absolute right-0 left-0 bottom-0 h-[1px] bg-neutral-400 group-focus-within:h-[2px] group-focus-within:z-1 data transition-colors',
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
						<BSelect.ScrollUpArrow className="top-0 z-[1] flex h-4 w-full cursor-default items-center justify-center  bg-neutral-900 text-center text-xs before:absolute before:top-[-100%] before:left-0 before:h-full before:w-full before:content-[''] data-[direction=down]:bottom-0 data-[direction=down]:before:bottom-[-100%]" />
						<BSelect.Popup className="group max-h-[var(--available-height)] origin-[var(--transform-origin)] overflow-y-auto  bg-neutral-950 text-neutral-300 shadow-lg shadow-neutral-900  transition-[transform,scale,opacity] data-[ending-style]:scale-90 data-[ending-style]:opacity-0 data-[side=none]:data-[ending-style]:transition-none data-[starting-style]:scale-90 data-[starting-style]:opacity-0 data-[side=none]:data-[starting-style]:scale-100 data-[side=none]:data-[starting-style]:opacity-100 data-[side=none]:data-[starting-style]:transition-none dark:shadow-none border border-neutral-700">
							{items.map(({ label, value }) => (
								<BSelect.Item
									key={label}
									value={value}
									className="grid min-w-[var(--anchor-width)] cursor-default grid-cols-[0.75rem_1fr] items-center gap-2 py-2 pr-4 pl-2.5 text-sm leading-4 outline-none select-none group-data-[side=none]:min-w-[calc(var(--anchor-width)+1rem)] group-data-[side=none]:pr-12 group-data-[side=none]:text-base group-data-[side=none]:leading-4 data-[highlighted]:relative data-[highlighted]:z-0 data-[highlighted]:text-neutral-50 data-[highlighted]:before:absolute data-[highlighted]:before:inset-x-0 data-[highlighted]:before:inset-y-0 data-[highlighted]:before:z-[-1]  data-[highlighted]:before:bg-neutral-900 pointer-coarse:py-2.5 pointer-coarse:text-[0.925rem]"
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
						<BSelect.ScrollDownArrow className="bottom-0 z-[1] flex h-4 w-full cursor-default items-center justify-center bg-neutral-950 text-center text-xs before:absolute before:top-[-100%] before:left-0 before:h-full before:w-full before:content-[''] data-[direction=down]:bottom-0 data-[direction=down]:before:bottom-[-100%]" />
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
