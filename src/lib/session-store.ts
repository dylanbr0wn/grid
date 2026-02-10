"use client";
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function useParamsStore<T>(key: string, defaultValue: T) {
	const queryClient = useQueryClient()
	const query = useQuery<T | undefined>({
		queryKey: ['param-storage', key],
		queryFn: () => {
			const params = new URLSearchParams(window.location.search)
			const raw = params.get(key)
      if (typeof defaultValue === 'string') {
        return (raw as T) ?? defaultValue
      }
			const value = raw ? (JSON.parse(raw) as T) : null
			if (!value) return defaultValue
			return value
		},
		initialData: defaultValue,
	})
	const mutation = useMutation({
		mutationKey: ['param-storage', key],
		mutationFn: async (value: T | undefined) => {
			if (typeof window === 'undefined') return
			const params = new URLSearchParams(window.location.search)

			if (value === undefined) {
				window.sessionStorage.removeItem(key)
			} else {
				if (typeof value === 'string') {
					params.set(key, value)
				} else {
					params.set(key, JSON.stringify(value))
				}
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

	return [data ?? defaultValue, mutate, query, mutation] as const
}

export async function withSessionCache<T>(key: string, value: Promise<T>): Promise<T> {
  const raw = window.sessionStorage.getItem(key)
  if (raw) {
    return Promise.resolve(JSON.parse(raw) as T)
  }
  const res = await value
  window.sessionStorage.setItem(key, JSON.stringify(res))
  return res
}
