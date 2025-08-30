import UserForm from './user-form'

export default async function Home() {
	return (
		<div className="font-code relative w-full h-full">
			<main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start h-full w-full">
				<div className="flex flex-col gap-4 items-center justify-center w-full h-full">
					<h1 className="text-6xl font-bold text-white uppercase font-code tracking-[1rem]">grid</h1>
          <div className='text-neutral-400 text-sm italic'>A Last.fm album grid generator</div>
          <div className='h-32' />
					<UserForm />
				</div>
			</main>
		</div>
	)
}
