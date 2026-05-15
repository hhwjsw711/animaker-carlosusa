import { useEffect } from "react";
import { useConvexAuth } from "convex/react";
import { useNavigate } from "@tanstack/react-router";

/**
 * Watches Convex auth state and navigates the user to `/chat` once authenticated.
 * Use in public auth routes (`/signin`, `/signup`, `/recover`) to bounce already
 * logged-in users away from the sign-in forms.
 *
 * Returns `{ isAuthenticated, isLoading }` so the caller can render a spinner
 * instead of flashing the form while auth state resolves.
 */
export function useRedirectIfAuthenticated() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      void navigate({ to: "/chat", replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  return { isAuthenticated, isLoading };
}
