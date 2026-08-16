import { createFileRoute, redirect } from "@tanstack/react-router";
import { useApplyLastFmUser } from "@/lib/lastfm-user";
import { isLastFmUsername } from "@/lib/util";

export const Route = createFileRoute("/$username")({
  beforeLoad: ({ params }) => {
    if (!isLastFmUsername(params.username)) {
      throw redirect({ to: "/" });
    }
  },
  component: UsernameRoute,
});

function UsernameRoute() {
  const { username } = Route.useParams();
  useApplyLastFmUser(username);
  return null;
}
