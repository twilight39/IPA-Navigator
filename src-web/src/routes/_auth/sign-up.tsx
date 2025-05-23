import { useEffect } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ClerkLoaded, ClerkLoading, SignUp } from "@clerk/clerk-react";

export const Route = createFileRoute("/_auth/sign-up")({
  component: SignUpPage,
});

function SignUpPage() {
  const router = useRouter();

  useEffect(() => {
    try {
      router.preloadRoute({
        to: "/sign-up",
      });
    } catch (err) {
      console.warn(`Failed to preload sign-up page: ${err}`);
    }
  }, [router]);

  return <SignUp signInUrl="/sign-in" forceRedirectUrl="/dashboard" />;
}
