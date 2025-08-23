"use client"

import React from 'react'
import { cn } from '@/lib/util'

interface Props {
	children: React.ReactNode
	center?: boolean
	style?: React.CSSProperties
}

export function Wrapper({ children, center, style }: Props) {
	return (
		<div
			className={cn(
				'flex w-full box-border p-5 justify-start',
				center && 'justify-center'
			)}
			style={style}
		>
			{children}
		</div>
	)
}
