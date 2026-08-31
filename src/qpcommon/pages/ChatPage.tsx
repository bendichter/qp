import { Box } from "@mui/material";
import {
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Preferences } from "../MainWindow";
import { CHEAP_MODELS } from "../completion/cheapModels";
import AssistantMessageItem, {
  messageContentToString,
} from "../components/AssistantMessageItem";
import ChatInput from "../components/ChatInput";
import MarkdownContent from "../components/MarkdownContent";
import SettingsDialog from "../components/SettingsDialog";
import ToolPermissionPrompt from "../components/ToolPermissionPrompt";
import UsageDisplay from "../components/UsageDisplay";
import useChat from "../hooks/useChat";
import { saveChat } from "../interface/interface";
import { useJupyterConnectivity } from "../jupyter/JupyterConnectivity";
import { Chat, ChatMessage, QPTool } from "../types";
import { getStoredApiKey } from "../utils/apiKeyStorage";

interface ChatPageProps {
  width: number;
  height: number;
  chatId: string;
  getTools: (chat: Chat) => Promise<QPTool[]>;
  preferences: Preferences;
}

const ChatPage: FunctionComponent<ChatPageProps> = ({
  chatId: chatIdProp,
  width,
  height,
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
    chatDispatch
  } = useChat(
    chatId,
    setChatId,
    getTools,
    preferences,
    toolExecutionContext,
  );
  const [newPrompt, setNewPrompt] = useState<string>("");
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const conversationRef = useRef<HTMLDivElement>(null);

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
        const content = typeof message.content === "string"
          ? message.content
          : message.content.map(part => part.type === "text" ? part.text : "[Image]").join("\n");
        lines.push(content);
        lines.push(``);
      } else if (message.role === "assistant") {
        lines.push(`## Assistant`);
        lines.push(``);
        if (message.content) {
          const content = typeof message.content === "string"
            ? message.content
            : message.content.map(part => part.type === "text" ? part.text : "[Image]").join("\n");
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
        const content = message.content.length > 2000
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
    lines.push(`- Estimated cost: $${chat.totalUsage.estimatedCost.toFixed(4)}`);

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
  }, [chat, chatId]);

  const handleFeedbackUpdate = useCallback(
    (
      messageIndex: number,
      feedback: { thumbs?: "up" | "down"; comment?: string },
    ) => {
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

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: width,
        height: height,
      }}
    >
      <div className="chat-container">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            margin: "8px 20px",
          }}
        >
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={handleNewChat}
              className="new-chat-button"
              disabled={chat.messages.length === 0}
              style={{
                padding: "0.4rem 1rem",
                fontSize: "0.875rem",
                borderRadius: "6px",
                flexShrink: 0,
                opacity: chat.messages.length === 0 ? 0.5 : 1,
                cursor:
                  chat.messages.length === 0
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              + New Chat
            </button>
            <button
              onClick={handleDownloadTranscript}
              className="new-chat-button"
              disabled={chat.messages.length === 0}
              style={{
                padding: "0.4rem 1rem",
                fontSize: "0.875rem",
                borderRadius: "6px",
                flexShrink: 0,
                opacity: chat.messages.length === 0 ? 0.5 : 1,
                cursor:
                  chat.messages.length === 0
                    ? "not-allowed"
                    : "pointer",
              }}
              title="Download chat transcript as Markdown"
            >
              ⬇️ Download
            </button>
          </div>
          <a
            href="https://github.com/magland/qp"
            target="_blank"
            rel="noopener noreferrer"
            title="View source code and report issues"
            style={{
              display: "flex",
              alignItems: "center",
              padding: "4px",
              opacity: 0.6,
              transition: "opacity 0.2s",
              textDecoration: "none",
              color: "inherit",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.6")}
          >
            <svg
              height="24"
              width="24"
              viewBox="0 0 16 16"
              fill="currentColor"
              style={{ display: "block" }}
            >
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
          </a>
        </div>

        <div className="conversation-area" ref={conversationRef}>
          <div
            style={{
              padding: "12px",
              margin: "10px 20px",
              backgroundColor: "#e0f7fa",
              border: "2px solid #4dd0e1",
              borderRadius: "4px",
              color: "#006064",
              fontWeight: "bold",
              textAlign: "center",
            }}
          >
            This conversation is saved for internal development purposes. Do not share personal or sensitive information.
          </div>
          {preferences.requiresJupyter && (
            <div
              style={{
                padding: "8px 12px",
                margin: "10px 20px",
                backgroundColor: jupyterConnectivity.jupyterServerIsAvailable
                  ? "#f0f9f4"
                  : "#fff4e5",
                border: jupyterConnectivity.jupyterServerIsAvailable
                  ? "1px solid #c6e8d5"
                  : "1px solid #ffe0b2",
                borderRadius: "4px",
                color: jupyterConnectivity.jupyterServerIsAvailable
                  ? "#2d5f3f"
                  : "#663c00",
                fontSize: "0.85rem",
                textAlign: "center",
              }}
            >
              {jupyterConnectivity.jupyterServerIsAvailable ? (
                <>Jupyter server connected</>
              ) : (
                <>
                  Jupyter server not connected. You can still chat with the
                  assistant, but Python code execution will not be available
                  until a connection is established. Use the ⚙️ settings button
                  below to configure.
                </>
              )}
            </div>
          )}
          {
            <span
              style={{
                display: "block",
                textAlign: "center",
                margin: "10px 20px",
                color: "#666",
                fontSize: "0.9rem",
              }}
            >
              {preferences.assistantDisplayInfo}
            </span>
          }
          {chat.messages.length === 0 &&
          preferences.suggestedPrompts.length > 0 ? (
            <div className="suggested-prompts-container">
              <h3 className="suggested-prompts-title">Suggested prompts:</h3>
              <div className="suggested-prompts-grid">
                {preferences.suggestedPrompts.map((prompt, index) => (
                  <button
                    key={index}
                    className="suggested-prompt-button"
                    onClick={() => handleSuggestedPromptClick(prompt)}
                    disabled={responding}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
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
                  toolName={permissionRequest.toolName}
                  onAllow={handleAllowPermission}
                  onDeny={handleDenyPermission}
                />
              )}

              {responding && !partialResponse && (
                <div className="message message-assistant">
                  <div className="partial-response">Thinking...</div>
                </div>
              )}
            </>
          )}
        </div>

        {error && (
          <div
            style={{
              padding: "12px",
              margin: "10px 20px",
              backgroundColor: "#fee",
              border: "2px solid #c00",
              borderRadius: "4px",
              color: "#c00",
              fontWeight: "bold",
              textAlign: "center",
            }}
          >
            ⚠️ Error: {error}
          </div>
        )}

        {chatDisabledInfo.isDisabled && (
          <div
            style={{
              padding: "12px",
              margin: "10px 20px",
              backgroundColor: "#fee",
              border: "2px solid #c00",
              borderRadius: "4px",
              color: "#c00",
              fontWeight: "bold",
              textAlign: "center",
            }}
          >
            ⚠️ {chatDisabledInfo.reason}
          </div>
        )}

        {requiresApiKey &&
          !hasApiKey &&
          !chatDisabledInfo.isDisabled &&
          !error && (
            <div
              style={{
                padding: "12px",
                margin: "10px 20px",
                backgroundColor: "#fff3cd",
                border: "2px solid #ffc107",
                borderRadius: "4px",
                color: "#856404",
                fontWeight: "bold",
                textAlign: "center",
              }}
            >
              ⚠️ This model requires an OpenRouter API key. Click the ⚙️
              settings button below to add your key or select a less expensive
              model.
            </div>
          )}

        <ChatInput
          value={newPrompt}
          onChange={setNewPrompt}
          onSubmit={handleSubmit}
          disabled={
            responding ||
            chatDisabledInfo.isDisabled ||
            !!error ||
            (requiresApiKey && !hasApiKey)
          }
        />

        <div
          style={{
            padding: "0px 0px",
            backgroundColor: "#f5f5f5",
            borderTop: "1px solid #ddd",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
            fontSize: "0.8rem",
          }}
        >
          <UsageDisplay
            model={chat.model}
            setModel={setChatModel}
            totalUsage={chat.totalUsage}
          />

          <button
            onClick={() => setIsSettingsOpen(true)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "1.4rem",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              opacity: 0.7,
              transition: "opacity 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.7")}
            title="Settings"
          >
            ⚙️
          </button>
        </div>
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
  onFeedbackUpdate: (
    messageIndex: number,
    feedback: { thumbs?: "up" | "down"; comment?: string },
  ) => void;
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
  const [isHovered, setIsHovered] = useState(false);

  if (message.role === "user") {
    return (
      <div
        className="message message-user"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ position: "relative" }}
      >
        <div className="message-bubble message-bubble-user">
          {typeof message.content === "string" ? (
            messageContentToString(message.content)
          ) : Array.isArray(message.content) ? (
            // Handle array of content parts (e.g. text + images)
            message.content.map((part, index) => {
              if (part.type === "text") {
                return (
                  <MarkdownContent
                    key={index}
                    content={part.text}
                    // onSpecialLinkClicked={onSpecialLinkClicked}
                  />
                );
              }
              if (part.type === "image_url") {
                return (
                  <Box key={index} sx={{ mt: 1 }}>
                    <img
                      src={part.image_url.url}
                      alt="Content"
                      style={{ borderRadius: 4 }}
                    />
                  </Box>
                );
              }
              return null;
            })
          ) : (
            <>Unsupported message format</>
          )}
        </div>
        {isHovered && typeof message.content === "string" && (
          <button
            onClick={() => onDeleteMessage(messageIndex)}
            style={{
              position: "absolute",
              top: "8px",
              right: "8px",
              background: "rgba(255, 255, 255, 0.7)",
              border: "1px solid rgba(0, 0, 0, 0.1)",
              borderRadius: "4px",
              padding: "2px 6px",
              cursor: "pointer",
              fontSize: "0.75rem",
              color: "#999",
              display: "flex",
              alignItems: "center",
              gap: "3px",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              transition: "all 0.2s",
              opacity: 0.6,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "1";
              e.currentTarget.style.background = "#fee";
              e.currentTarget.style.borderColor = "#c00";
              e.currentTarget.style.color = "#c00";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "0.6";
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.7)";
              e.currentTarget.style.borderColor = "rgba(0, 0, 0, 0.1)";
              e.currentTarget.style.color = "#999";
            }}
            title="Delete this message and all messages after it"
          >
            🗑️
          </button>
        )}
      </div>
    );
  } else if (message.role === "assistant") {
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
  } else {
    return null;
  }
};

export default ChatPage;
