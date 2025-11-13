import { CreateFichaForm } from './CreateFichaForm';
import './CreateFichaModal.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateFichaModal({ isOpen, onClose, onSuccess }: Props) {
  if (!isOpen) return null;

  const handleSuccess = () => {
    if (onSuccess) {
      onSuccess();
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="create-ficha-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Crear Nueva Ficha</h2>
          <button className="close-btn" onClick={onClose} title="Cerrar">
            ×
          </button>
        </div>
        <div className="modal-content">
          <CreateFichaForm onSuccess={handleSuccess} />
        </div>
      </div>
    </div>
  );
}


