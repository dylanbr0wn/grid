'use client'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Analytics } from '@vercel/analytics/next'
import { useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useGridStore } from '@/lib/grid-store'
import { useAlbumsStore } from '@/lib/albums-store'
import { LAST_FM_CONTAINER_KEY } from '@/lib/util'
import { fetchLastFmAlbums } from './user-form'

function useAppInitialization() {
  const setInitialized = useGridStore((s) => s.setInitialized);
  const setUser = useGridStore((s) => s.setUser);
  const setAlbums = useAlbumsStore((s) => s.setAlbums);
  useEffect(() => {
    const user = useGridStore.getState().user;
    const sort = useAlbumsStore.getState().albums[LAST_FM_CONTAINER_KEY].sort;
    const autofill = useGridStore.getState().autofill;
    if (!user) {
      setInitialized(true);
      return;
    }
    if (!sort) {
      console.warn("No sort type set, defaulting to 'playcount'");
    }
    fetchLastFmAlbums(user, sort || "playcount")
      .then((albums) => {
        setAlbums((prev) => {
          if (autofill) {
            const remaining = [...albums];
            const newGridAlbums = prev.grid.albums.map((a) => {
              if (a.type === "placeholder" && remaining.length > 0) {
                return remaining.shift()!;
              }
              return a;
            });
            return {
              ...prev,
              [LAST_FM_CONTAINER_KEY]: {
                ...prev[LAST_FM_CONTAINER_KEY],
                albums: remaining,
              },
              grid: { ...prev.grid, albums: newGridAlbums },
            };
          }
          return {
            ...prev,
            [LAST_FM_CONTAINER_KEY]: {
              ...prev[LAST_FM_CONTAINER_KEY],
              albums,
            },
          };
        });
      })
      .catch((err) => {
        console.error("Error fetching albums:", err);
        setUser(undefined);
      })
      .finally(() => {
        setInitialized(true);
      });
  }, [setAlbums, setInitialized, setUser]);
}

export default function AppWrapper({
	children,
}: {
	children: React.ReactNode
}) {
	// Create the client inside useState so it is scoped per component instance,
	// preventing shared state across server renders or concurrent requests.
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						refetchOnWindowFocus: false,
						refetchOnReconnect: false,
					},
				},
			})
	)

  useAppInitialization();

	return (
		<QueryClientProvider client={queryClient}>
			{children}
			<SpeedInsights />
			<Analytics />
		</QueryClientProvider>
	)
}
