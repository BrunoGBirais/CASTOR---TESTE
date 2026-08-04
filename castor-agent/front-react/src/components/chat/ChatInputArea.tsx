import { QuickChips } from "./QuickChips";

export const ChatInputArea = () => (
  <div id="inputArea">
    <div className="status-info" id="statusMessage" />
    <QuickChips />
    <form id="inputForm">
      <input type="file" id="fileInput" style={{ display: "none" }} />
      <textarea id="messageInput" placeholder="Digite sua mensagem..." rows={1} />
      <div className="controls">
        <button
          type="button"
          className="action-btn btn-attach"
          id="attachBtn"
          title="Anexar arquivo"
        >
          <i data-lucide="paperclip" />
        </button>

        <button
          type="submit"
          className="action-btn btn-send"
          id="sendBtn"
          title="Enviar"
        >
          <i data-lucide="send" />
        </button>
      </div>
    </form>
  </div>
);
