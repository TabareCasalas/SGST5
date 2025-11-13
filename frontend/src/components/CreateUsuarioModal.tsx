import { CreateUsuarioForm } from './CreateUsuarioForm';
import './CreateUsuarioModal.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateUsuarioModal({ isOpen, onClose, onSuccess }: Props) {
  if (!isOpen) return null;

  const handleSuccess = () => {
    if (onSuccess) {
      onSuccess();
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="create-usuario-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Crear Nuevo Usuario</h2>
          <button className="close-btn" onClick={onClose} title="Cerrar">
            ×
          </button>
        </div>
        <div className="modal-content">
          <CreateUsuarioForm onSuccess={handleSuccess} />
        </div>
      </div>
    </div>
  );
}

