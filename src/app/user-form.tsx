import Input from '@/components/input'

export default function UserForm({error}: {error?: string}) {
	return (
    <form method='GET' action="/generate" className='text-white flex flex-col gap-4 items-center z-10'>
        <Input
          name="user"
          label="Last.fm Username"
          required
          placeholder="Somebody123"
          error={error}
        />
        <button className='block border border-gray-200 p-2 w-32 text-base text-neutral-300 text-center bg-neutral-950 hover:bg-neutral-900' type='submit'>
          Generate
        </button>
      </form> 
		
	)
}
