import { cn } from '@/lib/util'
import { IconLoader, IconLoader2 } from '@tabler/icons-react'

export default function Loading() {
	return (
		<div
			className={cn('h-full flex w-full box-border justify-center relative')}
		>
			<div className="h-full shrink-0 border-r border-neutral-800 overflow-hidden relative">
				<div className="h-10 border-b border-neutral-800 flex items-center justify-center">
					<h5 className=" text-sm tracking-[0.5rem]  mb-0 uppercase font-code">extras</h5>
				</div>
        <div style={{ width: 3*128 + 16 }}/>
			</div>
			<div className="w-full h-full">
				<div className="h-[calc(100%-80px)] flex justify-center items-center">
					<ul
						id="fm-grid"
						className={
							'flex items-center justify-center'
						}
						style={
							{
								'--col-count': 5,
								width: 5 * 128,
								height: 5 * 128,
							} as React.CSSProperties
						}
					>
            <span className='animate-pulse duration-1000 uppercase tracking-widest text-sm'>Loading...</span> 
          </ul>
				</div>
				<div className="flex h-20 w-full shrink-0 items-center p-5 gap-5 border-t border-neutral-800 bg-neutral-950"></div>
			</div>
		</div>
	)
}
