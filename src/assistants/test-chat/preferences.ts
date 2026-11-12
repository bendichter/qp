import { Preferences } from "../../qpcommon/MainWindow";
import testChatAssistantDescription from "./testChatSystemPrompt";

const suggestedPrompts = [
  "Execute a simple Python script that prints 'Hello, World!'.",
];

const preferences: Preferences = {
  assistantName: "Test Chat",
  getAssistantSystemPrompt: async () => testChatAssistantDescription,
  assistantDisplayInfo: "Assistant for testing qp.",
  suggestedPrompts,
  requiresJupyter: true,
};

export default preferences;
