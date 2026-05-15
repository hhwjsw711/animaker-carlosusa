import { createFileRoute } from "@tanstack/react-router";
import { ChatLayout } from "@/components/chat/chat-layout";

export const Route = createFileRoute("/_app/chat")({
  component: ChatLayout,
});
