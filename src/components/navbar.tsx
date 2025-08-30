'use client'

import NavLink, { UserNavLink } from '@/components/navlink'
import { cn } from '@/lib/util'

export default function Navbar() {
	return (
      <nav className="border-b border-neutral-800 flex items-center justify-between h-10">
			{/* <LayoutGroup id="nav"> */}
			<ul className="flex">
				<li className='relative'>
          <div className='h-full px-3 flex items-center justify-center font-code font-bold text-white text-sm tracking-[0.5rem]'>
            <img src="/logo.png" className="h-5" />
          </div>
					<div
						className={cn(
              "bg-white absolute bottom-0 left-0 right-0 h-[1px]",
            )}
					/>
				</li>
				<li className="" key="home">
					<UserNavLink />
				</li>
				<li key="group">
					<NavLink href="/group">Group</NavLink>
				</li>
			</ul>
			{/* </LayoutGroup> */}
		</nav>
	)
}
