import { ChatEmptyState } from "../components/chat/ChatEmptyState";
import { ChatInputArea } from "../components/chat/ChatInputArea";

export const ChatPage = () => (
  <main id="chatArea">
    {/* Mensagens renderizadas pelo runtime legado (renderMessage). */}
    <div id="messagesContainer" />

    <ChatEmptyState />

    <div className="loading" id="loading">
      <div className="loading-dots">
        <span />
        <span />
        <span />
      </div>
    </div>

    <ChatInputArea />
  </main>
);
