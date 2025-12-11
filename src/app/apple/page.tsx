import { auth } from "@/auth"
import { AppleTrack, fetchRecentlyPlayedREST } from "@/lib/apple"
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
      providerId: "apple", // or any other provider id
    },
    headers: await headers()// pass headers with authenticated token
    });
    accessToken = res.accessToken;
  } catch (err) {
    console.error("Error getting access token:", err);
  }

  let tracks: AppleTrack[] = [];
  try {
    tracks = await fetchRecentlyPlayedREST(process.env.APPLE_MUSIC_CLIENT_SECRET as string, accessToken, 50);
  } catch(err) {
    console.error("Error getting recently played:", err);
  }

  if (!session?.user) {
    redirect('/', RedirectType.push)
  }
  return (
    <div className="flex h-full flex-col font-code relative">
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Welcome {session.user.name}</h1>
        <p className="text-lg">{JSON.stringify(tracks)}</p>
      </div>
    </div>
  )
}
