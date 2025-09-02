import {Metadata, Viewport} from 'next'
import { Geist, Geist_Mono, JetBrains_Mono } from 'next/font/google'
import AppWrapper from '@/components/app-wrapper'

import './globals.css'

const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin'],
})

const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin'],
})

const jetBrainsMono = JetBrains_Mono({
	variable: '--font-jetbrains-mono',
	subsets: ['latin'],
	weight: ['400', '800'],
})

export const metadata: Metadata = {
  metadataBase: new URL('https://grid.dylanbrown.xyz'),
	title: 'GRID',
	description: 'A Last.fm album grid generator',
	openGraph: {
		title: 'GRID',
    type: 'website',
    url: 'https://grid.dylanbrown.xyz',
    siteName: 'GRID',
		description: 'A Last.fm album grid generator',
	},
}

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  colorScheme: 'dark',
}

export default function RootLayout({
	children,
}: {
  children: React.ReactNode
}) {
	return (
		<html lang="en" className="font-code">
			<body
				className={`${geistSans.variable} ${geistMono.variable} ${jetBrainsMono.variable} antialiased h-screen bg-neutral-950 text-neutral-300 overflow-hidden font-code relative`}
			>
				<AppWrapper>{children}</AppWrapper>
			</body>
		</html>
	)
}
