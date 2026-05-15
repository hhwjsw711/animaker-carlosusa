import { useThreadMessages } from "@convex-dev/agent/react";
import { api } from "../../../convex/_generated/api";

interface BackgroundThreadSubscriberProps {
  agentThreadId: string;
}

/**
 * Invisible component that keeps a Convex subscription active for a
 * background thread. Convex deduplicates subscriptions by query+args,
 * so when the user switches to this thread the data is already cached.
 */
export function BackgroundThreadSubscriber({
  agentThreadId,
}: BackgroundThreadSubscriberProps) {
  useThreadMessages(
    api.chat.queries.listThreadMessages,
    { threadId: agentThreadId },
    { initialNumItems: 50, stream: true },
  );
  return null;
}
