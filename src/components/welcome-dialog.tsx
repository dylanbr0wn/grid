"use client";
import { Dialog } from "@base-ui/react";
import { useAlbumsStore } from "@/lib/albums-store";
import Image from "next/image";

const steps: React.ReactNode[] = [
  <>
    Create a{" "}
    <a
      href="https://www.last.fm/join"
      target="_blank"
      rel="noopener noreferrer"
      className="text-[--color-lastfm] underline hover:text-lastfm focus:outline-none"
    >
      Last.fm
    </a>{" "}
    account
  </>,
  <>
    Connect Spotify or another{" "}
    <a
      href="https://www.last.fm/about/trackmymusic"
      target="_blank"
      rel="noopener noreferrer"
      className="text-[--color-lastfm] underline hover:text-lastfm focus:outline-none"
    >
      supported streaming service
    </a>{" "}
    to Last.fm (a free Spotify account works great)
  </>,
  "Enter your Last.fm username in the box on the left and click Import",
  "Drag albums into the grid manually, or hit Autofill to fill it automatically",
  "Export your grid as .jpg or .png using the buttons in the export section",
];

export function WelcomeDialog() {
  const initialized = useAlbumsStore((state) => state.initialized);
  const hasSeenWelcome = useAlbumsStore((state) => state.hasSeenWelcome);
  const setHasSeenWelcome = useAlbumsStore((state) => state.setHasSeenWelcome);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setHasSeenWelcome(true);
    }
  }

  return (
    <Dialog.Root
      open={initialized && !hasSeenWelcome}
      onOpenChange={handleOpenChange}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 min-h-dvh bg-black opacity-20 transition-all duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 dark:opacity-70 supports-[-webkit-touch-callout:none]:absolute" />
        <Dialog.Popup className="fixed top-1/5 left-1/2 w-132 -translate-x-1/2 bg-neutral-950 p-6 text-white outline outline-neutral-800 transition-all duration-150 data-ending-style:scale-90 data-ending-style:opacity-0 data-starting-style:scale-90 data-starting-style:opacity-0 dark:outline-neutral-700">
          <Dialog.Title className="-mt-1.5 mb-1 text-lg font-medium font-mono flex items-center gap-0.5">
            <span>Welcome to</span>
             <Image
              alt="Grid Logo"
              src="/img/logo.png"
              width={20}
              height={20}
              className="shrink-0 w-5 h-5 mx-2 inline-block"
            />

            <span className="font-medium font-mono text-lg tracking-widest">
              GRID
            </span>
          </Dialog.Title>
          <Dialog.Description className="mb-5 text-sm text-neutral-500">
            Build a grid of your most-played albums and export it as an image.
          </Dialog.Description>
          <ol className="flex flex-col gap-3">
            {steps.map((step, i) => (
              <li
                key={i}
                className="flex gap-3 items-start text-sm text-neutral-300"
              >
                <span className="shrink-0 w-5 h-5 flex items-center justify-center text-xs text-neutral-500 border border-neutral-700">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <Dialog.Close
            className="absolute top-0 right-0 h-8 w-8 bg-red-500 text-base font-medium text-white select-none hover:bg-red-700 active:bg-red-900"
            onClick={() => setHasSeenWelcome(true)}
          >
            x
          </Dialog.Close>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
