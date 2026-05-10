import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
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
import { Link } from "@tanstack/react-router";
import { env } from "@workspace/env/web";
import { Button, buttonVariants } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { DefaultChatTransport } from "ai";
import { BotIcon, CheckIcon, PlusIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAskAiDb } from "./hooks/use-ask-ai-db";
import { useModelAssignment } from "./hooks/use-model-assignment";

const SUGGESTIONS = [
  "Explain our company's main business areas",
  "What are our core values and working principles?",
  "How does the onboarding process work?",
  "What departments do we have and what do they do?",
];

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
        <BotIcon className="size-8 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Connect GitHub Copilot to start chatting</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Ask AI uses GitHub Copilot to answer questions about the company. Connect your GitHub
          account in Settings to get started.
        </p>
      </div>
      <Link to="/settings/ai-providers" className={cn(buttonVariants({ variant: "default" }))}>
        Go to AI Provider Settings
      </Link>
    </div>
  );
}

export function AskAi() {
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const [inputText, setInputText] = useState("");

  // Check if Copilot is connected
  const { data: providers = [] } = useQuery(
    orpc.aiProvider.list.queryOptions({ input: undefined }),
  );
  const copilotProvider = providers.find((p) => p.provider === "github_copilot") ?? null;
  const isCopilotConnected = copilotProvider !== null;

  // IndexedDB persistence
  const { initialMessages, isLoaded, saveMessages, newChat } = useAskAiDb();

  // Model selection
  const { models, selectedModel, selectedModelId, setSelectedModel } = useModelAssignment(
    copilotProvider?.id ?? null,
  );

  // Group models by vendor
  const modelsByVendor = useMemo(
    () =>
      models.reduce<Record<string, typeof models>>((acc, m) => {
        const vendor = m.vendor || "Other";
        if (!acc[vendor]) acc[vendor] = [];
        acc[vendor]!.push(m);
        return acc;
      }, {}),
    [models],
  );

  // Keep a ref to selectedModelId for the transport body (avoids stale closure)
  const modelIdRef = useRef(selectedModelId);
  useEffect(() => {
    modelIdRef.current = selectedModelId;
  }, [selectedModelId]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${env.VITE_SERVER_URL}/ai/chat`,
        credentials: "include",
        body: () => ({ model: modelIdRef.current }),
      }),
    // Re-create only once (model is passed via ref)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const { messages, sendMessage, status, error, regenerate, setMessages } = useChat({
    transport,
    messages: isLoaded ? initialMessages : [],
    onFinish: ({ messages: updatedMessages }) => {
      saveMessages(updatedMessages);
    },
  });

  // Sync initial messages once IndexedDB has loaded
  useEffect(() => {
    if (isLoaded && initialMessages.length > 0 && messages.length === 0) {
      setMessages(initialMessages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);

  const handlePromptSubmit = useCallback(
    (message: PromptInputMessage) => {
      if (!message.text.trim()) return;
      sendMessage({ text: message.text });
      setInputText("");
    },
    [sendMessage],
  );

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      sendMessage({ text: suggestion });
    },
    [sendMessage],
  );

  const handleNewChat = useCallback(async () => {
    await newChat();
    setMessages([]);
  }, [newChat, setMessages]);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
  }, []);

  if (!isCopilotConnected) {
    return <EmptyState />;
  }

  const isStreaming = status === "streaming" || status === "submitted";

  const getMessageText = (message: (typeof messages)[0]) => {
    if (!message.parts) return "";
    return message.parts
      .filter((p) => p.type === "text")
      .map((p) => (p as { type: "text"; text: string }).text)
      .join("");
  };

  return (
    <div className="relative flex size-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
        <h1 className="text-sm font-semibold">Ask AI</h1>
        <Button onClick={handleNewChat} size="sm" variant="ghost" className="gap-1.5">
          <PlusIcon className="size-4" />
          New Chat
        </Button>
      </div>

      {/* Messages */}
      <div className="flex flex-1 justify-center overflow-hidden">
        <div className="flex w-full max-w-3xl flex-col overflow-hidden">
          <Conversation>
            <ConversationContent>
              {messages.length === 0 && !isStreaming && (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
                  <BotIcon className="size-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Ask anything about the company</p>
                </div>
              )}
              {messages.map((message, i) => (
                <Message from={message.role} key={message.id}>
                  <MessageContent>
                    <MessageResponse>{getMessageText(message)}</MessageResponse>
                  </MessageContent>
                  {/* Inline error on the last assistant message */}
                  {error && message.role === "assistant" && i === messages.length - 1 && (
                    <div className="flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                      <p>
                        {error.message?.includes("403") ||
                        error.message?.includes("COPILOT_NOT_CONNECTED")
                          ? "Your GitHub Copilot connection is no longer active."
                          : "Something went wrong. Please try again."}
                      </p>
                      <div className="flex gap-2">
                        <Button onClick={() => regenerate()} size="sm" variant="outline">
                          Retry
                        </Button>
                        {(error.message?.includes("403") ||
                          error.message?.includes("COPILOT_NOT_CONNECTED")) && (
                          <Link
                            to="/settings/ai-providers"
                            className={cn(
                              buttonVariants({
                                variant: "outline",
                                size: "sm",
                              }),
                            )}
                          >
                            Reconnect Copilot
                          </Link>
                        )}
                      </div>
                    </div>
                  )}
                </Message>
              ))}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
        </div>
      </div>

      {/* Input area */}
      <div className="flex shrink-0 justify-center px-4 pb-4 pt-2">
        <div className="w-full max-w-3xl space-y-3">
          {messages.length === 0 && (
            <Suggestions>
              {SUGGESTIONS.map((s) => (
                <Suggestion key={s} suggestion={s} onClick={handleSuggestionClick} />
              ))}
            </Suggestions>
          )}
          <PromptInput onSubmit={handlePromptSubmit}>
            <PromptInputBody>
              <PromptInputTextarea
                onChange={handleTextChange}
                value={inputText}
                placeholder="Ask anything about the company..."
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools>
                {/* Model selector */}
                <ModelSelector open={modelSelectorOpen} onOpenChange={setModelSelectorOpen}>
                  <ModelSelectorTrigger className="inline-flex h-8 items-center gap-1.5 rounded px-2 text-xs hover:bg-muted">
                    {selectedModel && (
                      <>
                        <ModelSelectorLogo provider="github-copilot" />
                        <ModelSelectorName>{selectedModel.name}</ModelSelectorName>
                      </>
                    )}
                  </ModelSelectorTrigger>
                  <ModelSelectorContent>
                    <ModelSelectorInput placeholder="Search models..." />
                    <ModelSelectorList>
                      <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
                      {Object.entries(modelsByVendor).map(([vendor, vendorModels]) => (
                        <ModelSelectorGroup heading={vendor} key={vendor}>
                          {vendorModels.map((m) => (
                            <ModelSelectorItem
                              key={m.id}
                              value={m.id}
                              onSelect={() => {
                                setSelectedModel(m.id);
                                setModelSelectorOpen(false);
                              }}
                            >
                              <ModelSelectorLogo provider="github-copilot" />
                              <ModelSelectorName>{m.name}</ModelSelectorName>
                              {selectedModelId === m.id && <CheckIcon className="ml-auto size-4" />}
                            </ModelSelectorItem>
                          ))}
                        </ModelSelectorGroup>
                      ))}
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
  );
}
