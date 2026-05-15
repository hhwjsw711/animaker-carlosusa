/**
 * Filter out tool-role messages from the list.
 *
 * Tool-result parts are resolved separately via the toolOutputs map
 * (keyed by toolCallId). Each remaining message (user / assistant) is
 * rendered as its own entry, preserving the chronological order of
 * reasoning, text and tool-call parts exactly as the LLM produced them.
 */

import type { AgentMessage } from "@/types/chat";

export function mergeAgentMessages<T extends AgentMessage>(messages: T[]): T[] {
  return messages.filter((msg) => msg.message?.role !== "tool");
}
