import { createFileRoute, useRouter } from "@tanstack/react-router";
import { SignIn } from "@clerk/clerk-react";
import { useEffect } from "react";

export const Route = createFileRoute("/_auth/sign-in")({
  component: SignInPage,
});

function SignInPage() {
  const search = Route.useSearch();
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

  return (
    <SignIn
      signUpUrl="/sign-up"
      forceRedirectUrl={search.redirect || "/dashboard"}
    />
  );
}
