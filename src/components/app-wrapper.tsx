'use client'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Analytics } from '@vercel/analytics/next'
import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

export default function AppWrapper({
	children,
}: {
	children: React.ReactNode
}) {
	// Create the client inside useState so it is scoped per component instance,
	// preventing shared state across server renders or concurrent requests.
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						refetchOnWindowFocus: false,
						refetchOnReconnect: false,
					},
				},
			})
	)

	return (
		<QueryClientProvider client={queryClient}>
			{children}
			<SpeedInsights />
			<Analytics />
		</QueryClientProvider>
	)
}
