import { permanentRedirect } from "next/navigation";

/**
 * Legacy alias.
 *
 * `/profile` used to be its own page. The account area replaced it, and links
 * or bookmarks to the old URL should still land somewhere sensible rather than
 * on a 404. Redirecting — instead of re-exporting the account page — keeps one
 * URL per view: the account overview renders inside the account layout, with
 * its guard and navigation, only at `/account`.
 */
export default function ProfilePage(): never {
  permanentRedirect("/account");
}
