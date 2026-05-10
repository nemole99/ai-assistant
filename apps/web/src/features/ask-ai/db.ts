import Dexie, { type EntityTable } from "dexie";

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
}

class AskAiDb extends Dexie {
  conversations!: EntityTable<Conversation, "id">;
  messages!: EntityTable<ChatMessage, "id">;

  constructor() {
    super("AskAiDb");
    this.version(1).stores({
      conversations: "id, updatedAt",
      messages: "id, conversationId, createdAt",
    });
  }
}

export const db = new AskAiDb();
