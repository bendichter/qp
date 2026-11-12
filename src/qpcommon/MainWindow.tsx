/* eslint-disable @typescript-eslint/no-explicit-any */
import { FunctionComponent, useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import ChatPage from "./pages/ChatPage";
import ChatsListPage from "./pages/ChatsListPage";
import { Chat } from "./types";
import { QPTool } from "./types";
import { JupyterConnectivityProvider } from "./jupyter/JupyterConnectivityProvider";

type MainWindowProps = {
  getTools: (chat: Chat) => Promise<QPTool[]>;
  preferences: Preferences;
};

export type Preferences = {
  assistantName: string;
  getAssistantSystemPrompt: () => Promise<string>;
  assistantDisplayInfo: any;
  /** The new chat's title; "Ask {assistantName}" when unset. */
  emptyStateTitle?: string;
  /** One line under the new chat's title. */
  emptyStateLead?: string;
  /** An image in public/ shown before the assistant's name. */
  logo?: string;
  /** A link back to the app that opened this assistant, first in the top bar. */
  backLink?: { label: string; href: string };
  suggestedPrompts: string[];
  requiresJupyter: boolean;
};

const MainWindow: FunctionComponent<MainWindowProps> = ({
  getTools,
  preferences,
}) => {
  const [windowDimensions, setWindowDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  useEffect(() => {
    const handleResize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const location = useLocation();
  const chatId = location.pathname.startsWith("/chat/")
    ? location.pathname.replace("/chat/", "")
    : location.pathname === "/chat"
      ? ""
      : null;

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/chat" />} />
      <Route
        path="/chats"
        element={
          <ChatsListPage
            width={windowDimensions.width}
            height={windowDimensions.height}
          />
        }
      />
      <Route
        path="/chat"
        element={
          <JupyterConnectivityProvider
            mode="jupyter-server"
            disabled={!preferences.requiresJupyter}
          >
            <ChatPage
              key="new-chat" // Force remount when switching to new chat
              chatId=""
              getTools={getTools}
              preferences={preferences}
            />
          </JupyterConnectivityProvider>
        }
      />
      <Route
        path="/chat/:chatId"
        element={
          <JupyterConnectivityProvider
            mode="jupyter-server"
            disabled={!preferences.requiresJupyter}
          >
            <ChatPage
              key={chatId} // Force remount when switching chats
              chatId={chatId || ""}
              getTools={getTools}
              preferences={preferences}
            />
          </JupyterConnectivityProvider>
        }
      />
      <Route path="*" element={<Navigate to="/chat" />} />
    </Routes>
  );
};

export default MainWindow;
