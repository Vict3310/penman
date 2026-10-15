import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isClerkConfigured } from "@/lib/env";

const hasClerk = isClerkConfigured();

const isProtectedRoute = createRouteMatcher(["/admin(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (!hasClerk) {
    return NextResponse.next();
  }

  if (isProtectedRoute(req)) {
    const { userId } = await auth();

    if (!userId) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
