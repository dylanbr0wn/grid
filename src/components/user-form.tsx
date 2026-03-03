"use client";
import { cn } from "@/lib/util";
import { useRouter } from "next/navigation";
import { useState } from "react";

import * as motion from "motion/react-client";
import { Field } from "@base-ui/react";
import { useGrid } from "@/hooks/grid";

export default function UserForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setUser } = useGrid()

  function onSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const username = formData.get("lastfm-username")?.toString().trim();
    if (!username) {
      setError("Please enter a username");
      return;
    }
    setUser(username);
  }

  return (
    <form onSubmit={onSubmit} className="text-white flex  items-start z-10">
      <Field.Root
        name="lastfm-username"
        className={cn("flex w-full flex-col items-start gap-1")}
      >
        <div className="hover:bg-neutral-900 focus-within:z-1 focus-within:bg-neutral-900 text-neutral-300 pl-2 relative w-full">
          <Field.Control
            required
            placeholder="Last.fm Username"
            className={cn(
              "h-10 flex outline-0 relative peer items-center w-full"
            )}
          />
          <motion.div
            className={cn(
              "absolute right-0 left-0 bottom-0 h-px bg-neutral-400  transition-colors peer-focus:bg-white peer-focus:h-0.75"
            )}
            layout
            transition={{
              duration: 0.15,
            }}
          />
        </div>

        <Field.Error className="text-sm text-red-800" match={!!error}>
            {error}
          </Field.Error>
      </Field.Root>

      <button
        className="block p-2 w-32 text-base text-neutral-300 text-center bg-neutral-950 hover:bg-neutral-900 relative group"
        type="submit"
      >
        {loading ? "Working..." : "Import"}
        <motion.div
          className={cn(
            "absolute right-0 left-0 bottom-0 h-px bg-neutral-400 group-focus-within:h-0.5 group-focus-within:z-1 transition-colors group-focus:bg-white group-focus:h-0.75"
          )}
          layout
          transition={{
            duration: 0.15,
          }}
        />
      </button>
    </form>
  );
}
