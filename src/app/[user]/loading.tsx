import { cn } from '@/lib/util'

export default function Loading() {
	return (
		<div
			className="h-full flex w-full box-border justify-center relative"
		>
			<div className="h-full shrink-0 border-r border-neutral-800 overflow-hidden relative">
				<div className="h-10 border-b border-neutral-800 flex items-center justify-center">
					<h5 className=" text-sm tracking-[0.5rem]  mb-0 uppercase font-code">extras</h5>
				</div>
        <div style={{ width: 3*128 + 16 }}/>
			</div>
			<div className="w-full h-full">
				<div className="h-[calc(100%-80px)] flex justify-center items-center">
					<span className='animate-pulse duration-1000 uppercase tracking-widest text-sm'>Working...</span> 
				</div>
			</div>
		</div>
	)
}
