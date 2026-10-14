import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const hasClerk = Boolean(
  (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "").trim() &&
    (process.env.CLERK_SECRET_KEY ?? "").trim(),
);

const isProtectedRoute = createRouteMatcher(["/admin(.*)"]);

export default hasClerk
  ? clerkMiddleware(async (auth, req) => {
      if (isProtectedRoute(req)) {
        await auth.protect();
      }
    })
  : function middleware() {
      return NextResponse.next();
    };

export const config = {
  matcher: ["/admin(.*)"],
};
