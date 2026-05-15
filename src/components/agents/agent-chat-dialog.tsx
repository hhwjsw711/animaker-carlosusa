import { useMemo } from "react";
import { useQuery } from "convex/react";
import { useThreadMessages } from "@convex-dev/agent/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { mergeAgentMessages } from "@/lib/merge-agent-messages";
import { getToolResults, resolveToolOutput } from "@/lib/chat-message-utils";
import { MessageList } from "@/components/chat/message-list";
import Spinner from "@/components/ui/custom/spinner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AgentChatDialogProps {
  threadId: Id<"threads"> | null;
  onOpenChange: (open: boolean) => void;
}

export function AgentChatDialog({
  threadId,
  onOpenChange,
}: AgentChatDialogProps) {
  const { t } = useTranslation();

  const thread = useQuery(
    api.chat.queries.getThreadById,
    threadId ? { threadId } : "skip",
  );

  const agentThreadId = thread?.agentThreadId ?? null;

  const { results: serverMessages } = useThreadMessages(
    api.chat.queries.listThreadMessages,
    agentThreadId ? { threadId: agentThreadId } : "skip",
    { initialNumItems: 50 },
  );

  const messages = useMemo(
    () => mergeAgentMessages(serverMessages),
    [serverMessages],
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toolOutputs = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map: Record<string, any> = {};
    for (const msg of serverMessages) {
      for (const part of getToolResults(msg)) {
        if (part.toolCallId) {
          map[part.toolCallId] = resolveToolOutput(part);
        }
      }
    }
    return map;
  }, [serverMessages]);

  const isLoading = threadId !== null && !thread;

  return (
    <Dialog open={!!threadId} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {thread?.title ?? t("actions.viewConversation")}
          </DialogTitle>
        </DialogHeader>
        <div className="h-[60vh] -mx-4">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Spinner />
            </div>
          ) : (
            <MessageList
              messages={messages}
              toolOutputs={toolOutputs}
              isLoading={false}
              threadId={agentThreadId}
            />
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("actions.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
