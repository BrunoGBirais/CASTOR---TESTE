/** Confirmação de exclusão de conversa (texto sobrescrito por showConfirmModal). */
export const ConfirmModal = () => (
  <div className="confirm-modal-backdrop" id="confirmModal">
    <div className="confirm-modal">
      <h3 className="confirm-title">Excluir conversa</h3>
      <p className="confirm-text">
        Tem certeza que deseja excluir esta conversa permanentemente? Esta ação
        não pode ser desfeita.
      </p>
      <div className="confirm-actions">
        <button className="btn-modal btn-cancel" id="cancelDeleteBtn">
          Cancelar
        </button>
        <button className="btn-modal btn-confirm" id="confirmDeleteBtn">
          Excluir
        </button>
      </div>
    </div>
  </div>
);
