import { Link, useMatch, useRouter } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { MessageSquareIcon, TrashIcon, XIcon } from "lucide-react";
import { useChatHistory, type TimeGroup } from "../hooks/use-chat-history";

const GROUPS: TimeGroup[] = ["Today", "Yesterday", "Previous 7 Days", "Older"];

export function ChatHistorySidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { grouped, deleteConversation } = useChatHistory();
  const match = useMatch({ strict: false });
  const activeChatId = "conversationId" in match.params ? match.params.conversationId : undefined;
  const router = useRouter();

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    await deleteConversation(id);
    if (activeChatId === id) {
      router.navigate({ to: "/ask-ai" });
    }
  };

  return (
    <>
      <div
        className={cn(
          "absolute right-0 top-0 bottom-0 z-10 bg-background/95 backdrop-blur shadow-lg border-l transition-all duration-300 flex flex-col overflow-hidden",

          isOpen ? "w-65" : "w-0 border-transparent",
        )}
      >
        <div className="flex h-14 items-center justify-between border-b px-4 shrink-0">
          <h2 className="font-semibold text-sm">Chat History</h2>
          <Button variant="ghost" size="icon" className="size-8" onClick={onClose}>
            <XIcon className="size-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-6">
          {GROUPS.map((group) => {
            const chats = grouped[group];
            if (!chats || chats.length === 0) return null;

            return (
              <div key={group} className="space-y-1">
                <h3 className="text-xs font-medium text-muted-foreground px-2 mb-2">{group}</h3>
                {chats.map((chat) => (
                  <Link
                    key={chat.id}
                    to="/ask-ai/$conversationId"
                    params={{ conversationId: chat.id }}
                    className={cn(
                      "group flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted",
                      chat.id === activeChatId ? "bg-muted font-medium" : "text-muted-foreground",
                    )}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <MessageSquareIcon className="size-3.5 shrink-0" />
                      <span className="truncate">{chat.title || "New Chat"}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 shrink-0 opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                      onClick={(e) => handleDelete(e, chat.id)}
                    >
                      <TrashIcon className="size-3.5" />
                    </Button>
                  </Link>
                ))}
              </div>
            );
          })}
          {!grouped["Today"] &&
            !grouped["Yesterday"] &&
            !grouped["Previous 7 Days"] &&
            !grouped["Older"] && (
              <div className="text-sm text-muted-foreground text-center py-8">
                No chat history yet
              </div>
            )}
        </div>
      </div>

      {/* Toggle button overlay if completely closed, but AskAi handles this layout better. */}
    </>
  );
}
