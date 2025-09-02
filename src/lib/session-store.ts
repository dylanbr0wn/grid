'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { useCallback, useMemo } from 'react'

export function useSessionStore<T>(key: string, defaultValue?: T) {
	const queryClient = useQueryClient()
	const query = useQuery<T | undefined>({
		queryKey: ['session-storage', key],
		queryFn: () => {
			const raw = window.sessionStorage.getItem(key)
			return !!raw ? (JSON.parse(raw) as T) : defaultValue
		},
		enabled: typeof window !== 'undefined',
		initialData: defaultValue,
	})
	const mutation = useMutation({
		mutationKey: ['session-storage', key],
		mutationFn: async (
			value: T | ((v: T | undefined) => T | undefined) | undefined
		) => {
			console.log('mutate', value)
			if (typeof window === 'undefined') return
			let newValue: string | undefined
			if (value === undefined) {
				newValue = undefined
			} else if (typeof value === 'function') {
				const raw = window.sessionStorage.getItem(key)

				const _newValue = (value as (v: T | undefined) => T | undefined)(
					!!raw ? (JSON.parse(raw) as T) : defaultValue
				)
				newValue = JSON.stringify(_newValue)
			} else {
				newValue = JSON.stringify(value)
			}
			if (newValue === undefined) {
				window.sessionStorage.removeItem(key)
			} else {
				window.sessionStorage.setItem(key, newValue)
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['session-storage', key] })
		},
	})
  console.log('query', query)
	const { data } = query
	const { mutate } = mutation

	// useEffect(() => {
	//   const storedUser = window.sessionStorage.getItem('user')
	//   if (storedUser) {
	//     setUser(storedUser)
	//   }
	// }, [])

	return [data, mutate, query, mutation] as const
}

export function useParamsStore<T>(key: string, defaultValue?: T) {
	const queryClient = useQueryClient()
	const searchParams = useSearchParams()
	const query = useQuery<T | undefined>({
		queryKey: ['param-storage', key],
		queryFn: () => {
			const params = new URLSearchParams(searchParams.toString())
			const raw = params.get(key)
			const value = raw ? (JSON.parse(raw) as T) : null
			if (!value) return defaultValue
			return value
		},
		enabled: typeof window !== 'undefined',
		initialData: defaultValue,
	})
	const mutation = useMutation({
		mutationKey: ['param-storage', key],
		mutationFn: async (
			value: T | undefined
		) => {
			if (typeof window === 'undefined') return
			const params = new URLSearchParams(searchParams.toString())
			// let newValue: string | undefined
			// if (value === undefined) {
			// 	newValue = undefined
			// }else {
			// 	newValue = JSON.stringify(value)
			// }
			if (value === undefined) {
				window.sessionStorage.removeItem(key)
			} else {
				params.set(key, JSON.stringify(value))
				window.history.pushState(null, '', `?${params.toString()}`)
			}
		},
    onMutate: (value) => {
      if (typeof window === 'undefined') return
      queryClient.setQueryData(['param-storage', key], value)
    },
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['param-storage', key] })
		},
	})
	const { data } = query
	const { mutate } = mutation

	// useEffect(() => {
	//   const storedUser = window.sessionStorage.getItem('user')
	//   if (storedUser) {
	//     setUser(storedUser)
	//   }
	// }, [])

	return [data, mutate, query, mutation] as const
}
