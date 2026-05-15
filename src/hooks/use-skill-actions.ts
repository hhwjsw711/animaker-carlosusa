import { useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { SkillData } from "@/components/skills/skill-dialog";

export function useSkillActions() {
  const skills = useQuery(api.skills.queries.listSkills, {});
  const deleteSkillMutation = useMutation(api.skills.mutations.deleteSkill);

  // Edit dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SkillData | null>(null);

  // Delete dialog state
  const [deleteTargetId, setDeleteTargetId] = useState<Id<"skills"> | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(false);

  const handleNewSkill = useCallback(() => {
    setEditTarget(null);
    setIsDialogOpen(true);
  }, []);

  const handleEditRequest = useCallback(
    (id: Id<"skills">) => {
      const skill = skills?.find((s) => s._id === id);
      if (!skill || skill.type !== "user") return;
      setEditTarget({
        _id: skill._id,
        name: skill.name,
        description: skill.description,
        instructions: skill.instructions,
        icon: skill.icon,
        category: skill.category,
      });
      setIsDialogOpen(true);
    },
    [skills],
  );

  const handleDeleteRequest = useCallback((id: Id<"skills">) => {
    setDeleteTargetId(id);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteTargetId) return;
    setDeleteError(false);
    setIsDeleting(true);
    try {
      await deleteSkillMutation({ skillId: deleteTargetId });
      setDeleteTargetId(null);
    } catch {
      setDeleteError(true);
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTargetId, deleteSkillMutation]);

  const dismissDelete = useCallback(
    (open: boolean) => {
      if (isDeleting) return;
      if (!open) {
        setDeleteTargetId(null);
        setDeleteError(false);
      }
    },
    [isDeleting],
  );

  return {
    skills,
    // Edit
    isDialogOpen,
    setIsDialogOpen,
    editTarget,
    handleNewSkill,
    handleEditRequest,
    // Delete
    deleteTargetId,
    isDeleting,
    deleteError,
    handleDeleteRequest,
    confirmDelete,
    dismissDelete,
  };
}
