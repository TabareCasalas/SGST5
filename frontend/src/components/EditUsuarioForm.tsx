import { useState, useEffect } from 'react';
import { ApiService } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { formatDate } from '../utils/dateFormatter';
import { validateCI, cleanCI } from '../utils/ciValidator';
import './CreateUsuarioForm.css';

interface Grupo {
  id_grupo: number;
  nombre: string;
  descripcion?: string;
}

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
  usuario: Usuario;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function EditUsuarioForm({ usuario, onSuccess, onCancel }: Props) {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [ciError, setCiError] = useState<string>('');
  const { showToast } = useToast();

  // Form data
  const [formData, setFormData] = useState({
    nombre: '',
    ci: '',
    domicilios: [''],
    telefonos: [''],
    correos: [''],
    rol: 'estudiante',
    nivel_acceso: '',
    semestre: '',
    id_grupo: '',
    fecha_desactivacion_automatica: '',
  });

  useEffect(() => {
    loadGrupos();
    loadUsuarioData();
  }, [usuario]);

  const loadGrupos = async () => {
    try {
      const data = await ApiService.getGrupos();
      setGrupos(data.filter((g: Grupo) => g.id_grupo));
    } catch (err) {
      console.error('Error cargando grupos:', err);
    }
  };

  const loadUsuarioData = async () => {
    try {
      setLoadingData(true);
      const usuarioData = await ApiService.getUsuarioById(usuario.id_usuario);
      
      // Parsear domicilios, telefonos y correos (separados por |)
      const domicilios = usuarioData.domicilio ? usuarioData.domicilio.split('|').filter((d: string) => d.trim()) : [''];
      const telefonos = usuarioData.telefono ? usuarioData.telefono.split('|').filter((t: string) => t.trim()) : [''];
      const correos = usuarioData.correo ? [usuarioData.correo] : [''];
      
      // Si hay correos adicionales, agregarlos
      if (usuarioData.correos_adicionales) {
        const correosAdicionales = usuarioData.correos_adicionales.split('|').filter((c: string) => c.trim());
        correos.push(...correosAdicionales);
      }
      
      // Formatear fecha de desactivación automática
      let fechaDesactivacion = '';
      if (usuarioData.fecha_desactivacion_automatica) {
        fechaDesactivacion = formatDate(usuarioData.fecha_desactivacion_automatica);
      }

      setFormData({
        nombre: usuarioData.nombre || '',
        ci: usuarioData.ci || '',
        domicilios: domicilios.length > 0 ? domicilios : [''],
        telefonos: telefonos.length > 0 ? telefonos : [''],
        correos: correos.length > 0 ? correos : [''],
        rol: usuarioData.rol || 'estudiante',
        nivel_acceso: usuarioData.nivel_acceso ? usuarioData.nivel_acceso.toString() : '',
        semestre: usuarioData.semestre || '',
        id_grupo: '',
        fecha_desactivacion_automatica: fechaDesactivacion,
      });
    } catch (err: any) {
      showToast('Error al cargar datos del usuario: ' + err.message, 'error');
    } finally {
      setLoadingData(false);
    }
  };

  // Convertir fecha de formato dd/mm/aaaa a ISO (yyyy-mm-dd) para el backend
  const fechaToISO = (fechaStr: string): string => {
    if (!fechaStr) return '';
    const partes = fechaStr.split('/');
    if (partes.length === 3) {
      const [dia, mes, año] = partes;
      return `${año}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
    }
    return fechaStr;
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
    
    if (mesNum < 1 || mesNum > 12) return false;
    if (diaNum < 1 || diaNum > 31) return false;
    if (añoNum < 1900 || añoNum > 2100) return false;
    
    const fecha = new Date(añoNum, mesNum - 1, diaNum);
    return fecha.getDate() === diaNum && 
           fecha.getMonth() === mesNum - 1 && 
           fecha.getFullYear() === añoNum;
  };

  // Formatear fecha mientras se escribe (dd/mm/aaaa)
  const handleFechaChange = (value: string) => {
    let cleaned = value.replace(/[^\d/]/g, '');
    if (cleaned.length > 10) cleaned = cleaned.substring(0, 10);
    
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

      const domicilio = domiciliosFiltrados.join('|');
      const telefono = telefonosFiltrados.join('|');
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
        ci: formData.ci !== usuario.ci ? cleanCI(formData.ci) : formData.ci, // Usar CI limpia si cambió
        domicilio: domicilio,
        telefono: telefono,
        correo: correo,
        rol: formData.rol,
      };

      if (correosAdicionales.length > 0) {
        data.correos_adicionales = correosAdicionales.join('|');
      }

      if (formData.rol === 'administrador' && formData.nivel_acceso) {
        data.nivel_acceso = parseInt(formData.nivel_acceso);
      }

      if (formData.rol === 'estudiante') {
        if (formData.semestre) {
          data.semestre = formData.semestre;
        }
        if (formData.fecha_desactivacion_automatica) {
          if (!validarFecha(formData.fecha_desactivacion_automatica)) {
            showToast('La fecha de desactivación debe tener el formato dd/mm/aaaa (ejemplo: 15/05/2025)', 'error');
            setLoading(false);
            return;
          }
          const fechaISO = fechaToISO(formData.fecha_desactivacion_automatica);
          if (fechaISO) {
            data.fecha_desactivacion_automatica = fechaISO;
          }
        } else {
          data.fecha_desactivacion_automatica = null;
        }
      } else {
        // Si no es estudiante, eliminar fecha de desactivación
        data.fecha_desactivacion_automatica = null;
      }

      await ApiService.updateUsuario(usuario.id_usuario, data);
      showToast('Usuario actualizado exitosamente', 'success');
      
      if (onSuccess) onSuccess();
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return <div className="loading-message">Cargando datos del usuario...</div>;
  }

  return (
    <div className="create-usuario-container">
      <h2>✏️ Editar Usuario</h2>

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
                semestre: nuevoRol === 'estudiante' ? formData.semestre : '', 
                nivel_acceso: nuevoRol === 'administrador' ? formData.nivel_acceso : '',
                fecha_desactivacion_automatica: nuevoRol === 'estudiante' ? formData.fecha_desactivacion_automatica : ''
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
                Formato: año/semestre (ejemplo: 2025/1 o 2025/2)
              </small>
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
                Formato: dd/mm/aaaa (ejemplo: 15/05/2025). Dejar vacío para eliminar la fecha de desactivación automática.
              </small>
            </div>
          </>
        )}

        <div className="form-actions">
          {onCancel && (
            <button type="button" onClick={onCancel} disabled={loading} className="cancel-btn">
              Cancelar
            </button>
          )}
          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? 'Guardando...' : '💾 Guardar Cambios'}
          </button>
        </div>
      </form>
    </div>
  );
}

