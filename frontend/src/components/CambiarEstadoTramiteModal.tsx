import { useState, useEffect } from 'react';
import type { JSX } from 'react';
import { FaTimes, FaCheckCircle, FaClock, FaSync, FaBan } from 'react-icons/fa';
import { ApiService } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import './CambiarEstadoTramiteModal.css';

interface CambiarEstadoTramiteModalProps {
  tramite: {
    id_tramite: number;
    estado: string;
    num_carpeta: number;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export function CambiarEstadoTramiteModal({ tramite, onClose, onSuccess }: CambiarEstadoTramiteModalProps) {
  const [nuevoEstado, setNuevoEstado] = useState<string>(tramite.estado);
  const [motivo, setMotivo] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  // Normalizar estado: "iniciado" es equivalente a "en_tramite"
  const estadoNormalizado = tramite.estado === 'iniciado' ? 'en_tramite' : tramite.estado;

  // Definir transiciones permitidas según el estado actual
  const getEstadosPermitidos = (estadoActual: string): string[] => {
    // Normalizar "iniciado" a "en_tramite"
    const estado = estadoActual === 'iniciado' ? 'en_tramite' : estadoActual;
    const transiciones: { [key: string]: string[] } = {
      'pendiente': ['en_tramite', 'desistido'],
      'en_tramite': ['finalizado', 'pendiente', 'desistido'],
      'finalizado': ['en_tramite', 'desistido'],
      'desistido': ['en_tramite'],
    };
    return transiciones[estado] || [];
  };

  const estadosPermitidos = getEstadosPermitidos(tramite.estado);

  const getEstadoInfo = (estado: string) => {
    // Normalizar "iniciado" a "en_tramite"
    const estadoNormalizado = estado === 'iniciado' ? 'en_tramite' : estado;
    const info: { [key: string]: { label: string; icon: JSX.Element; descripcion: string } } = {
      'pendiente': {
        label: 'Pendiente',
        icon: <FaClock />,
        descripcion: 'Falta información que debe presentar el consultante'
      },
      'en_tramite': {
        label: 'En Trámite',
        icon: <FaSync />,
        descripcion: 'Los alumnos están trabajando activamente'
      },
      'iniciado': {
        label: 'En Trámite',
        icon: <FaSync />,
        descripcion: 'Los alumnos están trabajando activamente'
      },
      'finalizado': {
        label: 'Finalizado',
        icon: <FaCheckCircle />,
        descripcion: 'Se cumplió el objetivo del trámite'
      },
      'desistido': {
        label: 'Desistido',
        icon: <FaBan />,
        descripcion: 'El consultante no sigue con el trámite'
      },
    };
    return info[estadoNormalizado] || info[estado] || { label: estado, icon: <FaClock />, descripcion: '' };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Normalizar estados para comparación
    const estadoActualNormalizado = tramite.estado === 'iniciado' ? 'en_tramite' : tramite.estado;
    
    if (nuevoEstado === estadoActualNormalizado || nuevoEstado === tramite.estado) {
      showToast('El estado no ha cambiado', 'info');
      return;
    }

    if (!estadosPermitidos.includes(nuevoEstado)) {
      showToast('Transición de estado no permitida', 'error');
      return;
    }

    // Validar motivo para ciertos cambios
    if ((nuevoEstado === 'desistido' || nuevoEstado === 'pendiente') && !motivo.trim()) {
      showToast('Debe proporcionar un motivo para este cambio de estado', 'error');
      return;
    }

    setLoading(true);
    try {
      const updateData: any = { estado: nuevoEstado };
      if (motivo.trim()) {
        updateData.motivo_cierre = motivo.trim();
      }
      
      await ApiService.updateTramite(tramite.id_tramite, updateData);
      showToast(`Estado cambiado a "${getEstadoInfo(nuevoEstado).label}" exitosamente`, 'success');
      onSuccess();
      onClose();
    } catch (error: any) {
      showToast(`Error al cambiar estado: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content cambiar-estado-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Cambiar Estado del Trámite</h3>
          <button className="modal-close-btn" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="modal-body">
          <div className="estado-actual">
            <strong>Estado Actual:</strong>
            <span className={`estado-badge estado-${estadoNormalizado}`}>
              {getEstadoInfo(tramite.estado).icon}
              {getEstadoInfo(tramite.estado).label}
            </span>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="nuevoEstado">Nuevo Estado:</label>
              <select
                id="nuevoEstado"
                value={nuevoEstado}
                onChange={(e) => setNuevoEstado(e.target.value)}
                className="form-select"
                required
              >
                <option value={estadoNormalizado}>Mantener: {getEstadoInfo(tramite.estado).label}</option>
                {estadosPermitidos.map((estado) => {
                  const info = getEstadoInfo(estado);
                  return (
                    <option key={estado} value={estado}>
                      {info.label}
                    </option>
                  );
                })}
              </select>
              {nuevoEstado !== estadoNormalizado && nuevoEstado !== tramite.estado && (
                <small className="form-hint">
                  {getEstadoInfo(nuevoEstado).descripcion}
                </small>
              )}
            </div>

            {(nuevoEstado === 'desistido' || nuevoEstado === 'pendiente') && (
              <div className="form-group">
                <label htmlFor="motivo">
                  Motivo {nuevoEstado === 'desistido' ? 'del Desistimiento' : 'de la Pendencia'}:
                  <span className="required-asterisk">*</span>
                </label>
                <textarea
                  id="motivo"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  className="form-textarea"
                  rows={4}
                  placeholder={`Ingrese el motivo ${nuevoEstado === 'desistido' ? 'del desistimiento' : 'por el cual falta información'}...`}
                  required
                />
              </div>
            )}

            <div className="modal-actions">
              <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary" disabled={loading || (nuevoEstado === estadoNormalizado && nuevoEstado === tramite.estado)}>
                {loading ? 'Cambiando...' : 'Cambiar Estado'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

