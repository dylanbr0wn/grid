import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import {Pool} from 'pg'

export const auth = betterAuth({
 socialProviders: {
    spotify: {
      clientId: process.env.SPOTIFY_CLIENT_ID as string,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET as string,
      scope: ["user-read-email", "user-read-private", "user-read-recently-played"],
    },
    apple: {
      clientId: process.env.APPLE_CLIENT_ID as string,
      clientSecret: process.env.APPLE_CLIENT_SECRET as string,
    }
  },
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
  }),
  plugins: [nextCookies()]
});
