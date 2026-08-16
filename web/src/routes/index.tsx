import { createFileRoute } from "@tanstack/react-router";
import { useApplyLastFmUser } from "@/lib/lastfm-user";
import { LAST_FM_USER_KEY, isLastFmUsername } from "@/lib/util";

export type IndexSearch = {
  [LAST_FM_USER_KEY]?: string;
};

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): IndexSearch => {
    const raw = search[LAST_FM_USER_KEY];
    if (typeof raw !== "string") return {};
    const user = raw.trim();
    if (!user || !isLastFmUsername(user)) return {};
    return { [LAST_FM_USER_KEY]: user };
  },
  component: IndexRoute,
});

function IndexRoute() {
  const search = Route.useSearch();
  useApplyLastFmUser(search[LAST_FM_USER_KEY]);
  return null;
}
