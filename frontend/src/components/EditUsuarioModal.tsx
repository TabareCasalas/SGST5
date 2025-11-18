import { EditUsuarioForm } from './EditUsuarioForm';
import './CreateUsuarioModal.css';

interface Usuario {
  id_usuario: number;
  nombre: string;
  ci: string;
  domicilio?: string;
  telefono?: string;
  correo: string;
  rol: string;
  nivel_acceso?: number;
  activo: boolean;
  semestre?: string;
  fecha_desactivacion_automatica?: string;
}

interface Props {
  isOpen: boolean;
  usuario: Usuario | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function EditUsuarioModal({ isOpen, usuario, onClose, onSuccess }: Props) {
  if (!isOpen || !usuario) return null;

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
          <h2>Editar Usuario</h2>
          <button className="close-btn" onClick={onClose} title="Cerrar">
            ×
          </button>
        </div>
        <div className="modal-content">
          <EditUsuarioForm usuario={usuario} onSuccess={handleSuccess} onCancel={onClose} />
        </div>
      </div>
    </div>
  );
}

