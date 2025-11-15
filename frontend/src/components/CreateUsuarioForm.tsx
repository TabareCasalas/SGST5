import { useState, useEffect } from 'react';
import { ApiService } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { validateCI, cleanCI } from '../utils/ciValidator';
import './CreateUsuarioForm.css';

interface Grupo {
  id_grupo: number;
  nombre: string;
  descripcion?: string;
}

interface Props {
  onSuccess?: () => void;
}

export function CreateUsuarioForm({ onSuccess }: Props) {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(false);
  const [ciError, setCiError] = useState<string>('');
  const { showToast } = useToast();

  // Calcular fecha por defecto (4 meses después) en formato dd/mm/aaaa
  const getDefaultDesactivacionDate = () => {
    const fecha = new Date();
    fecha.setMonth(fecha.getMonth() + 4);
    const day = fecha.getDate().toString().padStart(2, '0');
    const month = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const year = fecha.getFullYear().toString();
    return `${day}/${month}/${year}`;
  };

  // Calcular semestre por defecto basado en la fecha actual
  const getDefaultSemestre = () => {
    const hoy = new Date();
    const mes = hoy.getMonth() + 1; // getMonth() retorna 0-11
    const año = hoy.getFullYear();
    
    // Si estamos entre enero (1) y junio (6), semestre 1
    // Si estamos entre julio (7) y diciembre (12), semestre 2
    const semestre = (mes >= 1 && mes <= 6) ? 1 : 2;
    return `${año}/${semestre}`;
  };

  // Form data
  const [formData, setFormData] = useState({
    nombre: '',
    ci: '',
    domicilios: [''],
    telefonos: [''],
    correos: [''],
    rol: 'estudiante',
    nivel_acceso: '',
    semestre: getDefaultSemestre(),
    id_grupo: '',
    fecha_desactivacion_automatica: getDefaultDesactivacionDate(),
  });

  useEffect(() => {
    loadGrupos();
  }, []);

  const loadGrupos = async () => {
    try {
      const data = await ApiService.getGrupos();
      setGrupos(data.filter((g: Grupo) => g.id_grupo));
    } catch (err) {
      console.error('Error cargando grupos:', err);
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
    
    setFormData({ ...formData, fecha_desactivacion_automatica: cleaned });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validar que haya al menos un valor en cada campo requerido
      const correosFiltrados = formData.correos.filter(c => c.trim());
      const telefonosFiltrados = formData.telefonos.filter(t => t.trim());
      const domiciliosFiltrados = formData.domicilios.filter(d => d.trim());

      if (correosFiltrados.length === 0) {
        showToast('Debe ingresar al menos un correo electrónico', 'error');
        setLoading(false);
        return;
      }

      if (telefonosFiltrados.length === 0) {
        showToast('Debe ingresar al menos un teléfono', 'error');
        setLoading(false);
        return;
      }

      if (domiciliosFiltrados.length === 0) {
        showToast('Debe ingresar al menos un domicilio', 'error');
        setLoading(false);
        return;
      }

      // Combinar múltiples valores en strings separados por |
      const domicilio = domiciliosFiltrados.join('|');
      const telefono = telefonosFiltrados.join('|');
      // El primer correo es el principal (para el unique constraint)
      const correo = correosFiltrados[0];
      const correosAdicionales = correosFiltrados.slice(1);

      // Validar CI antes de enviar
      const ciLimpia = cleanCI(formData.ci);
      if (!validateCI(ciLimpia)) {
        showToast('La cédula de identidad no es válida. El dígito verificador es incorrecto.', 'error');
        setCiError('La cédula de identidad no es válida. El dígito verificador es incorrecto.');
        setLoading(false);
        return;
      }
      setCiError('');

      const data: any = {
        nombre: formData.nombre,
        ci: ciLimpia, // Usar la CI limpia
        domicilio: domicilio,
        telefono: telefono,
        correo: correo,
        rol: formData.rol,
      };

      // Si hay correos adicionales, enviarlos también
      if (correosAdicionales.length > 0) {
        data.correos_adicionales = correosAdicionales.join('|');
      }

      // Agregar nivel_acceso si es administrador
      if (formData.rol === 'administrador' && formData.nivel_acceso) {
        data.nivel_acceso = parseInt(formData.nivel_acceso);
      }

      // Solo agregar semestre, grupo y fecha de desactivación si es estudiante
      if (formData.rol === 'estudiante') {
        data.semestre = formData.semestre;
        // Solo agregar grupo si se seleccionó uno
        if (formData.id_grupo && formData.id_grupo.trim() !== '') {
          data.id_grupo = parseInt(formData.id_grupo);
        }
        // Agregar fecha de desactivación automática (convertir de dd/mm/aaaa a ISO)
        if (formData.fecha_desactivacion_automatica) {
          // Validar formato
          if (!validarFecha(formData.fecha_desactivacion_automatica)) {
            showToast('La fecha de desactivación debe tener el formato dd/mm/aaaa (ejemplo: 15/05/2025)', 'error');
            setLoading(false);
            return;
          }
          const fechaISO = fechaToISO(formData.fecha_desactivacion_automatica);
          if (fechaISO) {
            data.fecha_desactivacion_automatica = fechaISO;
          }
        }
      }

      await ApiService.createUsuario(data);
      showToast('Usuario creado exitosamente', 'success');
      
      // Reset form
      setFormData({
        nombre: '',
        ci: '',
        domicilios: [''],
        telefonos: [''],
        correos: [''],
        rol: 'estudiante',
        nivel_acceso: '',
        semestre: getDefaultSemestre(),
        id_grupo: '',
        fecha_desactivacion_automatica: getDefaultDesactivacionDate(),
      });

      if (onSuccess) onSuccess();
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-usuario-container">
      <h2>➕ Crear Nuevo Usuario</h2>

      <form onSubmit={handleSubmit} className="usuario-form">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="nombre">Nombre Completo *</label>
            <input
              id="nombre"
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              required
              disabled={loading}
              placeholder="Juan Pérez"
            />
          </div>

          <div className="form-group">
            <label htmlFor="ci">Cédula de Identidad *</label>
            <input
              id="ci"
              type="text"
              value={formData.ci}
              onChange={(e) => {
                setFormData({ ...formData, ci: e.target.value });
                // Limpiar error al escribir
                if (ciError) {
                  setCiError('');
                }
              }}
              required
              disabled={loading}
              placeholder="12345678"
              className={ciError ? 'error' : ''}
            />
            {ciError && <span className="error-message">{ciError}</span>}
          </div>
        </div>

        <div className="form-group">
          <label>Correos Electrónicos *</label>
          {formData.correos.map((correo, index) => (
            <div key={index} className="multi-input-row">
              <input
                type="email"
                value={correo}
                onChange={(e) => {
                  const nuevosCorreos = [...formData.correos];
                  nuevosCorreos[index] = e.target.value;
                  setFormData({ ...formData, correos: nuevosCorreos });
                }}
                required={index === 0}
                disabled={loading}
                placeholder="correo@ejemplo.com"
              />
              {index === formData.correos.length - 1 && formData.correos.length < 5 && (
                <button
                  type="button"
                  className="add-field-btn"
                  onClick={() => setFormData({ ...formData, correos: [...formData.correos, ''] })}
                  disabled={loading}
                  title="Agregar otro correo"
                >
                  ➕
                </button>
              )}
              {formData.correos.length > 1 && (
                <button
                  type="button"
                  className="remove-field-btn"
                  onClick={() => {
                    const nuevosCorreos = formData.correos.filter((_, i) => i !== index);
                    setFormData({ ...formData, correos: nuevosCorreos });
                  }}
                  disabled={loading}
                  title="Eliminar correo"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="form-group">
          <label>Teléfonos *</label>
          {formData.telefonos.map((telefono, index) => (
            <div key={index} className="multi-input-row">
              <input
                type="text"
                value={telefono}
                onChange={(e) => {
                  const nuevosTelefonos = [...formData.telefonos];
                  nuevosTelefonos[index] = e.target.value;
                  setFormData({ ...formData, telefonos: nuevosTelefonos });
                }}
                required={index === 0}
                disabled={loading}
                placeholder="0987654321"
              />
              {index === formData.telefonos.length - 1 && formData.telefonos.length < 5 && (
                <button
                  type="button"
                  className="add-field-btn"
                  onClick={() => setFormData({ ...formData, telefonos: [...formData.telefonos, ''] })}
                  disabled={loading}
                  title="Agregar otro teléfono"
                >
                  ➕
                </button>
              )}
              {formData.telefonos.length > 1 && (
                <button
                  type="button"
                  className="remove-field-btn"
                  onClick={() => {
                    const nuevosTelefonos = formData.telefonos.filter((_, i) => i !== index);
                    setFormData({ ...formData, telefonos: nuevosTelefonos });
                  }}
                  disabled={loading}
                  title="Eliminar teléfono"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="form-group">
          <label>Domicilios *</label>
          {formData.domicilios.map((domicilio, index) => (
            <div key={index} className="multi-input-row">
              <input
                type="text"
                value={domicilio}
                onChange={(e) => {
                  const nuevosDomicilios = [...formData.domicilios];
                  nuevosDomicilios[index] = e.target.value;
                  setFormData({ ...formData, domicilios: nuevosDomicilios });
                }}
                required={index === 0}
                disabled={loading}
                placeholder="Calle, número, ciudad"
              />
              {index === formData.domicilios.length - 1 && formData.domicilios.length < 5 && (
                <button
                  type="button"
                  className="add-field-btn"
                  onClick={() => setFormData({ ...formData, domicilios: [...formData.domicilios, ''] })}
                  disabled={loading}
                  title="Agregar otro domicilio"
                >
                  ➕
                </button>
              )}
              {formData.domicilios.length > 1 && (
                <button
                  type="button"
                  className="remove-field-btn"
                  onClick={() => {
                    const nuevosDomicilios = formData.domicilios.filter((_, i) => i !== index);
                    setFormData({ ...formData, domicilios: nuevosDomicilios });
                  }}
                  disabled={loading}
                  title="Eliminar domicilio"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="form-group">
          <label htmlFor="rol">Rol *</label>
          <select
            id="rol"
            value={formData.rol}
            onChange={(e) => {
              const nuevoRol = e.target.value;
              setFormData({ 
                ...formData, 
                rol: nuevoRol, 
                semestre: nuevoRol === 'estudiante' ? getDefaultSemestre() : '', 
                id_grupo: '', 
                nivel_acceso: '',
                fecha_desactivacion_automatica: nuevoRol === 'estudiante' ? getDefaultDesactivacionDate() : ''
              });
            }}
            required
            disabled={loading}
          >
            <option value="estudiante">👨‍🎓 Estudiante</option>
            <option value="docente">👨‍🏫 Docente</option>
            <option value="consultante">👤 Consultante</option>
            <option value="administrador">👨‍💼 Administrador</option>
          </select>
        </div>

        {formData.rol === 'administrador' && (
          <div className="form-group">
            <label htmlFor="nivel_acceso">Nivel de Acceso *</label>
            <select
              id="nivel_acceso"
              value={formData.nivel_acceso}
              onChange={(e) => setFormData({ ...formData, nivel_acceso: e.target.value })}
              required
              disabled={loading}
            >
              <option value="">Seleccionar nivel</option>
              <option value="3">Nivel 3 - Administrador del Sistema</option>
              <option value="1">Nivel 1 - Administrativo</option>
            </select>
          </div>
        )}

        {formData.rol === 'estudiante' && (
          <>
            <div className="form-group">
              <label htmlFor="semestre">Semestre *</label>
              <input
                id="semestre"
                type="text"
                value={formData.semestre}
                onChange={(e) => setFormData({ ...formData, semestre: e.target.value })}
                required
                disabled={loading}
                placeholder="2025/1"
              />
              <small className="form-hint">
                Formato: año/semestre (ejemplo: 2025/1 o 2025/2). Por defecto: {getDefaultSemestre()}
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="id_grupo">Grupo (opcional)</label>
              <select
                id="id_grupo"
                value={formData.id_grupo}
                onChange={(e) => setFormData({ ...formData, id_grupo: e.target.value })}
                disabled={loading}
              >
                <option value="">Seleccionar grupo (opcional)</option>
                {grupos.map((g) => (
                  <option key={g.id_grupo} value={g.id_grupo}>
                    {g.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="fecha_desactivacion_automatica">
                Fecha de Desactivación Automática
                <small className="form-hint-inline"> (Opcional)</small>
              </label>
              <input
                id="fecha_desactivacion_automatica"
                type="text"
                value={formData.fecha_desactivacion_automatica}
                onChange={(e) => handleFechaChange(e.target.value)}
                placeholder="dd/mm/aaaa"
                maxLength={10}
                disabled={loading}
                style={{ fontFamily: 'monospace' }}
              />
              <small className="form-hint">
                Formato: dd/mm/aaaa (ejemplo: 15/05/2025). El usuario se desactivará automáticamente en esta fecha. Por defecto: 4 meses después de la creación.
              </small>
            </div>
          </>
        )}

        <button type="submit" disabled={loading} className="submit-btn">
          {loading ? 'Creando...' : '👤 Crear Usuario'}
        </button>
      </form>
    </div>
  );
}

