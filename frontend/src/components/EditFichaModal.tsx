import { useState, useEffect } from 'react';
import { ApiService } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import './EditFichaModal.css';

interface Consultante {
  id_consultante: number;
  id_usuario: number;
  usuario: {
    id_usuario: number;
    nombre: string;
    ci: string;
  };
}

interface Docente {
  id_usuario: number;
  nombre: string;
  ci: string;
  correo: string;
}

interface Ficha {
  id_ficha: number;
  id_consultante: number;
  fecha_cita: string;
  hora_cita?: string;
  tema_consulta: string;
  id_docente: number;
  observaciones?: string;
  consultante: {
    id_consultante: number;
    usuario: {
      id_usuario: number;
      nombre: string;
      ci: string;
    };
  };
  docente: {
    id_usuario: number;
    nombre: string;
    ci: string;
    correo: string;
  };
}

interface Props {
  ficha: Ficha | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditFichaModal({ ficha, isOpen, onClose, onSuccess }: Props) {
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    fecha_cita: '',
    hora_cita: '',
    tema_consulta: '',
    id_docente: '',
    observaciones: '',
  });

  useEffect(() => {
    if (isOpen && ficha) {
      // Cargar docentes cuando se abre el modal
      loadDocentes();
      // Cargar datos de la ficha en el formulario
      const fechaCita = new Date(ficha.fecha_cita);
      const fechaFormateada = fechaCita.toISOString().split('T')[0];
      setFormData({
        fecha_cita: fechaFormateada,
        hora_cita: ficha.hora_cita || '',
        tema_consulta: ficha.tema_consulta,
        id_docente: ficha.id_docente.toString(),
        observaciones: ficha.observaciones || '',
      });
    }
  }, [isOpen, ficha]);

  const loadDocentes = async () => {
    try {
      const allUsers = await ApiService.getUsuarios();
      const docentesList = allUsers.filter((u: any) => {
        return u.rol === 'docente' && (u.activo === true || u.activo === undefined || u.activo === null);
      });
      setDocentes(docentesList);
    } catch (error: any) {
      showToast('Error al cargar docentes: ' + error.message, 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fecha_cita || !formData.tema_consulta || !formData.id_docente) {
      showToast('Por favor complete todos los campos requeridos', 'warning');
      return;
    }

    if (!ficha) return;

    setLoading(true);
    try {
      await ApiService.updateFicha(ficha.id_ficha, {
        fecha_cita: formData.fecha_cita,
        hora_cita: formData.hora_cita || undefined,
        tema_consulta: formData.tema_consulta,
        id_docente: parseInt(formData.id_docente),
        observaciones: formData.observaciones || undefined,
      });

      showToast('Ficha actualizada exitosamente', 'success');
      onSuccess();
      onClose();
    } catch (error: any) {
      showToast('Error al actualizar ficha: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !ficha) return null;

  // Obtener fecha mínima (hoy)
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content edit-ficha-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>✏️ Editar Ficha de Consulta</h2>
          <button 
            className="close-btn" 
            onClick={onClose}
            title="Cerrar"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="form-content">
          <div className="form-group">
            <label>Consultante</label>
            <div className="readonly-field">
              {ficha.consultante.usuario.nombre} - CI: {ficha.consultante.usuario.ci}
            </div>
          </div>

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
          </div>

          <div className="form-group">
            <label htmlFor="hora_cita">Hora de Cita</label>
            <input
              type="time"
              id="hora_cita"
              value={formData.hora_cita}
              onChange={(e) => setFormData({ ...formData, hora_cita: e.target.value })}
              disabled={loading}
            />
            <small className="form-hint">
              Hora opcional de la cita (formato 24 horas)
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="tema_consulta">Tema de Consulta *</label>
            <textarea
              id="tema_consulta"
              value={formData.tema_consulta}
              onChange={(e) => setFormData({ ...formData, tema_consulta: e.target.value })}
              required
              rows={4}
              disabled={loading}
              placeholder="Describa el tema o motivo de la consulta..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="id_docente">Docente Asignado *</label>
            <select
              id="id_docente"
              value={formData.id_docente}
              onChange={(e) => setFormData({ ...formData, id_docente: e.target.value })}
              required
              disabled={loading}
            >
              <option value="">Seleccione un docente</option>
              {docentes.map((d) => (
                <option key={d.id_usuario} value={d.id_usuario}>
                  {d.nombre} - CI: {d.ci}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="observaciones">Observaciones</label>
            <textarea
              id="observaciones"
              value={formData.observaciones}
              onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              rows={3}
              disabled={loading}
              placeholder="Observaciones adicionales (opcional)..."
            />
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
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

