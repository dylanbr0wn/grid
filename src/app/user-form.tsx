'use client'
import Input from '@/components/input'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

export default function UserForm() {
	const router = useRouter()

	function onSubmit(e: React.FormEvent) {
		e.preventDefault()
		const form = e.target as HTMLFormElement
		const formData = new FormData(form)
		const username = formData.get('user') as string
		if (!username) return
		router.push(`/${username}`)
	}

	return (
		<form
			onSubmit={onSubmit}
			className="text-white flex flex-col gap-4 items-center z-10"
		>
			<Suspense>
				<FormInput />
			</Suspense>
			<button
				className="block border border-gray-200 p-2 w-32 text-base text-neutral-300 text-center bg-neutral-950 hover:bg-neutral-900"
				type="submit"
			>
				Generate
			</button>
		</form>
	)
}

function FormInput() {
	const searchParams = useSearchParams()
	return (
		<Input
			name="user"
			label="Last.fm Username"
			required
			placeholder="Somebody123"
			error={searchParams.get('error') || undefined}
		/>
	)
}
