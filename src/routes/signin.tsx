import { createFileRoute } from "@tanstack/react-router";
import Spinner from "@/components/ui/custom/spinner";
import { SignInForm } from "@/components/auth/sign-in-form";
import { useRedirectIfAuthenticated } from "@/components/auth/use-redirect-if-authenticated";

export const Route = createFileRoute("/signin")({
  ssr: false,
  head: () => ({
    meta: [{ name: "robots", content: "noindex,nofollow" }],
  }),
  component: SignInRoute,
});

function SignInRoute() {
  const { isAuthenticated, isLoading } = useRedirectIfAuthenticated();

  if (isLoading || isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="text-muted-foreground" />
      </div>
    );
  }

  return <SignInForm />;
}
