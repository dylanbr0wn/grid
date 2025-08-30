'use client'

import { cn } from '@/lib/util'
import { IconX } from '@tabler/icons-react'
import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import * as motion from 'motion/react-client'

export default function NavLink({
	href,
	children,
	active: activeOverride,
	...props
}: {
	active?: boolean
	href: string
	children: React.ReactNode
} & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
	const pathname = usePathname()

	const [active, setActive] = useState(false)

	useEffect(() => {
		console.log({ pathname, href, activeOverride })
		setActive(activeOverride !== undefined ? activeOverride : pathname === href)
	}, [activeOverride, pathname, href])

	return (
		<Link
			aria-current={active ? 'page' : undefined}
			data-active={active}
			href={href}
			className="h-10 block box-border hover:bg-neutral-900 font-code relative"
			{...props}
		>
			<div className="w-full h-full flex items-center justify-center relative">
				{active ? (
					<motion.div
						style={{
							bottom: 0,
							left: 0,
							right: 0,
							height: 1,
							backgroundColor: 'white',
							position: 'absolute',
						}}
						layoutId="underline"
						layoutDependency={active}
						id="underline"
					/>
				) : null}
				<div className="px-4">{children}</div>
			</div>
		</Link>
	)
}

export function UserNavLink(
	props: React.AnchorHTMLAttributes<HTMLAnchorElement>
) {
	const pathname = usePathname()
	const { user } = useParams()
	const [active, setActive] = useState(false)
  const [lastUser, setLastUser] = useState(user)

	useEffect(() => {
		// console.log(pathname, user)
		setActive(!!user || pathname === `/`)
	}, [user, pathname])

  useEffect(() => {
    if (user) {
      setLastUser(user)
    }
  },[user])

	return (
		<Link
			aria-current={active ? 'page' : undefined}
			data-active={active}
			href={`/${active ? "": lastUser ?? ""}`}
      onNavigate={() => {
        if (active) {
          setLastUser(undefined)
        }
      }}
			className={cn(
				'group block h-10 relative font-code transition-colors',
				!user && 'hover:bg-neutral-900',
        !!user && active && 'hover:text-rose-700'
			)}
			{...props}
		>
			<div className="w-full h-full flex items-center justify-center relative">
				{!!user && active && (
					<div className="absolute top-0 left-0 w-full h-full flex items-center justify-center transition-colors group-hover:bg-neutral-950/50">
						<div className="flex gap-1  opacity-0 group-hover:opacity-100 items-center group-hover:translate-y-0 transition-all translate-y-4 text-rose-700 group-hover:scale-100 scale-80">
							<IconX className="size-4  " />
							<div>Logout</div>
						</div>
					</div>
				)}
				{active ? (
					<motion.div
						style={{
							bottom: 0,
							left: 0,
							right: 0,
							height: 1,
							position: 'absolute',
						}}
            className={cn(
              "bg-white",
              !!user && "group-hover:bg-rose-700"
            )}
						layoutId="underline"
						layoutDependency={active}
						id="underline"
					/>
				) : null}
				<div className={cn('px-4', user && active && 'group-hover:blur')}>
					{lastUser  ?? 'Personal'}
				</div>
			</div>
		</Link>
	)
}
