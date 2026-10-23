import { NextResponse } from "next/server";

import { getNameFromEmail, initialsFrom } from "@/lib/account/profile";
import { getSavedIdSets } from "@/lib/account/queries";
import { getSessionUser } from "@/lib/auth/current-user";

/**
 * The little the browser needs to know about the current session.
 *
 * TWO CALLERS, ONE REQUEST: the site sidebar needs to know whether to show
 * "Sign in" or the customer's name, and the save controls need to know which
 * listings are already saved. Both read this.
 *
 * Why an endpoint rather than server-rendered props: the public pages are
 * statically rendered and revalidated. Reading the session cookie inside them
 * would make every one of them dynamic — every visitor, signed in or not,
 * would lose the cache so that a minority could see their own name. The pages
 * stay cached; the browser asks once per page view.
 *
 * WHAT IS DELIBERATELY ABSENT: the user id, the session token, the session
 * row, `last_login_at`, the role beyond a boolean, and the email. None of it
 * is needed to draw a sidebar or a bookmark, so none of it is sent. The
 * `isAdmin` flag only decides whether a link appears; /admin re-checks the
 * role from the database on every request, so a forged flag buys nothing.
 *
 * `private, no-store` because the response is specific to one cookie and must
 * never be held by a shared cache.
 */
export async function GET() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json(
      { signedIn: false, user: null, saved: { vehicles: [], products: [], properties: [] } },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const sets = await getSavedIdSets(user.id);
  const name = user.fullName?.trim() || getNameFromEmail(user.email);

  return NextResponse.json(
    {
      signedIn: true,
      user: {
        name,
        initials: initialsFrom(user.fullName, user.email),
        isAdmin: user.role === "admin",
      },
      saved: {
        vehicles: [...sets.vehicles],
        products: [...sets.products],
        properties: [...sets.properties],
      },
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
