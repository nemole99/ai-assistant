import { isToday, isYesterday, subDays, isAfter } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { useCallback } from "react";

import { db } from "../db";

export type TimeGroup = "Today" | "Yesterday" | "Previous 7 Days" | "Older";

export function useChatHistory() {
  const conversations = useLiveQuery(
    () => db.conversations.orderBy("updatedAt").toReversed().toArray(),
    []
  );

  const deleteConversation = useCallback(async (id: string) => {
    await db.transaction("rw", db.conversations, db.messages, async () => {
      await db.messages.where("conversationId").equals(id).delete();
      await db.conversations.delete(id);
    });
  }, []);

  const grouped = (conversations || []).reduce<
    Record<TimeGroup, typeof conversations>
  >((acc, conv) => {
    const date = new Date(conv.updatedAt);
    if (isToday(date)) {
      if (!acc["Today"]) {
        acc["Today"] = [];
      }
      acc["Today"].push(conv);
    } else if (isYesterday(date)) {
      if (!acc["Yesterday"]) {
        acc["Yesterday"] = [];
      }
      acc["Yesterday"].push(conv);
    } else if (isAfter(date, subDays(new Date(), 7))) {
      if (!acc["Previous 7 Days"]) {
        acc["Previous 7 Days"] = [];
      }
      acc["Previous 7 Days"].push(conv);
    } else {
      if (!acc["Older"]) {
        acc["Older"] = [];
      }
      acc["Older"].push(conv);
    }
    return acc;
  }, {} as any);

  return {
    conversations,
    deleteConversation,
    grouped,
  };
}
