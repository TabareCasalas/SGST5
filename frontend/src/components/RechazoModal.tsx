import { useState } from 'react';
import './RechazoModal.css';

interface RechazoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (razon: string) => void;
}

export function RechazoModal({ isOpen, onClose, onConfirm }: RechazoModalProps) {
  const [razon, setRazon] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (razon.trim()) {
      onConfirm(razon.trim());
      setRazon('');
    }
  };

  const handleClose = () => {
    setRazon('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content rechazo-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Rechazar Trámite</h2>
          <button className="modal-close" onClick={handleClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label htmlFor="razon-rechazo">
              Razón del rechazo <span className="required">*</span>
            </label>
            <textarea
              id="razon-rechazo"
              value={razon}
              onChange={(e) => setRazon(e.target.value)}
              placeholder="Ingrese la razón del rechazo..."
              rows={5}
              required
              autoFocus
            />
            <small className="form-help">
              Por favor, proporcione una razón detallada para el rechazo del trámite.
            </small>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={handleClose} className="btn-secondary">
              Cancelar
            </button>
            <button 
              type="submit" 
              className="btn-danger"
              disabled={!razon.trim()}
            >
              Confirmar Rechazo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}






