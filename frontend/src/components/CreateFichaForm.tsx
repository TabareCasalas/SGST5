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
    fecha_cita_display: '', // Formato dd/mm/aaaa para mostrar
    hora_cita: '',
    tema_consulta: '',
    descripcion_especial: '',
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

    // Validar formato de fecha si está presente
    if (formData.fecha_cita_display && !validarFecha(formData.fecha_cita_display)) {
      showToast('La fecha debe tener el formato dd/mm/aaaa (ejemplo: 15/01/2025)', 'warning');
      return;
    }

    // Validar formato de hora si está presente
    if (formData.hora_cita && !validarHora(formData.hora_cita)) {
      showToast('La hora debe tener el formato HH:mm en 24 horas (ejemplo: 14:30)', 'warning');
      return;
    }

    if (estado === 'aprobado' && !formData.fecha_cita_display) {
      showToast('La fecha de cita es requerida para fichas aprobadas', 'warning');
      return;
    }

    if (estado === 'aprobado' && !formData.hora_cita) {
      showToast('La hora de cita es requerida para fichas aprobadas', 'warning');
      return;
    }

    setLoading(true);
    try {
      // Mapeo de valores a textos completos
      const temasMap: { [key: string]: string } = {
        'consulta': 'Consulta',
        'expedicion_certificado': 'Expedición de certificado',
        'testimonio_exhibicion': 'Testimonio por exhibición',
        'certificacion_firma_carta_poder_prevision_social': 'Certificación de firma en carta poder para previsión social',
        'certificacion_firma_carta_poder_admin_publica': 'Certificación de firma en carta poder para Administración Pública',
        'certificacion_firma_carta_poder_acto_modificativo': 'Certificación de firma en carta poder: acto modificativo',
        'certificacion_firma_carta_poder_acto_sustitutivo': 'Certificación de firma en carta poder: acto sustitutivo',
        'certificacion_firma_carta_poder_acto_extintivo': 'Certificación de firma en carta poder: acto extintivo',
        'intervencion_adopcion': 'Intervención para adopción',
        'intervencion_consentimiento_matrimonio': 'Intervención para consentimiento para contraer matrimonio',
        'intervencion_legitimacion': 'Intervención para legitimación',
        'intervencion_reconocimiento_hijo_natural': 'Intervención para reconocimiento de hijo natural',
        'intervencion_consentimiento_convencion_matrimonial': 'Intervención para consentimiento para otorgar convención matrimonial',
        'constitucion_bien_familia': 'Constitución de bien de familia (tasación bancaria ≤ UR 1000)',
        'tramitacion_sucesion_unico_bien_vivienda': 'Tramitación de sucesión con único bien vivienda',
        'tramitacion_sucesion_cuota_parte_ur200': 'Tramitación de sucesión con cuota parte ≤ UR 200',
        'tramitacion_disolucion_sociedad_conyugal_unico_bien_vivienda': 'Tramitación de disolución de sociedad conyugal con único bien vivienda',
        'tramitacion_disolucion_sociedad_conyugal_cuota_parte_ur200': 'Tramitación de disolución de sociedad conyugal con cuota parte ≤ UR 200',
        'tramitacion_venia': 'Tramitación de venia',
        'tramitacion_autorizacion': 'Tramitación de autorización',
        'rectificacion_partida': 'Rectificación de partida',
        'aprobacion_particion_mixta': 'Aprobación de partición mixta',
        'inscripcion_tardia_nacimiento': 'Inscripción tardía de nacimiento',
        'tramitacion_segunda_copia': 'Tramitación de segunda copia',
        'tramitacion_ulterior_copia': 'Tramitación de ulterior copia',
        'legitimacion_adoptiva': 'Legitimación adoptiva',
        'designacion_curador_especial': 'Designación de curador especial',
        'informacion_vida_costumbres': 'Información de vida y costumbres',
        'informacion_ad_perpetuam': 'Información ad perpetuam',
        'declaratoria_salida_fiscal': 'Declaratoria de salida fiscal',
        'declaratoria_salida_municipal': 'Declaratoria de salida municipal',
        'aprobacion_estatuto_asociacion_civil': 'Aprobación de estatuto de asociación civil',
        'aprobacion_estatuto_sociedad_cooperativa': 'Aprobación de estatuto de sociedad cooperativa',
        'otra_actuacion_articulo_29': 'Otra actuación comprendida en el artículo 29',
        'actuacion_no_articulo_29': 'Actuación no comprendida en el artículo 29'
      };

      // Preparar tema_consulta: convertir valor a texto completo
      let temaConsultaFinal = temasMap[formData.tema_consulta] || formData.tema_consulta;
      
      // Si es una opción especial con descripción, concatenar con descripción si existe
      if ((formData.tema_consulta === 'otra_actuacion_articulo_29' || formData.tema_consulta === 'actuacion_no_articulo_29') && formData.descripcion_especial.trim()) {
        temaConsultaFinal = `${temaConsultaFinal}: ${formData.descripcion_especial.trim()}`;
      }

      // Preparar datos: convertir cadenas vacías a undefined
      const datosFicha: any = {
        id_consultante: parseInt(formData.id_consultante),
        tema_consulta: temaConsultaFinal,
        id_docente: parseInt(formData.id_docente),
        estado: estado,
      };

      // Convertir fecha de formato dd/mm/aaaa a ISO para el backend
      if (formData.fecha_cita_display && formData.fecha_cita_display.trim() !== '') {
        const fechaISO = fechaToISO(formData.fecha_cita_display);
        if (fechaISO) {
          datosFicha.fecha_cita = fechaISO;
        }
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
        fecha_cita_display: '',
        hora_cita: '',
        tema_consulta: '',
        descripcion_especial: '',
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

  // Convertir fecha de formato dd/mm/aaaa a ISO (yyyy-mm-dd) para el backend
  const fechaToISO = (fechaStr: string): string => {
    if (!fechaStr) return '';
    // Formato esperado: dd/mm/aaaa
    const partes = fechaStr.split('/');
    if (partes.length === 3) {
      const [dia, mes, año] = partes;
      return `${año}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
    }
    return fechaStr; // Si no coincide, devolver tal cual
  };

  // Validar formato de fecha dd/mm/aaaa
  const validarFecha = (fechaStr: string): boolean => {
    if (!fechaStr) return true; // Vacío es válido (opcional)
    const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = fechaStr.match(regex);
    if (!match) return false;
    
    const [, dia, mes, año] = match;
    const diaNum = parseInt(dia, 10);
    const mesNum = parseInt(mes, 10);
    const añoNum = parseInt(año, 10);
    
    // Validar rangos
    if (mesNum < 1 || mesNum > 12) return false;
    if (diaNum < 1 || diaNum > 31) return false;
    if (añoNum < 1900 || añoNum > 2100) return false;
    
    // Validar fecha válida
    const fecha = new Date(añoNum, mesNum - 1, diaNum);
    return fecha.getDate() === diaNum && 
           fecha.getMonth() === mesNum - 1 && 
           fecha.getFullYear() === añoNum;
  };

  // Validar formato de hora HH:mm
  const validarHora = (horaStr: string): boolean => {
    if (!horaStr) return true; // Vacío es válido (opcional)
    const regex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    return regex.test(horaStr);
  };

  // Formatear fecha mientras se escribe (dd/mm/aaaa)
  const handleFechaChange = (value: string) => {
    // Remover caracteres no numéricos excepto /
    let cleaned = value.replace(/[^\d/]/g, '');
    
    // Limitar longitud
    if (cleaned.length > 10) cleaned = cleaned.substring(0, 10);
    
    // Agregar / automáticamente
    if (cleaned.length > 2 && cleaned[2] !== '/') {
      cleaned = cleaned.substring(0, 2) + '/' + cleaned.substring(2);
    }
    if (cleaned.length > 5 && cleaned[5] !== '/') {
      cleaned = cleaned.substring(0, 5) + '/' + cleaned.substring(5);
    }
    
    setFormData({ ...formData, fecha_cita_display: cleaned });
  };

  // Formatear hora mientras se escribe (HH:mm)
  const handleHoraChange = (value: string) => {
    // Remover caracteres no numéricos excepto :
    let cleaned = value.replace(/[^\d:]/g, '');
    
    // Limitar longitud
    if (cleaned.length > 5) cleaned = cleaned.substring(0, 5);
    
    // Agregar : automáticamente después de 2 dígitos
    if (cleaned.length > 2 && cleaned[2] !== ':') {
      cleaned = cleaned.substring(0, 2) + ':' + cleaned.substring(2);
    }
    
    setFormData({ ...formData, hora_cita: cleaned });
  };


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
            type="text"
            id="fecha_cita"
            value={formData.fecha_cita_display}
            onChange={(e) => handleFechaChange(e.target.value)}
            placeholder="dd/mm/aaaa"
            maxLength={10}
            disabled={loading}
            style={{ fontFamily: 'monospace' }}
          />
          <small className="form-hint">
            Formato: dd/mm/aaaa (ejemplo: 15/01/2025). Requerida para fichas aprobadas. Opcional para fichas pendientes.
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="hora_cita">
            Hora de Cita <span className="required-asterisk">*</span>
            <small className="form-hint-inline"> (Opcional para fichas pendientes)</small>
          </label>
          <input
            type="text"
            id="hora_cita"
            value={formData.hora_cita}
            onChange={(e) => handleHoraChange(e.target.value)}
            placeholder="HH:mm"
            maxLength={5}
            disabled={loading}
            style={{ fontFamily: 'monospace' }}
          />
          <small className="form-hint">
            Formato: HH:mm en 24 horas (ejemplo: 14:30). Requerida para fichas aprobadas. Opcional para fichas pendientes.
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="tema_consulta">Tema de Consulta *</label>
          <select
            id="tema_consulta"
            value={formData.tema_consulta}
            onChange={(e) => setFormData({ ...formData, tema_consulta: e.target.value, descripcion_especial: '' })}
            required
            disabled={loading}
          >
            <option value="">Seleccione un tema de consulta</option>
            <option value="consulta">Consulta</option>
            <option value="expedicion_certificado">Expedición de certificado</option>
            <option value="testimonio_exhibicion">Testimonio por exhibición</option>
            <option value="certificacion_firma_carta_poder_prevision_social">Certificación de firma en carta poder para previsión social</option>
            <option value="certificacion_firma_carta_poder_admin_publica">Certificación de firma en carta poder para Administración Pública</option>
            <option value="certificacion_firma_carta_poder_acto_modificativo">Certificación de firma en carta poder: acto modificativo</option>
            <option value="certificacion_firma_carta_poder_acto_sustitutivo">Certificación de firma en carta poder: acto sustitutivo</option>
            <option value="certificacion_firma_carta_poder_acto_extintivo">Certificación de firma en carta poder: acto extintivo</option>
            <option value="intervencion_adopcion">Intervención para adopción</option>
            <option value="intervencion_consentimiento_matrimonio">Intervención para consentimiento para contraer matrimonio</option>
            <option value="intervencion_legitimacion">Intervención para legitimación</option>
            <option value="intervencion_reconocimiento_hijo_natural">Intervención para reconocimiento de hijo natural</option>
            <option value="intervencion_consentimiento_convencion_matrimonial">Intervención para consentimiento para otorgar convención matrimonial</option>
            <option value="constitucion_bien_familia">Constitución de bien de familia (tasación bancaria ≤ UR 1000)</option>
            <option value="tramitacion_sucesion_unico_bien_vivienda">Tramitación de sucesión con único bien vivienda</option>
            <option value="tramitacion_sucesion_cuota_parte_ur200">Tramitación de sucesión con cuota parte ≤ UR 200</option>
            <option value="tramitacion_disolucion_sociedad_conyugal_unico_bien_vivienda">Tramitación de disolución de sociedad conyugal con único bien vivienda</option>
            <option value="tramitacion_disolucion_sociedad_conyugal_cuota_parte_ur200">Tramitación de disolución de sociedad conyugal con cuota parte ≤ UR 200</option>
            <option value="tramitacion_venia">Tramitación de venia</option>
            <option value="tramitacion_autorizacion">Tramitación de autorización</option>
            <option value="rectificacion_partida">Rectificación de partida</option>
            <option value="aprobacion_particion_mixta">Aprobación de partición mixta</option>
            <option value="inscripcion_tardia_nacimiento">Inscripción tardía de nacimiento</option>
            <option value="tramitacion_segunda_copia">Tramitación de segunda copia</option>
            <option value="tramitacion_ulterior_copia">Tramitación de ulterior copia</option>
            <option value="legitimacion_adoptiva">Legitimación adoptiva</option>
            <option value="designacion_curador_especial">Designación de curador especial</option>
            <option value="informacion_vida_costumbres">Información de vida y costumbres</option>
            <option value="informacion_ad_perpetuam">Información ad perpetuam</option>
            <option value="declaratoria_salida_fiscal">Declaratoria de salida fiscal</option>
            <option value="declaratoria_salida_municipal">Declaratoria de salida municipal</option>
            <option value="aprobacion_estatuto_asociacion_civil">Aprobación de estatuto de asociación civil</option>
            <option value="aprobacion_estatuto_sociedad_cooperativa">Aprobación de estatuto de sociedad cooperativa</option>
            <option value="otra_actuacion_articulo_29">Otra actuación comprendida en el artículo 29</option>
            <option value="actuacion_no_articulo_29">Actuación no comprendida en el artículo 29</option>
          </select>
          {(formData.tema_consulta === 'otra_actuacion_articulo_29' || formData.tema_consulta === 'actuacion_no_articulo_29') && (
            <div className="form-group" style={{ marginTop: '10px' }}>
              <label htmlFor="descripcion_especial">Descripción (Opcional)</label>
              <textarea
                id="descripcion_especial"
                value={formData.descripcion_especial}
                onChange={(e) => setFormData({ ...formData, descripcion_especial: e.target.value })}
                rows={3}
                disabled={loading}
                placeholder={`Ingrese una descripción opcional para ${formData.tema_consulta === 'otra_actuacion_articulo_29' ? 'la otra actuación comprendida en el artículo 29' : 'la actuación no comprendida en el artículo 29'}...`}
              />
            </div>
          )}
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




