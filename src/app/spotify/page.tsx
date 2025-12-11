import { auth } from "@/auth"
import { getCurrentUserProfile, getRecentlyPlayed, getRecentlyPlayedLastWeek, getRecentlyPlayedSince } from "@/lib/spotify";
import { headers } from "next/headers"
import { redirect, RedirectType } from "next/navigation"

export default async function SpotifyPage() {
  const session = await auth.api.getSession({
    headers: await headers() // you need to pass the headers object.
  })

  if (!session) {
    redirect('/', RedirectType.push)
  }

  console.log("SESSION", session);
  let accessToken = ''
  try {
    const res = await auth.api.getAccessToken({
    body: {
      providerId: "spotify", // or any other provider id
    },
    headers: await headers()// pass headers with authenticated token
    });
    accessToken = res.accessToken;
  } catch (err) {
    console.error("Error getting access token:", err);
  }
  console.log("ACCESS TOKEN", accessToken);

  // compute the week-ago timestamp at the point of use to avoid calling impure Date.now() during render
  let WeekAgoMs: number | undefined;

  try {
    const res = await getRecentlyPlayedLastWeek(accessToken, {perRequestLimit: 50});
    console.log(res);
  }  catch (err) {
    console.error("Error getting recently played:", err);
  }

  if (!session?.user) {
    redirect('/', RedirectType.push)
  }
  return (
    <div className="flex h-full flex-col font-code relative">
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Welcome {session.user.name}</h1>
        <p className="text-lg">We&rsquo;re working hard to bring Spotify support to our app. Stay tuned for updates!</p>
      </div>
    </div>
  )
}
