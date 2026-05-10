import { useLiveQuery } from "dexie-react-hooks";
import { useCallback } from "react";
import type { UIMessage } from "ai";
import { db, type Conversation, type ChatMessage } from "../db";

export function useAskAiDb() {
  // Load the most recent conversation
  const currentConversation = useLiveQuery(
    () => db.conversations.orderBy("updatedAt").last() ?? Promise.resolve(null),
    [],
  );

  const conversationId = currentConversation?.id ?? null;

  // Load messages for the current conversation
  const storedMessages = useLiveQuery(
    () =>
      conversationId
        ? db.messages.where("conversationId").equals(conversationId).sortBy("createdAt")
        : Promise.resolve([]),
    [conversationId],
  );

  const initialMessages: UIMessage[] = (storedMessages ?? []).map((m) => ({
    id: m.id,
    role: m.role,
    parts: [{ type: "text" as const, text: m.content }],
    content: m.content,
  }));

  const saveMessages = useCallback(
    async (messages: UIMessage[]) => {
      const now = Date.now();
      let convId = conversationId;

      if (!convId) {
        convId = crypto.randomUUID();
        const firstUserMsg = messages.find((m) => m.role === "user");
        const title = firstUserMsg
          ? typeof firstUserMsg.content === "string"
            ? firstUserMsg.content
            : // @ts-expect-error text is on text parts
              (firstUserMsg.parts?.find((p) => p.type === "text")?.text ?? "New Chat")
          : "New Chat";

        const conv: Conversation = {
          id: convId,
          title: String(title).slice(0, 80),
          createdAt: now,
          updatedAt: now,
        };
        await db.conversations.add(conv);
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
            typeof m.content === "string"
              ? m.content
              : // @ts-expect-error text is on text parts
                (m.parts?.find((p) => p.type === "text")?.text ?? ""),
          createdAt: now + i,
        }));

      // Upsert all messages
      await db.messages.bulkPut(dbMessages);
    },
    [conversationId],
  );

  const newChat = useCallback(async () => {
    if (conversationId) {
      // Don't delete history — just create a new conversation on next save
      // We achieve "new chat" by moving to a new conversationId by clearing
      // the current one from local state. We do this by setting updatedAt far back.
      await db.conversations.update(conversationId, { updatedAt: 0 });
    }
  }, [conversationId]);

  return {
    conversationId,
    initialMessages,
    isLoaded: storedMessages !== undefined,
    saveMessages,
    newChat,
  };
}
