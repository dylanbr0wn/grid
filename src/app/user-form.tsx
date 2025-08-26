'use client'

import Input from '@/components/input'
import { Form } from '@base-ui-components/react';
import Link from 'next/link';
import { useState } from 'react'

export default function UserForm() {
	const [username, setUsername] = useState('')

	return (
		<div className='flex flex-col gap-4 items-center'>
      <h1 className='text-4xl font-bold text-white uppercase'>grid</h1>
      <div className='h-32'/>
      <form method='GET' action="/generate" className='text-white flex flex-col gap-4 items-center'>
        <Input
          name="user"
          label="Last.fm Username"
          required
          placeholder="Somebody123"
        />
        <button className=' block rounded-md border border-gray-200 p-2 w-32 text-base text-neutral-300 text-center'>
          Generate
        </button>
      </form> 
    </div>
	)
}
