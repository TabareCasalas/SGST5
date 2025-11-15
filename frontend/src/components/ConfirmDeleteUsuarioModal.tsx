import { FaExclamationTriangle, FaTrash } from 'react-icons/fa';
import './ConfirmDeleteUsuarioModal.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  usuario: {
    nombre: string;
    ci: string;
  } | null;
  loading?: boolean;
}

export function ConfirmDeleteUsuarioModal({ isOpen, onClose, onConfirm, usuario, loading = false }: Props) {
  if (!isOpen || !usuario) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="confirm-delete-usuario-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-icon">
            <FaExclamationTriangle className="icon-delete" />
          </div>
          <h2>Eliminar Usuario</h2>
        </div>
        <div className="modal-body">
          <p className="confirm-message">
            ¿Está seguro de que desea <strong>eliminar</strong> permanentemente al usuario?
          </p>
          <div className="usuario-info">
            <div className="info-row">
              <span className="info-label">Nombre:</span>
              <span className="info-value">{usuario.nombre}</span>
            </div>
            <div className="info-row">
              <span className="info-label">CI:</span>
              <span className="info-value">{usuario.ci}</span>
            </div>
          </div>
          <div className="danger-box">
            <FaExclamationTriangle className="danger-icon" />
            <div>
              <p className="danger-title">⚠️ Esta acción no se puede deshacer</p>
              <p className="danger-text">
                El usuario será eliminado permanentemente del sistema. Todos los datos asociados 
                (excepto trámites y fichas activas) serán eliminados.
              </p>
            </div>
          </div>
        </div>
        <div className="modal-actions">
          <button
            type="button"
            className="btn-cancel"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn-confirm-delete"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              'Eliminando...'
            ) : (
              <>
                <FaTrash /> Eliminar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}


