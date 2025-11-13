import { CreateGrupoForm } from './CreateGrupoForm';
import './CreateGrupoModal.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateGrupoModal({ isOpen, onClose, onSuccess }: Props) {
  if (!isOpen) return null;

  const handleSuccess = () => {
    if (onSuccess) {
      onSuccess();
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="create-grupo-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Crear Nuevo Grupo</h2>
          <button className="close-btn" onClick={onClose} title="Cerrar">
            ×
          </button>
        </div>
        <div className="modal-content">
          <CreateGrupoForm onSuccess={handleSuccess} />
        </div>
      </div>
    </div>
  );
}

