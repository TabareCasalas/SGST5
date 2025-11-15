import { FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';
import './ConfirmUsuarioModal.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  usuario: {
    nombre: string;
    ci: string;
  } | null;
  accion: 'activar' | 'desactivar';
  loading?: boolean;
}

export function ConfirmUsuarioModal({ isOpen, onClose, onConfirm, usuario, accion, loading = false }: Props) {
  if (!isOpen || !usuario) return null;

  const esActivar = accion === 'activar';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="confirm-usuario-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-icon">
            {esActivar ? (
              <FaCheckCircle className="icon-activate" />
            ) : (
              <FaExclamationTriangle className="icon-deactivate" />
            )}
          </div>
          <h2>
            {esActivar ? 'Activar Usuario' : 'Desactivar Usuario'}
          </h2>
        </div>
        <div className="modal-body">
          <p className="confirm-message">
            ¿Está seguro de que desea <strong>{esActivar ? 'activar' : 'desactivar'}</strong> al usuario?
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
          {!esActivar && (
            <div className="warning-box">
              <FaExclamationTriangle className="warning-icon" />
              <p>
                El usuario será desactivado inmediatamente y no podrá iniciar sesión hasta que sea reactivado.
              </p>
            </div>
          )}
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
            className={esActivar ? 'btn-confirm-activate' : 'btn-confirm-deactivate'}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Procesando...' : esActivar ? 'Activar' : 'Desactivar'}
          </button>
        </div>
      </div>
    </div>
  );
}

