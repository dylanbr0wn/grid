import { SessionProvider, useSession } from "next-auth/react";

export default function Layout({ children }: { children: React.ReactNode, session: any }) {
  return <div>
    {children}
  </div>
}
