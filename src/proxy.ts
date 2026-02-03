import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

    // Exclude specific known paths like the root, /search, etc.
  if (pathname === '/') {
    return NextResponse.next();
  }

  // Extract the username, assuming it's the first part of the path
  // This removes the leading slash. e.g., "/dylan" becomes "dylan"
  const user = pathname.substring(1).split('/')[0];

  if (user) {
    console.log(`Redirecting old route: ${pathname} to /?lastfmUser=${user}`);
    // Construct the new URL for redirection
    const newUrl = new URL(request.url);
    newUrl.pathname = '/';
    newUrl.searchParams.set('lastfmUser', user);
    return NextResponse.redirect(newUrl);
  }

  return NextResponse.next();;
}

export const config = {
    matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - png files (image files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|placeholder.png).*)'
  ],
}
