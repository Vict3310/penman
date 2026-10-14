import { SignUp } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { isClerkConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function SignUpPage() {
  const clerkUser = await currentUser();
  if (clerkUser) redirect("/admin");

  if (!isClerkConfigured()) {
    redirect("/signup");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-cream px-6 py-20">
      <div className="w-full max-w-md">
        <SignUp
          path="/sign-up"
          routing="path"
          signInUrl="/sign-in"
          forceRedirectUrl="/admin"
          appearance={{
            elements: {
              rootBox: "mx-auto w-full",
              card: "shadow-none border-0 rounded-none",
            },
          }}
        />
      </div>
    </main>
  );
}
