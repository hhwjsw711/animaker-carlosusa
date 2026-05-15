import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../convex/_generated/api";
import { OnboardingWizard } from "./onboarding-wizard";
import { Button } from "@/components/ui/button";
import Spinner from "@/components/ui/custom/spinner";

interface OnboardingGuardProps {
  children: React.ReactNode;
}

function InactiveCollaboratorScreen() {
  const { t } = useTranslation();
  const { signOut } = useAuthActions();

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4 max-w-sm text-center px-4">
        <p className="text-muted-foreground">{t("errors.collaboratorInactive")}</p>
        <Button onClick={() => void signOut()}>
          {t("actions.signOut")}
        </Button>
      </div>
    </div>
  );
}

export function OnboardingGuard({ children }: OnboardingGuardProps) {
  const user = useQuery(api.users.queries.getMe);
  const collaboratorProfile = useQuery(api.collaborators.queries.getMyCollaboratorProfile);

  if (user === undefined || collaboratorProfile === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="text-muted-foreground" />
      </div>
    );
  }

  // If user is not authenticated, let parent handle
  if (user === null) {
    return <>{children}</>;
  }

  // Inactive collaborator — show message and sign out
  if (collaboratorProfile && collaboratorProfile.status !== "active") {
    return <InactiveCollaboratorScreen />;
  }

  // Active collaborators skip onboarding — the workspace is already set up by the owner
  if (collaboratorProfile) {
    return <>{children}</>;
  }

  // If onboarding is not completed, show wizard
  if (!user.onboardingCompleted) {
    return <OnboardingWizard />;
  }

  // Otherwise show app
  return <>{children}</>;
}
