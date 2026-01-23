'use client'
import { SpeedInsights } from '@vercel/speed-insights/next'
import Navbar from './navbar'
import { Analytics } from '@vercel/analytics/next'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
const queryClient = new QueryClient()

export default function AppWrapper({
	children,
}: {
	children: React.ReactNode
}) {
	return (
		<QueryClientProvider client={queryClient}>
			{children}
			<SpeedInsights />
			<Analytics />
		</QueryClientProvider>
	)
}
