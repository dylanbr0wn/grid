"use client";
import { cn, LAST_FM_CONTAINER_KEY, LAST_FM_SORT_KEY, LAST_FM_USER_KEY } from "@/lib/util";
import { useEffect, useRef, useState } from "react";

import { AnimatePresence, motion } from "motion/react";
import { Field } from "@base-ui/react";
import { useGridStore } from "@/lib/grid-store";
import { useAlbumsStore } from "@/lib/albums-store";
import { type } from "arktype";
import { lastFmAlbum } from "@/lib/albums";
import { IconLoader2, IconX } from "@tabler/icons-react";
import { SortType } from "@/lib/sort";

const FieldError = motion.create(Field.Error, { forwardMotionProps: true });

export async function fetchLastFmAlbums(user: string, sort: SortType) {
  const url = new URL("/api/lastfm", window.location.origin);
  if (user) {
    url.searchParams.set(LAST_FM_USER_KEY, user);
  }
  if (sort) {
    url.searchParams.set(LAST_FM_SORT_KEY, sort);
  }

  const response = await fetch(url);

  if (!response.ok) {
    const parseError = type("string.json.parse").to({ error: "string" });
    const body = await response.text();
    const errorData = parseError(body);
    if (errorData instanceof type.errors) {
      console.warn(
        "Last.fm API error response validation error:",
        errorData.summary,
        body,
        url,
      );
      throw new Error(
        `Last.fm API error: ${response.status} ${response.statusText}`,
      );
    }
    console.warn("Last.fm error:", response.status, errorData.error, url);
    throw new Error("Last.fm error: " + errorData.error);
  }

  const parseJson = type("string.json.parse").to(lastFmAlbum.array());

  const data = parseJson(await response.text());

  if (data instanceof type.errors) {
    console.warn("Album data validation error:", data.summary);
    throw new Error(`Album data validation error: ${data.summary}`);
  }
  console.debug("Fetched and validated albums from Last.fm API:", data);
  return data;
}

export default function UserForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setAlbums = useAlbumsStore((state) => state.setAlbums);
  const setUser = useGridStore((state) => state.setUser);
  const autofill = useGridStore((state) => state.autofill);
  const setInitialized = useGridStore((state) => state.setInitialized);
  const initialized = useGridStore((state) => state.initialized);

  const formRef = useRef<HTMLFormElement>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    try {
      e.preventDefault();
      setLoading(true);
      const formData = new FormData(e.currentTarget);
      const username = formData.get("lastfm-username")?.toString().trim();
      const sort = useAlbumsStore.getState().albums[LAST_FM_CONTAINER_KEY].sort;
      if (!sort) {
        console.warn("No sort type set, defaulting to 'playcount'");
      }
      const albums = await fetchLastFmAlbums(username || "", sort || "playcount");
      setUser(username || "");
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
    } catch (err) {
      console.warn("Error fetching albums:", err);
      setError(
        (err as Error).message || "An error occurred while fetching albums.",
      );
      setUser(undefined);
    } finally {
      formRef.current?.reset();
      setLoading(false);
    }
  }

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
    setLoading(true);
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
        setLoading(false);
        setInitialized(true);
      });
  }, [setAlbums, setInitialized, setUser]);

  if (!initialized) {
    return (
      <div className="p-4 text-sm text-neutral-500 col-span-3">
        Loading Last.fm...
      </div>
    );
  }

  return (
    <div className="shrink-0 h-full flex flex-col items-center justify-center p-4 text-sm text-neutral-500 w-full col-span-3 gap-5">
      <div>Import your lastfm scrobbles.</div>
      <form
        ref={formRef}
        onSubmit={onSubmit}
        className="text-white flex w-full items-start z-10"
      >
        <Field.Root
          invalid={!!error}
          name="lastfm-username"
          className="flex flex-col items-start gap-2 w-full"
        >
          <div className={cn("w-full flex items-start")}>
            <div className="hover:bg-neutral-900 focus-within:z-1 focus-within:bg-neutral-900 text-neutral-300 pl-2 relative">
              <Field.Control
                required
                placeholder="Last.fm Username"
                className={cn(
                  "h-10 flex outline-0 relative peer items-center w-full",
                )}
              />
              <motion.div
                className={cn(
                  "absolute right-0 left-0 bottom-0 h-px bg-neutral-400  transition-colors peer-focus:bg-white peer-focus:h-0.75",
                  !!error && !loading && "bg-red-800  peer-focus:bg-red-800",
                )}
                layout
                transition={{
                  duration: 0.15,
                }}
              />
            </div>
            <button
              disabled={loading}
              className="block p-2 w-32 text-base text-neutral-300 text-center bg-neutral-950 hover:bg-neutral-900 relative group disabled:cursor-not-allowed disabled:opacity-50"
              type="submit"
            >
              Import
              <motion.div
                className={cn(
                  "absolute right-0 left-0 bottom-0 h-px bg-neutral-400 group-focus-within:h-0.5 group-focus-within:z-1 transition-colors group-focus:bg-white group-focus:h-0.75",
                  !!error && !loading && "bg-red-800 group-focus:bg-red-800",
                )}
                layout
                transition={{
                  duration: 0.15,
                }}
              />
            </button>
          </div>

          <AnimatePresence mode="wait">
            {loading && (
              <motion.div
                key="loading"
                initial={{
                  opacity: 0,
                }}
                animate={{
                  opacity: 1,
                }}
                exit={{
                  opacity: 0,
                }}
                className="flex text-neutral-500 w-full"
              >
                <IconLoader2 className="size-5 animate-spin" />
                <span className="ml-2">Loading albums...</span>
              </motion.div>
            )}
            {!!error && !loading && <FieldError
              key="error"
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              exit={{
                opacity: 0,
              }}
              className="text-sm text-red-800 w-full flex"
              match={!!error && !loading}
            >
              <IconX className="size-5 inline-block mr-1" />
              <span>{error}</span>
            </FieldError>}
          </AnimatePresence>
        </Field.Root>
      </form>
    </div>
  );
}
