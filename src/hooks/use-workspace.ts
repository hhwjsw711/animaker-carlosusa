import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useWorkspace() {
  const profile = useQuery(api.collaborators.queries.getMyCollaboratorProfile);

  return {
    isLoading: profile === undefined,
    isCollaborator: profile !== null && profile !== undefined,
    isOwner: profile === null,
    isAdmin: profile === null || profile?.role === "admin",
    isStaff: profile?.role === "staff",
    role: profile?.role ?? null,
  };
}
