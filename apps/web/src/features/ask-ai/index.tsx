import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorName,
  ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { orpc } from "@/lib/orpc";
import { useChat } from "@ai-sdk/react";
import { useQuery } from "@tanstack/react-query";
import { env } from "@workspace/env/web";
import { Button } from "@workspace/ui/components/button";
import { SiriOrb } from "@workspace/ui/components/smoothui/siri-orb";
import { DefaultChatTransport } from "ai";
import {
  CheckIcon,
  ClipboardCheckIcon,
  ClipboardIcon,
  PlusIcon,
  TicketIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AskAiSkeleton } from "./components/ask-ai-skeleton";
import { ChatError } from "./components/chat-error";
import { EmptyState } from "./components/empty-state";
import { TicketDescriptionDialog } from "./components/ticket-description-dialog";
import { useAskAiDb } from "./hooks/use-ask-ai-db";
import { useModelAssignment } from "./hooks/use-model-assignment";

import { PanelRightCloseIcon, PanelRightOpenIcon } from "lucide-react";
import { ChatHistorySidebar } from "./components/chat-history-sidebar";

export function AskAi({ conversationId }: { conversationId?: string }) {
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  // Check if there are any models available (either System Models like Ollama, or User Models like Copilot)
  const { data: providers = [], isLoading: isProvidersLoading } = useQuery(
    orpc.aiProvider.list.queryOptions({ input: undefined }),
  );
  const copilotProvider =
    providers.find((p) => p.provider === "github_copilot") ?? null;

  // IndexedDB persistence
  const { initialMessages, isLoaded, saveMessages, newChat } =
    useAskAiDb(conversationId);

  // Model selection
  const { models, selectedModel, selectedModelId, setSelectedModel, isModelsLoading } =
    useModelAssignment(copilotProvider?.id ?? null);
  
  const hasModels = models.length > 0;

  // Group models by provider
  const modelsByProvider = useMemo(
    () =>
      models.reduce<Record<string, typeof models>>((acc, m) => {
        const providerName = m.provider || "Other";
        if (!acc[providerName]) acc[providerName] = [];
        acc[providerName]!.push(m);
        return acc;
      }, {}),
    [models],
  );

  // Keep a ref to selectedModelId for the transport body (avoids stale closure)
  const modelIdRef = useRef(selectedModelId);
  useEffect(() => {
    modelIdRef.current = selectedModelId;
  }, [selectedModelId]);

  // Holds the full prompt for ticket generation; cleared after the request is sent
  const ticketPromptRef = useRef<string | null>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${env.VITE_SERVER_URL}/ai/chat`,
        credentials: "include",
        body: () => ({ model: modelIdRef.current }),
        prepareSendMessagesRequest: ({ messages, body }) => {
          const fullPrompt = ticketPromptRef.current;
          ticketPromptRef.current = null;
          if (!fullPrompt) return { body: { ...body, messages } };
          // Replace the last user message content with the template prompt
          const modifiedMessages = messages.map((m, i) =>
            i === messages.length - 1 && m.role === "user"
              ? { ...m, parts: [{ type: "text" as const, text: fullPrompt }] }
              : m,
          );
          return { body: { ...body, messages: modifiedMessages } };
        },
      }),
    // Re-create only once (model + ticket prompt are passed via refs)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const { messages, sendMessage, status, error, regenerate, setMessages } =
    useChat({
      transport,
      messages: isLoaded ? initialMessages : [],
      onFinish: ({ messages: updatedMessages }) => {
        saveMessages(updatedMessages);
      },
    });

  // Sync initial messages when conversation switches or finishes loading
  useEffect(() => {
    if (isLoaded) {
      setMessages(initialMessages);
      setInputText(""); // Reset input when switching chats
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, conversationId]);

  const handlePromptSubmit = useCallback(
    (message: PromptInputMessage) => {
      if (!message.text.trim()) return;
      sendMessage({ text: message.text });
      setInputText("");
    },
    [sendMessage],
  );

  const handleNewChat = useCallback(async () => {
    await newChat();
    setMessages([]);
  }, [newChat, setMessages]);

  const handleGenerateTicket = useCallback(
    (displayText: string, fullPrompt: string) => {
      ticketPromptRef.current = fullPrompt;
      sendMessage({ text: displayText });
    },
    [sendMessage],
  );

  const handleCopyMessage = useCallback((id: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedMessageId(id);
      setTimeout(() => setCopiedMessageId(null), 2000);
    });
  }, []);

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInputText(e.target.value);
    },
    [],
  );

  const [sidebarOpen, setSidebarOpen] = useState(true);

  const isStreaming = status === "streaming" || status === "submitted";

  const getMessageText = (message: (typeof messages)[0]) => {
    if (!message.parts) return "";
    return message.parts
      .filter((p) => p.type === "text")
      .map((p) => (p as { type: "text"; text: string }).text)
      .join("");
  };

  return (
    <div
      className="flex size-full flex-col overflow-hidden bg-background"
      data-layout="fixed"
    >
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-3 z-20 bg-background">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold">Ask AI</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleNewChat}
            size="sm"
            variant="ghost"
            className="gap-1.5"
          >
            <PlusIcon className="size-4" />
            New Chat
          </Button>
          <Button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            size="icon"
            variant="ghost"
            className="size-8"
            title="Toggle chat history"
          >
            {sidebarOpen ? (
              <PanelRightCloseIcon className="size-4" />
            ) : (
              <PanelRightOpenIcon className="size-4" />
            )}
          </Button>
        </div>
      </div>

      {isProvidersLoading || isModelsLoading ? (
        <AskAiSkeleton />
      ) : !hasModels ? (
        <EmptyState />
      ) : (
        <div className="relative flex flex-1 overflow-hidden">
          <div className="flex flex-1 flex-col min-w-0">
            {/* Messages */}
            <div className="flex flex-1 justify-center overflow-hidden">
              <div className="flex w-full max-w-3xl flex-col overflow-hidden">
                <Conversation>
                  <ConversationContent>
                    {messages.length === 0 && !isStreaming && (
                      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
                        <SiriOrb
                          size="100px"
                          animationDuration={15}
                          colors={{
                            bg: "oklch(98% 0.01 220)", // match background
                            c1: "oklch(60% 0.15 186)",
                            c2: "oklch(70% 0.12 210)",
                            c3: "oklch(65% 0.1 160)",
                          }}
                        />
                        <p className="text-sm text-muted-foreground">
                          Ask anything about the company
                        </p>
                      </div>
                    )}
                    {messages.map((message, i) => (
                      <Message from={message.role} key={message.id}>
                        <MessageContent>
                          <MessageResponse>
                            {getMessageText(message)}
                          </MessageResponse>
                        </MessageContent>
                        {message.role === "assistant" &&
                          getMessageText(message) && (
                            <MessageActions>
                              <MessageAction
                                tooltip={
                                  copiedMessageId === message.id
                                    ? "Copied!"
                                    : "Copy"
                                }
                                onClick={() =>
                                  handleCopyMessage(
                                    message.id,
                                    getMessageText(message),
                                  )
                                }
                              >
                                {copiedMessageId === message.id ? (
                                  <ClipboardCheckIcon className="size-4" />
                                ) : (
                                  <ClipboardIcon className="size-4" />
                                )}
                              </MessageAction>
                            </MessageActions>
                          )}
                        {error &&
                          message.role === "assistant" &&
                          i === messages.length - 1 && (
                            <ChatError error={error} onRetry={regenerate} />
                          )}
                      </Message>
                    ))}
                    {error &&
                      messages.length > 0 &&
                      messages[messages.length - 1]?.role === "user" && (
                        <ChatError error={error} onRetry={regenerate} />
                      )}
                  </ConversationContent>
                  <ConversationScrollButton />
                </Conversation>
              </div>
            </div>

            {/* Input area */}
            <div className="flex shrink-0 justify-center px-4 pb-6 pt-2">
              <div className="relative w-full max-w-3xl space-y-3">
                {messages.length === 0 && (
                  <Suggestions>
                    <Suggestion
                      key="ticket"
                      suggestion="Generate ticket description"
                      onClick={() => setTicketDialogOpen(true)}
                    >
                      <TicketIcon className="size-3.5" />
                      Generate ticket description
                    </Suggestion>
                  </Suggestions>
                )}
                <div className="relative flex-col border bg-background shadow-sm focus-within:ring-1 focus-within:ring-ring">
                  <PromptInput
                    onSubmit={handlePromptSubmit}
                    className="px-3 py-1 **:data-[slot=input-group]:border-none"
                  >
                    <PromptInputBody>
                      <PromptInputTextarea
                        onChange={handleTextChange}
                        value={inputText}
                        placeholder="Ask anything about the company..."
                      />
                    </PromptInputBody>
                    <PromptInputFooter>
                      <PromptInputTools>
                        <ModelSelector
                          open={modelSelectorOpen}
                          onOpenChange={setModelSelectorOpen}
                        >
                          <ModelSelectorTrigger className="inline-flex h-8 items-center gap-1.5 rounded px-2 text-xs hover:bg-muted">
                            {selectedModel && (
                              <>
                                <ModelSelectorLogo provider="github-copilot" />
                                <ModelSelectorName>
                                  {selectedModel.name}
                                </ModelSelectorName>
                              </>
                            )}
                          </ModelSelectorTrigger>
                          <ModelSelectorContent>
                            <ModelSelectorInput placeholder="Search models..." />
                            <ModelSelectorList>
                              <ModelSelectorEmpty>
                                No models found.
                              </ModelSelectorEmpty>
                              {Object.entries(modelsByProvider).map(
                                ([providerName, providerModels]) => (
                                  <ModelSelectorGroup
                                    heading={providerName}
                                    key={providerName}
                                  >
                                    {providerModels.map((m) => (
                                      <ModelSelectorItem
                                        key={m.id}
                                        value={m.id}
                                        onSelect={() => {
                                          setSelectedModel(m.id);
                                          setModelSelectorOpen(false);
                                        }}
                                      >
                                        <ModelSelectorLogo provider="github-copilot" />
                                        <ModelSelectorName>
                                          {m.name}
                                        </ModelSelectorName>
                                        {selectedModelId === m.id && (
                                          <CheckIcon className="ml-auto size-4" />
                                        )}
                                      </ModelSelectorItem>
                                    ))}
                                  </ModelSelectorGroup>
                                ),
                              )}
                            </ModelSelectorList>
                          </ModelSelectorContent>
                        </ModelSelector>
                      </PromptInputTools>
                      <PromptInputSubmit
                        disabled={!inputText.trim() || isStreaming}
                        status={isStreaming ? "streaming" : "ready"}
                      />
                    </PromptInputFooter>
                  </PromptInput>
                </div>
              </div>
            </div>
            <TicketDescriptionDialog
              open={ticketDialogOpen}
              onOpenChange={setTicketDialogOpen}
              onGenerate={handleGenerateTicket}
            />
          </div>

          {/* Right Sidebar for History */}
          <ChatHistorySidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
