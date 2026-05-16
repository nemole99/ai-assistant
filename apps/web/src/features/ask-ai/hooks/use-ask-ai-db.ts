import { useRouter } from "@tanstack/react-router";
import { generateId } from "@workspace/ui/lib/id";
import type { UIMessage } from "ai";
import { useLiveQuery } from "dexie-react-hooks";
import { useCallback } from "react";

import { db } from "../db";
import type { Conversation, ChatMessage } from "../db";

// Module-level store so a pending first message survives the route transition
// (component unmounts at /ask-ai and remounts at /ask-ai/$id).
export const pendingFirstMessages = new Map<string, string>();

export function useAskAiDb(targetConversationId?: string) {
  const router = useRouter();

  // If a target ID is provided, use it directly.
  // Otherwise, don't auto-fetch the latest. The user is starting a "new chat".
  const conversationId = targetConversationId || null;

  // Load messages for the current conversation
  const storedData = useLiveQuery(async () => {
    const messages = conversationId
      ? await db.messages
          .where("conversationId")
          .equals(conversationId)
          .sortBy("createdAt")
      : ([] as ChatMessage[]);
    return { conversationId, messages };
  }, [conversationId]);

  const initialMessages: UIMessage[] = (storedData?.messages ?? []).map(
    (m) => ({
      content: (m as any).content,
      id: m.id,
      parts: [{ text: (m as any).content, type: "text" as const }],
      role: m.role,
    })
  );

  // Called when the user sends their very first message (no conversationId yet).
  // Creates the conversation record, stores the message text for the new route to
  // pick up, then navigates — so the stream starts inside the correct component
  // and no state is lost on redirect.
  const startNewConversation = useCallback(
    async (text: string) => {
      const newId = generateId();
      const conv: Conversation = {
        createdAt: Date.now(),
        id: newId,
        title: text.slice(0, 80),
        updatedAt: Date.now(),
      };
      await db.conversations.add(conv);
      pendingFirstMessages.set(newId, text);
      router.navigate({
        params: { conversationId: newId },
        to: "/ask-ai/$conversationId",
      });
    },
    [router]
  );

  const saveMessages = useCallback(
    async (messages: UIMessage[]) => {
      const now = Date.now();
      const convId = conversationId;

      if (!convId) {
        // Should not happen — startNewConversation guarantees a convId before
        // streaming begins. Guard here just in case.
        return;
      }

      await db.conversations.update(convId, { updatedAt: now });

      const dbMessages: ChatMessage[] = messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m, i) => ({
          content:
            typeof (m as any).content === "string"
              ? (m as any).content
              : (m.parts?.find((p) => p.type === "text")?.text ?? ""),
          conversationId: convId,
          createdAt: now + i,
          id: m.id,
          role: m.role as "user" | "assistant",
        }));

      // Upsert all messages
      await db.messages.bulkPut(dbMessages);
    },
    [conversationId]
  );

  const newChat = useCallback(() => {
    router.navigate({ to: "/ask-ai" });
  }, [router]);

  return {
    conversationId,
    initialMessages,
    isLoaded: targetConversationId
      ? storedData !== undefined &&
        storedData.conversationId === targetConversationId
      : true,
    newChat,
    saveMessages,
    startNewConversation,
  };
}
