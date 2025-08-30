import { cn } from '@/lib/util'

export default function Loading() {
	return (
		<div
			className={cn('h-full flex w-full box-border justify-center relative')}
		>
			<div className="h-full shrink-0 border-r border-neutral-800 overflow-hidden relative">
				<div className="h-10 border-b border-neutral-800 flex items-center justify-center">
					<h5 className="h-10 text-lg/loose mb-0 uppercase font-code">
            
						extras
					</h5>
				</div>
        <div style={{ width: 3*128 + 16 }}/>
			</div>
			<div className="w-full h-full">
				<div className="h-[calc(100%-80px)] flex justify-center items-center">
					<ul
						id="fm-grid"
						className={
							'grid grid-cols-[repeat(var(--col-count),1fr)] auto-rows-min'
						}
						style={
							{
								'--col-count': 5,
								width: 5 * 128,
								height: 5 * 128,
							} as React.CSSProperties
						}
					></ul>
				</div>
				<div className="flex h-20 w-full shrink-0 items-center p-5 gap-5 border-t border-neutral-800 bg-neutral-950"></div>
			</div>
		</div>
	)
}
