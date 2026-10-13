import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/better-auth";
import { isAdminEmail } from "@/lib/env";

const ADMIN_PREFIX = "/admin";

/**
 * First-line redirect away from /admin for anonymous visitors.
 * The authoritative authorization check still lives in `requireAdmin()`.
 */
export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  const path = request.nextUrl.pathname;

  if (!path.startsWith(ADMIN_PREFIX)) {
    return response;
  }

  const session = await auth.api.getSession({
    headers: request.headers,
  });

  const email = session?.user?.email;
  if (!email || !isAdminEmail(email)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = `?next=${encodeURIComponent(path)}`;
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|mp4|ico)$).*)",
  ],
};
