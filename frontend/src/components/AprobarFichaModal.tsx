import { useState, useEffect } from 'react';
import { ApiService } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import './AprobarFichaModal.css';

interface Ficha {
  id_ficha: number;
  numero_consulta: string;
  consultante: {
    usuario: {
      nombre: string;
      ci: string;
    };
  };
  tema_consulta: string;
}

interface Props {
  ficha: Ficha | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AprobarFichaModal({ ficha, isOpen, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    fecha_cita: '',
    hora_cita: '',
  });

  useEffect(() => {
    if (isOpen && ficha) {
      // Obtener fecha mínima (hoy)
      const today = new Date().toISOString().split('T')[0];
      setFormData({
        fecha_cita: today,
        hora_cita: '',
      });
    }
  }, [isOpen, ficha]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fecha_cita || !formData.hora_cita) {
      showToast('Por favor complete la fecha y hora de la cita', 'warning');
      return;
    }

    if (!ficha) return;

    setLoading(true);
    try {
      await ApiService.aprobarFicha(ficha.id_ficha, formData.fecha_cita, formData.hora_cita);
      showToast('Ficha aprobada exitosamente', 'success');
      onSuccess();
      onClose();
    } catch (error: any) {
      showToast('Error al aprobar ficha: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !ficha) return null;

  // Obtener fecha mínima (hoy)
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content aprobar-ficha-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>✅ Aprobar Ficha de Consulta</h2>
          <button 
            className="close-btn" 
            onClick={onClose}
            title="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="ficha-info-preview">
            <p><strong>Número de Consulta:</strong> {ficha.numero_consulta}</p>
            <p><strong>Consultante:</strong> {ficha.consultante.usuario.nombre} - CI: {ficha.consultante.usuario.ci}</p>
            <p><strong>Tema:</strong> {ficha.tema_consulta}</p>
          </div>

          <form onSubmit={handleSubmit} className="form-content">
            <div className="form-group">
              <label htmlFor="fecha_cita">Fecha de Cita *</label>
              <input
                type="date"
                id="fecha_cita"
                value={formData.fecha_cita}
                onChange={(e) => setFormData({ ...formData, fecha_cita: e.target.value })}
                required
                min={today}
                disabled={loading}
              />
              <small className="form-hint">
                Seleccione la fecha para la cita del consultante
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="hora_cita">Hora de Cita *</label>
              <input
                type="time"
                id="hora_cita"
                value={formData.hora_cita}
                onChange={(e) => setFormData({ ...formData, hora_cita: e.target.value })}
                required
                disabled={loading}
              />
              <small className="form-hint">
                Seleccione la hora para la cita (formato 24 horas)
              </small>
            </div>

            <div className="form-actions">
              <button 
                type="button"
                onClick={onClose}
                disabled={loading}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                disabled={loading} 
                className="btn-primary"
              >
                {loading ? 'Aprobando...' : 'Aprobar Ficha'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}


