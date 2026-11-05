import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ManagedShare } from "@/components/shared-links";

const id = window.location.pathname.slice("/manage/".length);
const token = new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "";
// Fragments never reach the server. Keep it so reloads and saved bookmarks work;
// management responses and outbound links also enforce no-referrer.
document.title = "Manage shared link | GRID";
const robots = document.createElement("meta");
robots.name = "robots";
robots.content = "noindex, nofollow, noarchive";
document.head.append(robots);
const referrer = document.createElement("meta");
referrer.name = "referrer";
referrer.content = "no-referrer";
document.head.append(referrer);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <main className="h-full overflow-y-auto bg-neutral-950 text-neutral-300 p-6 font-code">
      <div className="mx-auto max-w-xl space-y-5">
        <h1 className="text-xl">Manage shared link</h1>
        <p>This private link controls deletion. Save it separately to use it in another browser. External services may retain cached previews after deletion or expiry.</p>
        <ManagedShare id={id} credential={token} />
        <a className="underline" href="/" rel="noreferrer">Open Grid</a>
      </div>
    </main>
  </StrictMode>,
);
