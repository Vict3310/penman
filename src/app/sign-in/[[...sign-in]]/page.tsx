import { SignIn } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { ClerkAuthProvider } from "@/components/clerk-auth-provider";
import { isClerkConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function SignInPage() {
  if (!isClerkConfigured()) {
    redirect("/login");
  }

  const clerkUser = await currentUser();
  if (clerkUser) redirect("/admin");

  return (
    <main className="grid min-h-screen place-items-center bg-cream px-6 py-20">
      <div className="w-full max-w-md">
        <ClerkAuthProvider>
          <SignIn
            path="/sign-in"
            routing="path"
            signUpUrl="/sign-up"
            forceRedirectUrl="/admin"
            appearance={{
              elements: {
                rootBox: "mx-auto w-full",
                card: "shadow-none border-0 rounded-none",
              },
            }}
          />
        </ClerkAuthProvider>
      </div>
    </main>
  );
}
