import { useState } from 'react';
import { ApiService } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';
import './SolicitarReactivacionModal.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  ci: string;
  password: string;
  tieneSolicitudPendiente?: boolean;
  tieneSolicitudAprobada?: boolean;
  tieneSolicitudRechazada?: boolean;
}

export function SolicitarReactivacionModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  ci, 
  password,
  tieneSolicitudPendiente = false,
  tieneSolicitudAprobada = false,
  tieneSolicitudRechazada = false,
}: Props) {
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await ApiService.solicitarReactivacion(ci, password, motivo.trim() || undefined);
      showToast('Solicitud de reactivación enviada exitosamente. Un administrador revisará su solicitud.', 'success');
      onSuccess();
      onClose();
    } catch (error: any) {
      showToast(error.message || 'Error al enviar solicitud', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (tieneSolicitudPendiente) {
    return (
      <div className="modal-overlay solicitar-reactivacion-overlay">
        <div className="solicitar-reactivacion-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-icon">
              <FaExclamationTriangle className="icon-warning" />
            </div>
            <h2>Solicitud Pendiente</h2>
          </div>
          <div className="modal-body">
            <p>
              Ya existe una solicitud de reactivación pendiente. Un administrador revisará su solicitud y le notificará cuando sea procesada.
            </p>
            <p className="info-text">
              Por favor, espere a que su solicitud sea revisada. Recibirá una notificación cuando haya una respuesta.
            </p>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-primary" onClick={onClose}>
              Entendido
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (tieneSolicitudAprobada) {
    return (
      <div className="modal-overlay solicitar-reactivacion-overlay">
        <div className="solicitar-reactivacion-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-icon">
              <FaCheckCircle className="icon-success" />
            </div>
            <h2>Solicitud Aprobada</h2>
          </div>
          <div className="modal-body">
            <p>
              Su solicitud de reactivación ha sido aprobada. Su cuenta debería estar activa ahora.
            </p>
            <p className="info-text">
              Por favor, intente iniciar sesión nuevamente. Si el problema persiste, contacte al administrador.
            </p>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-primary" onClick={onClose}>
              Entendido
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (tieneSolicitudRechazada) {
    return (
      <div className="modal-overlay solicitar-reactivacion-overlay">
        <div className="solicitar-reactivacion-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-icon">
              <FaExclamationTriangle className="icon-error" />
            </div>
            <h2>Solicitud Rechazada</h2>
          </div>
          <div className="modal-body">
            <p>
              Su solicitud de reactivación fue rechazada. Solo se permite una solicitud de reactivación por usuario.
            </p>
            <p className="warning-text">
              ⚠️ No puede realizar otra solicitud de reactivación. Por favor, contacte directamente al administrador del sistema.
            </p>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-primary" onClick={onClose}>
              Entendido
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay solicitar-reactivacion-overlay">
      <div className="solicitar-reactivacion-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-icon">
            <FaExclamationTriangle className="icon-warning" />
          </div>
          <h2>Solicitar Reactivación de Cuenta</h2>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <p className="info-text">
            Su cuenta está inactiva. Puede solicitar la reactivación de su cuenta. Un administrador revisará su solicitud.
          </p>
          <p className="warning-text">
            ⚠️ Solo puede tener una solicitud de reactivación pendiente a la vez. Si su solicitud es rechazada, podrá solicitar nuevamente.
          </p>

          <div className="form-group">
            <label htmlFor="motivo">
              Motivo de la Solicitud <small>(Opcional)</small>
            </label>
            <textarea
              id="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Explique brevemente por qué necesita que su cuenta sea reactivada..."
              rows={4}
              disabled={loading}
              maxLength={500}
            />
            <small className="form-hint">
              {motivo.length}/500 caracteres
            </small>
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
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Enviando...' : 'Enviar Solicitud'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

