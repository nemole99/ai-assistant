import { useLiveQuery } from "dexie-react-hooks";
import { useCallback } from "react";
import type { UIMessage } from "ai";
import { db, type Conversation, type ChatMessage } from "../db";
import { useRouter } from "@tanstack/react-router";
import { generateId } from "@workspace/ui/lib/id";

export function useAskAiDb(targetConversationId?: string) {
  const router = useRouter();

  // If a target ID is provided, use it directly.
  // Otherwise, don't auto-fetch the latest. The user is starting a "new chat".
  const conversationId = targetConversationId || null;

  // Load messages for the current conversation
  const storedData = useLiveQuery(async () => {
    const messages = conversationId
      ? await db.messages.where("conversationId").equals(conversationId).sortBy("createdAt")
      : ([] as ChatMessage[]);
    return { conversationId, messages };
  }, [conversationId]);

  const initialMessages: UIMessage[] = (storedData?.messages ?? []).map((m) => ({
    id: m.id,
    role: m.role,
    parts: [{ type: "text" as const, text: (m as any).content }],
    content: (m as any).content,
  }));

  const saveMessages = useCallback(
    async (messages: UIMessage[]) => {
      const now = Date.now();
      let convId = conversationId;

      if (!convId) {
        convId = generateId();
        const firstUserMsg = messages.find((m) => m.role === "user");
        const title = firstUserMsg
          ? typeof (firstUserMsg as any).content === "string"
            ? (firstUserMsg as any).content
            : (firstUserMsg.parts?.find((p) => p.type === "text")?.text ?? "New Chat")
          : "New Chat";

        const conv: Conversation = {
          id: convId,
          title: String(title).slice(0, 80),
          createdAt: now,
          updatedAt: now,
        };
        await db.conversations.add(conv);
        setTimeout(() => {
          router.navigate({
            to: "/ask-ai/$conversationId",
            params: { conversationId: convId! },
          });
        }, 0);
      } else {
        await db.conversations.update(convId, { updatedAt: now });
      }

      const dbMessages: ChatMessage[] = messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m, i) => ({
          id: m.id,
          conversationId: convId!,
          role: m.role as "user" | "assistant",
          content:
            typeof (m as any).content === "string"
              ? (m as any).content
              : (m.parts?.find((p) => p.type === "text")?.text ?? ""),
          createdAt: now + i,
        }));

      // Upsert all messages
      await db.messages.bulkPut(dbMessages);
    },
    [conversationId, router],
  );

  const newChat = useCallback(async () => {
    router.navigate({ to: "/ask-ai" });
  }, [router]);

  return {
    conversationId,
    initialMessages,
    isLoaded: targetConversationId
      ? storedData !== undefined && storedData.conversationId === targetConversationId
      : true,
    saveMessages,
    newChat,
  };
}
