'use client'
import { SpeedInsights } from '@vercel/speed-insights/next'
import Navbar from './navbar'
import { Analytics } from '@vercel/analytics/next'

export default function AppWrapper({
	children,
}: {
	children: React.ReactNode
}) {
	return (
		<>
			<Navbar />
			<div className="h-[calc(100%-40px)]">{children}</div>
			<SpeedInsights />
			<Analytics />
		</>
	)
}
