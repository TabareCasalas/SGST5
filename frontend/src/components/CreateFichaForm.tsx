import { useState, useEffect } from 'react';
import { ApiService } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import './CreateFichaForm.css';

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

interface Props {
  onSuccess?: () => void;
}

export function CreateFichaForm({ onSuccess }: Props) {
  const [consultantes, setConsultantes] = useState<Consultante[]>([]);
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    id_consultante: '',
    fecha_cita: '',
    hora_cita: '',
    tema_consulta: '',
    id_docente: '',
    observaciones: '',
  });

  useEffect(() => {
    loadConsultantes();
    loadDocentes();
  }, []);

  const loadConsultantes = async () => {
    try {
      const data = await ApiService.getConsultantes();
      setConsultantes(data);
    } catch (error: any) {
      showToast('Error al cargar consultantes: ' + error.message, 'error');
    }
  };

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

  const handleSubmit = async (e: React.FormEvent, estado: 'aprobado' | 'pendiente') => {
    e.preventDefault();
    
    // Validación: para fichas aprobadas, fecha_cita y hora_cita son requeridas
    // Para fichas pendientes, fecha_cita y hora_cita son opcionales
    if (!formData.id_consultante || !formData.tema_consulta || !formData.id_docente) {
      showToast('Por favor complete todos los campos requeridos', 'warning');
      return;
    }

    if (estado === 'aprobado' && !formData.fecha_cita) {
      showToast('La fecha de cita es requerida para fichas aprobadas', 'warning');
      return;
    }

    if (estado === 'aprobado' && !formData.hora_cita) {
      showToast('La hora de cita es requerida para fichas aprobadas', 'warning');
      return;
    }

    setLoading(true);
    try {
      // Preparar datos: convertir cadenas vacías a undefined
      const datosFicha: any = {
        id_consultante: parseInt(formData.id_consultante),
        tema_consulta: formData.tema_consulta,
        id_docente: parseInt(formData.id_docente),
        estado: estado,
      };

      // Solo incluir fecha_cita si tiene valor (no cadena vacía)
      if (formData.fecha_cita && formData.fecha_cita.trim() !== '') {
        datosFicha.fecha_cita = formData.fecha_cita;
      }

      // Solo incluir hora_cita si tiene valor (no cadena vacía)
      if (formData.hora_cita && formData.hora_cita.trim() !== '') {
        datosFicha.hora_cita = formData.hora_cita;
      }

      // Solo incluir observaciones si tiene valor
      if (formData.observaciones && formData.observaciones.trim() !== '') {
        datosFicha.observaciones = formData.observaciones;
      }

      await ApiService.createFicha(datosFicha);

      showToast(
        estado === 'aprobado' 
          ? 'Ficha creada y aprobada exitosamente' 
          : 'Ficha pendiente creada exitosamente. Debe ser aprobada por un administrador.',
        'success'
      );
      setFormData({
        id_consultante: '',
        fecha_cita: '',
        hora_cita: '',
        tema_consulta: '',
        id_docente: '',
        observaciones: '',
      });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      showToast('Error al crear ficha: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Obtener fecha mínima (hoy)
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="create-ficha-form">
      <div className="form-header">
        <h2>📋 Crear Nueva Ficha de Consulta</h2>
        <p className="form-subtitle">
          El número de consulta se generará automáticamente en formato xx/yyyy
        </p>
      </div>

      <form onSubmit={(e) => e.preventDefault()} className="form-content">
        <div className="form-group">
          <label htmlFor="id_consultante">Consultante *</label>
          <select
            id="id_consultante"
            value={formData.id_consultante}
            onChange={(e) => setFormData({ ...formData, id_consultante: e.target.value })}
            required
            disabled={loading}
          >
            <option value="">Seleccione un consultante</option>
            {consultantes.map((c) => (
              <option key={c.id_consultante} value={c.id_consultante}>
                {c.usuario.nombre} - CI: {c.usuario.ci}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="fecha_cita">
            Fecha de Cita <span className="required-asterisk">*</span>
            <small className="form-hint-inline"> (Opcional para fichas pendientes)</small>
          </label>
          <input
            type="date"
            id="fecha_cita"
            value={formData.fecha_cita}
            onChange={(e) => setFormData({ ...formData, fecha_cita: e.target.value })}
            min={today}
            disabled={loading}
          />
          <small className="form-hint">
            Requerida para fichas aprobadas. Opcional para fichas pendientes.
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="hora_cita">
            Hora de Cita <span className="required-asterisk">*</span>
            <small className="form-hint-inline"> (Opcional para fichas pendientes)</small>
          </label>
          <input
            type="time"
            id="hora_cita"
            value={formData.hora_cita}
            onChange={(e) => setFormData({ ...formData, hora_cita: e.target.value })}
            disabled={loading}
          />
          <small className="form-hint">
            Requerida para fichas aprobadas. Opcional para fichas pendientes.
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
          <small className="form-hint">
            El docente decidirá a qué grupo asignar esta ficha
          </small>
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
            onClick={(e) => handleSubmit(e, 'aprobado')} 
            disabled={loading} 
            className="btn-primary"
            style={{ marginRight: '10px' }}
          >
            {loading ? 'Creando...' : 'Crear Ficha'}
          </button>
          <button 
            type="button"
            onClick={(e) => handleSubmit(e, 'pendiente')} 
            disabled={loading} 
            className="btn-secondary"
          >
            {loading ? 'Creando...' : 'Crear Ficha Pendiente'}
          </button>
        </div>
      </form>
    </div>
  );
}




