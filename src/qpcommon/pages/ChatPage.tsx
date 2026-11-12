import {
  Alert,
  Badge,
  Button,
  InlineMessage,
  Spinner,
  Tooltip,
  useToast,
} from "@ui";
import { isPreview } from "../preview";
import {
  FunctionComponent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Preferences } from "../MainWindow";
import { CHEAP_MODELS } from "../completion/cheapModels";
import type { Feedback } from "../components/AnswerFeedback";
import AssistantMessageItem, {
  messageContentToString,
} from "../components/AssistantMessageItem";
import ChatInput from "../components/ChatInput";
import NewChat from "../components/NewChat";
import QuestionItem from "../components/QuestionItem";
import SettingsDialog from "../components/SettingsDialog";
import ToolPermissionPrompt from "../components/ToolPermissionPrompt";
import UsageDisplay from "../components/UsageDisplay";
import useChat from "../hooks/useChat";
import { saveChat } from "../interface/interface";
import { useJupyterConnectivity } from "../jupyter/JupyterConnectivity";
import { Chat, ChatMessage, QPTool } from "../types";
import { getStoredApiKey } from "../utils/apiKeyStorage";
import "./ChatPage.css";

// A 429 reads "Too Many Requests"; the server's own limits say "rate limit" or "limit exceeded".
const LIMIT_ERROR = /too many|rate limit|limit exceeded/i;

interface ChatPageProps {
  chatId: string;
  getTools: (chat: Chat) => Promise<QPTool[]>;
  preferences: Preferences;
}

const ChatPage: FunctionComponent<ChatPageProps> = ({
  chatId: chatIdProp,
  getTools,
  preferences,
}) => {
  const [newChatId, setNewChatId] = useState<string | undefined>(undefined);
  const chatId = newChatId !== undefined ? newChatId : chatIdProp;
  const navigate = useNavigate();
  const location = useLocation();
  const jupyterConnectivity = useJupyterConnectivity();
  const [permissionRequest, setPermissionRequest] = useState<{
    toolName: string;
    toolDescription: string;
    resolve: (granted: boolean) => void;
  } | null>(null);

  const handleRequestPermission = useCallback(
    (toolName: string, toolDescription: string): Promise<boolean> => {
      return new Promise((resolve) => {
        setPermissionRequest({ toolName, toolDescription, resolve });
      });
    },
    [],
  );

  const handleAllowPermission = useCallback(() => {
    if (permissionRequest) {
      permissionRequest.resolve(true);
      setPermissionRequest(null);
    }
  }, [permissionRequest]);

  const handleDenyPermission = useCallback(() => {
    if (permissionRequest) {
      permissionRequest.resolve(false);
      setPermissionRequest(null);
    }
  }, [permissionRequest]);

  const setChatId = useCallback((newChatId: string) => {
    setNewChatId(newChatId);
  }, []);

  const toolExecutionContext = useMemo(() => {
    return {
      jupyterConnectivity: jupyterConnectivity,
      imageUrlsNeedToBeUser: true,
      requestPermission: handleRequestPermission,
    };
  }, [jupyterConnectivity, handleRequestPermission]);
  const {
    chat,
    submitUserMessage,
    loadingChat,
    generateInitialResponse,
    responding,
    partialResponse,
    setChatModel,
    error,
    toolsForChat,
    clearChat,
    chatDispatch,
  } = useChat(chatId, setChatId, getTools, preferences, toolExecutionContext);
  const [newPrompt, setNewPrompt] = useState<string>("");
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const conversationRef = useRef<HTMLDivElement>(null);
  const toast = useToast();
  const emptyReasonId = useId();

  // make sure we never generate the initial response more than once
  const generatedInitialResponse = useRef(false);

  // Check if the current model requires an API key
  const requiresApiKey = useMemo(() => {
    if (!chat) return false;
    return !CHEAP_MODELS.includes(chat.model);
  }, [chat]);

  // Check if user has provided an API key
  const hasApiKey = useMemo(() => {
    return !!getStoredApiKey();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSettingsOpen]); // Re-check when settings dialog closes

  // Check if chat should be disabled based on last message containing trigger phrases
  const chatDisabledInfo = useMemo(() => {
    if (!chat || chat.messages.length === 0) {
      return { isDisabled: false, reason: "" };
    }

    const lastMessage = chat.messages[chat.messages.length - 1];

    // Only check assistant messages for trigger phrases
    if (lastMessage.role !== "assistant") {
      return { isDisabled: false, reason: "" };
    }

    const content = messageContentToString(lastMessage.content).toLowerCase();

    if (content.includes("#irrelevant")) {
      return {
        isDisabled: true,
        reason:
          "This chat has been disabled because the conversation became irrelevant to the intended purpose.",
      };
    }

    if (content.includes("#personal-info")) {
      return {
        isDisabled: true,
        reason:
          "This chat has been disabled because personal information was shared that should not be made public.",
      };
    }

    if (content.includes("@manipulation")) {
      return {
        isDisabled: true,
        reason:
          "This chat has been disabled due to suspected attempt to manipulate the assistant or break its guidelines.",
      };
    }

    return { isDisabled: false, reason: "" };
  }, [chat]);

  useEffect(() => {
    if (generatedInitialResponse.current) return;
    // if chat only has one message (the initial prompt) and it is from the user, generate a response
    if (
      chat &&
      chat.messages.length === 1 &&
      chat.messages[0].role === "user" &&
      !responding
    ) {
      generatedInitialResponse.current = true;
      generateInitialResponse();
    }
  }, [chat, generateInitialResponse, responding]);

  // Auto-scroll to show new user messages at the top of visible area
  useEffect(() => {
    if (conversationRef.current && chat?.messages.length) {
      const lastMessage = chat.messages[chat.messages.length - 1];
      if (lastMessage.role === "user") {
        // Find the last user message element and scroll it into view
        const messageElements =
          conversationRef.current.querySelectorAll(".message-user");
        const lastUserMessage = messageElements[messageElements.length - 1];
        if (lastUserMessage) {
          const conversationArea = conversationRef.current;
          const availableHeight = conversationArea.clientHeight;

          // Calculate top offset based on available height
          let topOffset = 0;
          if (availableHeight > 800) {
            topOffset = 200;
          } else if (availableHeight > 500) {
            topOffset = 100;
          }

          // Get the position of the last user message relative to the conversation area
          const messageRect = lastUserMessage.getBoundingClientRect();
          const conversationRect = conversationArea.getBoundingClientRect();
          const messageTop = messageRect.top - conversationRect.top;

          // Calculate the scroll position to place the message at the desired offset from top
          const targetScrollTop =
            conversationArea.scrollTop + messageTop - topOffset;

          conversationArea.scrollTo({
            top: targetScrollTop,
            behavior: "smooth",
          });
        }
      }
    }
  }, [chat?.messages]);

  const handleSubmit = useCallback(() => {
    if (newPrompt.trim() === "" || responding) return;
    submitUserMessage(newPrompt.trim());
    setNewPrompt("");
  }, [newPrompt, submitUserMessage, responding]);

  const handleSuggestedPromptClick = useCallback(
    (prompt: string) => {
      if (responding) return;
      submitUserMessage(prompt);
    },
    [submitUserMessage, responding],
  );

  const handleNewChat = useCallback(() => {
    if (chatIdProp) {
      // Viewing a saved chat at /chat/:id — switch to the fresh /chat route.
      // The path changes, so ChatPage remounts under key="new-chat".
      navigate(`/chat${location.search}`, { replace: true });
    } else {
      // Already on the /chat route (new-chat mode). When the first message
      // creates the chat, its id is kept in local state (newChatId) and the URL
      // stays /chat, so navigating here would be a no-op. Reset in place.
      clearChat();
    }
  }, [navigate, location.search, chatIdProp, clearChat]);

  const handleDownloadTranscript = useCallback(() => {
    if (!chat || chat.messages.length === 0) return;

    // Build the transcript in Markdown format
    const lines: string[] = [];
    lines.push(`# Chat Transcript`);
    lines.push(``);
    lines.push(`**Date:** ${new Date().toLocaleString()}`);
    lines.push(`**Model:** ${chat.model}`);
    lines.push(``);
    lines.push(`---`);
    lines.push(``);

    for (const message of chat.messages) {
      if (message.role === "user") {
        lines.push(`## User`);
        lines.push(``);
        const content =
          typeof message.content === "string"
            ? message.content
            : message.content
                .map((part) => (part.type === "text" ? part.text : "[Image]"))
                .join("\n");
        lines.push(content);
        lines.push(``);
      } else if (message.role === "assistant") {
        lines.push(`## Assistant`);
        lines.push(``);
        if (message.content) {
          const content =
            typeof message.content === "string"
              ? message.content
              : message.content
                  .map((part) => (part.type === "text" ? part.text : "[Image]"))
                  .join("\n");
          lines.push(content);
        }
        if (message.tool_calls && message.tool_calls.length > 0) {
          lines.push(``);
          lines.push(`**Tool calls:**`);
          for (const toolCall of message.tool_calls) {
            lines.push(`- \`${toolCall.function.name}\``);
          }
        }
        lines.push(``);
      } else if (message.role === "tool") {
        lines.push(`### Tool Result: ${message.name || "unknown"}`);
        lines.push(``);
        lines.push("```");
        // Truncate very long tool outputs
        const content =
          message.content.length > 2000
            ? message.content.substring(0, 2000) + "\n... (truncated)"
            : message.content;
        lines.push(content);
        lines.push("```");
        lines.push(``);
      }
    }

    // Add usage information
    lines.push(`---`);
    lines.push(``);
    lines.push(`**Total Usage:**`);
    lines.push(`- Prompt tokens: ${chat.totalUsage.promptTokens}`);
    lines.push(`- Completion tokens: ${chat.totalUsage.completionTokens}`);
    lines.push(
      `- Estimated cost: $${chat.totalUsage.estimatedCost.toFixed(4)}`,
    );

    const transcript = lines.join("\n");

    // Create and trigger download
    const blob = new Blob([transcript], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat-transcript-${chatId || "new"}-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.show({ status: "success", message: "Transcript downloaded" });
  }, [chat, chatId, toast]);

  const handleFeedbackUpdate = useCallback(
    (messageIndex: number, feedback: Feedback) => {
      if (chatDispatch) {
        chatDispatch({
          type: "update_message_feedback",
          messageIndex,
          feedback,
        });

        // Save to database
        if (chatId && chat) {
          // Create updated chat with the feedback
          const updatedChat = {
            ...chat,
            messages: chat.messages.map((msg, index) => {
              if (index === messageIndex && msg.role === "assistant") {
                return {
                  ...msg,
                  feedback,
                };
              }
              return msg;
            }),
          };

          saveChat(updatedChat).catch((err) => {
            console.error("Error saving feedback:", err);
          });
        }
      }
    },
    [chatDispatch, chatId, chat],
  );

  const handleDeleteMessage = useCallback(
    (messageIndex: number) => {
      if (chatDispatch) {
        chatDispatch({
          type: "delete_message_from_index",
          messageIndex,
        });

        // Save to database
        if (chatId && chat) {
          // Create updated chat with messages deleted from index
          const updatedChat = {
            ...chat,
            messages: chat.messages.slice(0, messageIndex),
          };

          saveChat(updatedChat).catch((err) => {
            console.error("Error saving deleted messages:", err);
          });
        }
      }
    },
    [chatDispatch, chatId, chat],
  );

  const allMessagesIncludingPartialResponse = useMemo(() => {
    if (!chat) return [];
    if (responding && partialResponse) {
      return [
        ...chat.messages.map((m) => ({ message: m, inProgress: false })),
        ...partialResponse.map((m) => ({ message: m, inProgress: true })),
      ];
    }
    return chat.messages.map((m) => ({ message: m, inProgress: false }));
  }, [chat, responding, partialResponse]);

  const allToolMessages = useMemo(() => {
    return allMessagesIncludingPartialResponse
      .filter((m) => m.message.role === "tool")
      .map((m) => m.message);
  }, [allMessagesIncludingPartialResponse]);

  if (!chat && loadingChat) {
    return (
      <div className="chat-container">
        <div className="loading-message">Loading chat...</div>
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="chat-container">
        <div className="error-message">{error || "Chat not found."}</div>
      </div>
    );
  }

  const isEmpty = chat.messages.length === 0;
  const emptyReason = "Available after the first message";
  const headerAction = (
    label: string,
    icon: "add" | "download",
    onClick: () => void,
  ) => {
    const button = (
      <Button
        variant="secondary"
        size="sm"
        icon={icon}
        disabled={isEmpty}
        aria-describedby={isEmpty ? emptyReasonId : undefined}
        onClick={onClick}
      >
        {label}
      </Button>
    );
    return isEmpty ? <Tooltip label={emptyReason}>{button}</Tooltip> : button;
  };

  const openSettings = () => setIsSettingsOpen(true);
  const settingsLink = (
    <button type="button" className="chat-link-button" onClick={openSettings}>
      Settings
    </button>
  );
  const needsApiKey =
    requiresApiKey && !hasApiKey && !chatDisabledInfo.isDisabled && !error;
  const jupyterMissing =
    preferences.requiresJupyter &&
    !jupyterConnectivity.jupyterServerIsAvailable;

  const newChatAction = { label: "New chat", onClick: handleNewChat };
  const transcriptState = (
    <>
      {chatDisabledInfo.isDisabled && (
        <Alert
          status="warning"
          title="This chat was stopped"
          actions={[newChatAction]}
        >
          <p>{chatDisabledInfo.reason}</p>
        </Alert>
      )}
      {error &&
        (LIMIT_ERROR.test(error) ? (
          <Alert
            status="error"
            title="Message limit reached"
            detail={error}
            actions={[newChatAction]}
          >
            <p>The chat server is taking no more messages for now.</p>
          </Alert>
        ) : (
          <Alert
            status="error"
            title="The answer stopped partway"
            detail={error}
          >
            <p>Your question is kept above.</p>
          </Alert>
        ))}
    </>
  );

  const composer = (
    <div className="chat-composer">
      <ChatInput
        label={`Ask ${preferences.assistantName}`}
        value={newPrompt}
        onChange={setNewPrompt}
        onSubmit={handleSubmit}
        working={responding}
        disabled={
          chatDisabledInfo.isDisabled ||
          !!error ||
          (requiresApiKey && !hasApiKey)
        }
      />
      <div className="chat-notice">
        {needsApiKey && (
          <InlineMessage status="warning">
            This model needs an OpenRouter API key. Add one in {settingsLink}.
          </InlineMessage>
        )}
        {jupyterMissing && (
          <InlineMessage status="warning">
            Python isn’t connected, so code can’t run yet. Connect a Jupyter
            server in {settingsLink}.
          </InlineMessage>
        )}
        {isPreview && (
          <InlineMessage status="warning">
            This is a design preview. Sending a message won’t work here yet,
            because the chat server doesn’t accept requests from this address.
          </InlineMessage>
        )}
        <InlineMessage status="info">
          Conversations are saved to help develop {preferences.assistantName}.
          Don’t share personal or sensitive information.
        </InlineMessage>
      </div>
    </div>
  );

  return (
    <div className="chat-page">
      <div className="chat-container">
        <div className="chat-title-row">
          <div className="chat-title">
            <h1 className="chat-title-text">
              {preferences.logo && (
                <img
                  className="chat-title-logo"
                  src={`${import.meta.env.BASE_URL}${preferences.logo}`}
                  alt=""
                />
              )}
              {preferences.assistantName}
            </h1>
            <Badge status="neutral">Experimental</Badge>
          </div>
          <div className="chat-title-actions">
            {preferences.backLink && (
              <Button
                variant="ghost"
                size="sm"
                icon="chevron--left"
                href={preferences.backLink.href}
              >
                {preferences.backLink.label}
              </Button>
            )}
            {headerAction("New chat", "add", handleNewChat)}
            {headerAction("Download", "download", handleDownloadTranscript)}
            <Button
              variant="ghost"
              size="sm"
              icon="logo--github"
              href="https://github.com/magland/qp"
              target="_blank"
              rel="noopener noreferrer"
            >
              Source on GitHub
            </Button>
            {isEmpty && (
              <span id={emptyReasonId} className="ns-visually-hidden">
                {emptyReason}
              </span>
            )}
          </div>
        </div>

        {isEmpty ? (
          <main className="chat-main chat-main--new">
            <NewChat
              title={
                preferences.emptyStateTitle ??
                `Ask ${preferences.assistantName}`
              }
              lead={
                preferences.emptyStateLead ?? preferences.assistantDisplayInfo
              }
              prompts={preferences.suggestedPrompts}
              onPrompt={handleSuggestedPromptClick}
            >
              {composer}
            </NewChat>
          </main>
        ) : (
          <main className="chat-main">
            <div className="conversation-area" ref={conversationRef}>
              {allMessagesIncludingPartialResponse.map((xx, index) => (
                <MessageItem
                  key={index}
                  message={xx.message}
                  allToolMessages={allToolMessages}
                  tools={toolsForChat}
                  inProgress={xx.inProgress}
                  chatId={chatId}
                  messageIndex={index}
                  onFeedbackUpdate={handleFeedbackUpdate}
                  onDeleteMessage={handleDeleteMessage}
                />
              ))}

              {permissionRequest && (
                <ToolPermissionPrompt
                  assistantName={preferences.assistantName}
                  toolName={permissionRequest.toolName}
                  // Tools that run code are named execute_python_code and so on.
                  isScript={permissionRequest.toolName.startsWith("execute_")}
                  onAllow={handleAllowPermission}
                  onDeny={handleDenyPermission}
                />
              )}

              {responding && !partialResponse && (
                <p className="chat-working" role="status">
                  <Spinner />
                  Working…
                </p>
              )}

              {transcriptState}

              {/* Empty space at the bottom so the last message can scroll to the top. */}
              <div className="chat-transcript-end" />
            </div>
            {composer}
          </main>
        )}

        <footer className="chat-footer">
          <UsageDisplay
            model={chat.model}
            setModel={setChatModel}
            totalUsage={chat.totalUsage}
          />
          <Button
            variant="ghost"
            size="sm"
            icon="settings"
            onClick={openSettings}
          >
            Settings
          </Button>
        </footer>
      </div>

      <SettingsDialog
        preferences={preferences}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};

const MessageItem: FunctionComponent<{
  message: ChatMessage;
  allToolMessages: ChatMessage[];
  tools: QPTool[];
  inProgress: boolean;
  chatId?: string;
  messageIndex: number;
  onFeedbackUpdate: (messageIndex: number, feedback: Feedback) => void;
  onDeleteMessage: (messageIndex: number) => void;
}> = ({
  message,
  allToolMessages,
  tools,
  inProgress,
  chatId,
  messageIndex,
  onFeedbackUpdate,
  onDeleteMessage,
}) => {
  if (message.role === "user") {
    return (
      <QuestionItem
        content={message.content}
        onDelete={() => onDeleteMessage(messageIndex)}
      />
    );
  }
  if (message.role === "assistant") {
    return (
      <AssistantMessageItem
        message={message}
        allToolMessages={allToolMessages}
        tools={tools}
        inProgress={inProgress}
        chatId={chatId}
        onFeedbackUpdate={(feedback) =>
          onFeedbackUpdate(messageIndex, feedback)
        }
      />
    );
  }
  return null;
};

export default ChatPage;
