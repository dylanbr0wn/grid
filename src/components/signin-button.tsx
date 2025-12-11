"use client"
import { authClient } from "@/auth-client";


export function SignIn() {
  return (
    <>
      <button onClick={async () => {
      const { data, error } = await authClient.signIn.social({
        provider: "spotify",
        callbackURL: '/spotify'
      })
    }}>Sign in to Spotify</button>
    <button onClick={async () => {
      const { data, error } = await authClient.signIn.social({
        provider: "apple",
        callbackURL: '/apple'
      })
    }}>Sign in with Apple</button>
    </>
  )
}
