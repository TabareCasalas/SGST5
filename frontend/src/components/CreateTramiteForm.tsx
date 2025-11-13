import { useState, useEffect } from 'react';
import { ApiService } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import './CreateTramiteForm.css';

interface Consultante {
  id_consultante: number;
  id_usuario: number;
  usuario: {
    id_usuario: number;
    nombre: string;
    ci: string;
  };
}

interface Grupo {
  id_grupo: number;
  nombre: string;
}

interface Props {
  onSuccess?: () => void;
}

export function CreateTramiteForm({ onSuccess }: Props) {
  const [consultantes, setConsultantes] = useState<Consultante[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    id_consultante: '',
    id_grupo: '',
    num_carpeta: '',
    observaciones: '',
  });

  useEffect(() => {
    loadConsultantes();
    loadGrupos();
  }, []);

  const loadConsultantes = async () => {
    try {
      const data = await ApiService.getConsultantes();
      setConsultantes(data);
    } catch (error: any) {
      showToast('Error al cargar consultantes: ' + error.message, 'error');
    }
  };

  const loadGrupos = async () => {
    try {
      const data = await ApiService.getGrupos();
      setGrupos(data);
    } catch (error: any) {
      showToast('Error al cargar grupos: ' + error.message, 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.id_consultante || !formData.id_grupo || !formData.num_carpeta) {
      showToast('Por favor complete todos los campos requeridos', 'warning');
      return;
    }

    setLoading(true);
    try {
      await ApiService.createTramite({
        id_consultante: parseInt(formData.id_consultante),
        id_grupo: parseInt(formData.id_grupo),
        num_carpeta: parseInt(formData.num_carpeta),
        observaciones: formData.observaciones || undefined,
      });

      showToast('Trámite creado exitosamente', 'success');
      setFormData({
        id_consultante: '',
        id_grupo: '',
        num_carpeta: '',
        observaciones: '',
      });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      showToast('Error al crear trámite: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-tramite-form">
      <div className="form-header">
        <h2>Crear Nuevo Trámite</h2>
      </div>

      <form onSubmit={handleSubmit} className="form-content">
        <div className="form-group">
          <label htmlFor="id_consultante">Consultante *</label>
          <select
            id="id_consultante"
            value={formData.id_consultante}
            onChange={(e) => setFormData({ ...formData, id_consultante: e.target.value })}
            required
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
          <label htmlFor="id_grupo">Grupo *</label>
          <select
            id="id_grupo"
            value={formData.id_grupo}
            onChange={(e) => setFormData({ ...formData, id_grupo: e.target.value })}
            required
          >
            <option value="">Seleccione un grupo</option>
            {grupos.map((g) => (
              <option key={g.id_grupo} value={g.id_grupo}>
                {g.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="num_carpeta">Número de Carpeta *</label>
          <input
            type="number"
            id="num_carpeta"
            value={formData.num_carpeta}
            onChange={(e) => setFormData({ ...formData, num_carpeta: e.target.value })}
            required
            min="1"
          />
        </div>

        <div className="form-group">
          <label htmlFor="observaciones">Observaciones</label>
          <textarea
            id="observaciones"
            value={formData.observaciones}
            onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
            rows={4}
          />
        </div>

        <div className="form-actions">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Creando...' : 'Crear Trámite'}
          </button>
        </div>
      </form>
    </div>
  );
}






