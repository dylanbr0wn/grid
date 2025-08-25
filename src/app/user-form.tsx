'use client'

import Input from '@/components/input'
import { Form } from '@base-ui-components/react';
import Link from 'next/link';
import { useState } from 'react'

export default function UserForm() {
	const [username, setUsername] = useState('')

	return (
		<div className='text-white flex flex-col gap-4 items-center'>
      <Input
        value={username}
        onChange={setUsername}
				label="Last.fm Username"
				required
				description="Your Last.fm username to fetch your top albums."
				placeholder="Enter your Last.fm username"
			/>
      <Link href={`/generate?user=${username}`} className=' block rounded-md border border-gray-200 p-2 w-32 text-base text-neutral-300 text-center'>
        Go
      </Link>
    </div>
	)
}
