import { useState, useEffect } from 'react';
import { ApiService } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { FaCheckCircle, FaTimesCircle, FaClock, FaEye } from 'react-icons/fa';
import { formatDate } from '../utils/dateFormatter';
import './SolicitudesReactivacionList.css';

interface SolicitudReactivacion {
  id_solicitud: number;
  id_usuario: number;
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  motivo?: string;
  respuesta?: string;
  created_at: string;
  updated_at: string;
  usuario: {
    id_usuario: number;
    nombre: string;
    ci: string;
    correo: string;
    rol: string;
    semestre?: string;
    fecha_desactivacion_automatica?: string;
  };
  administrador?: {
    id_usuario: number;
    nombre: string;
  };
}

interface Props {
  onSolicitudProcesada?: () => void;
}

export function SolicitudesReactivacionList({ onSolicitudProcesada }: Props = {}) {
  const [solicitudes, setSolicitudes] = useState<SolicitudReactivacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<string>('');
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<SolicitudReactivacion | null>(null);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [accionModal, setAccionModal] = useState<'aprobar' | 'rechazar'>('aprobar');
  const [respuesta, setRespuesta] = useState('');
  const [fechaDesactivacion, setFechaDesactivacion] = useState('');
  const [necesitaNuevaFecha, setNecesitaNuevaFecha] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    loadSolicitudes();
  }, [filtroEstado]);

  const loadSolicitudes = async () => {
    try {
      setLoading(true);
      const data = await ApiService.getSolicitudesReactivacion(
        filtroEstado || undefined
      );
      setSolicitudes(data);
    } catch (error: any) {
      showToast('Error al cargar solicitudes: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Calcular fecha por defecto (4 meses después) en formato dd/mm/aaaa
  const getDefaultDesactivacionDate = () => {
    const fecha = new Date();
    fecha.setMonth(fecha.getMonth() + 4);
    const day = fecha.getDate().toString().padStart(2, '0');
    const month = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const year = fecha.getFullYear().toString();
    return `${day}/${month}/${year}`;
  };

  // Validar formato de fecha dd/mm/aaaa
  const validarFecha = (fechaStr: string): boolean => {
    const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    if (!regex.test(fechaStr)) return false;
    
    const [, day, month, year] = fechaStr.match(regex)!;
    const dayNum = parseInt(day, 10);
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);
    
    if (monthNum < 1 || monthNum > 12) return false;
    if (dayNum < 1 || dayNum > 31) return false;
    
    const fecha = new Date(yearNum, monthNum - 1, dayNum);
    return fecha.getDate() === dayNum && 
           fecha.getMonth() === monthNum - 1 && 
           fecha.getFullYear() === yearNum;
  };

  // Convertir fecha de formato dd/mm/aaaa a ISO (yyyy-mm-dd) para el backend
  const fechaToISO = (fechaStr: string): string | null => {
    if (!validarFecha(fechaStr)) return null;
    const [day, month, year] = fechaStr.split('/');
    return `${year}-${month}-${day}`;
  };

  // Verificar si necesita nueva fecha de desactivación
  const verificarNecesitaNuevaFecha = (solicitud: SolicitudReactivacion): boolean => {
    if (solicitud.usuario.rol !== 'estudiante') return false;
    if (!solicitud.usuario.fecha_desactivacion_automatica) return true;
    
    const fechaActual = new Date();
    fechaActual.setHours(0, 0, 0, 0);
    
    const fechaDesactivacion = new Date(solicitud.usuario.fecha_desactivacion_automatica);
    fechaDesactivacion.setHours(0, 0, 0, 0);
    
    // Si la fecha es anterior o igual a hoy, necesita nueva fecha
    return fechaDesactivacion <= fechaActual;
  };

  const handleProcesar = (solicitud: SolicitudReactivacion, accion: 'aprobar' | 'rechazar') => {
    setSolicitudSeleccionada(solicitud);
    setAccionModal(accion);
    setRespuesta('');
    
    // Si es aprobar y es estudiante, verificar si necesita nueva fecha
    if (accion === 'aprobar' && solicitud.usuario.rol === 'estudiante') {
      const necesita = verificarNecesitaNuevaFecha(solicitud);
      setNecesitaNuevaFecha(necesita);
      if (necesita) {
        setFechaDesactivacion(getDefaultDesactivacionDate());
      } else {
        setFechaDesactivacion('');
      }
    } else {
      setNecesitaNuevaFecha(false);
      setFechaDesactivacion('');
    }
    
    setMostrarModal(true);
  };

  const handleFechaChange = (value: string) => {
    // Permitir solo números y barras
    let formatted = value.replace(/[^\d/]/g, '');
    
    // Limitar longitud
    if (formatted.length > 10) formatted = formatted.substring(0, 10);
    
    // Auto-formatear mientras se escribe
    if (formatted.length >= 3 && formatted[2] !== '/') {
      formatted = formatted.substring(0, 2) + '/' + formatted.substring(2);
    }
    if (formatted.length >= 6 && formatted[5] !== '/') {
      formatted = formatted.substring(0, 5) + '/' + formatted.substring(5);
    }
    
    setFechaDesactivacion(formatted);
  };

  const handleConfirmarProcesar = async () => {
    if (!solicitudSeleccionada) return;

    // Validar fecha si es necesaria
    if (accionModal === 'aprobar' && necesitaNuevaFecha && solicitudSeleccionada.usuario.rol === 'estudiante') {
      if (!fechaDesactivacion || !validarFecha(fechaDesactivacion)) {
        showToast('La fecha de desactivación debe tener el formato dd/mm/aaaa (ejemplo: 15/05/2025)', 'error');
        return;
      }
    }

    setProcesando(true);
    try {
      const fechaISO = necesitaNuevaFecha && fechaDesactivacion 
        ? fechaToISO(fechaDesactivacion) 
        : undefined;
      
      await ApiService.procesarSolicitudReactivacion(
        solicitudSeleccionada.id_solicitud,
        accionModal,
        respuesta.trim() || undefined,
        fechaISO || undefined
      );
      showToast(
        `Solicitud ${accionModal === 'aprobar' ? 'aprobada' : 'rechazada'} exitosamente`,
        'success'
      );
      setMostrarModal(false);
      setSolicitudSeleccionada(null);
      setRespuesta('');
      setFechaDesactivacion('');
      setNecesitaNuevaFecha(false);
      loadSolicitudes();
      if (onSolicitudProcesada) {
        onSolicitudProcesada();
      }
    } catch (error: any) {
      showToast('Error: ' + error.message, 'error');
    } finally {
      setProcesando(false);
    }
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return <span className="badge badge-pendiente"><FaClock /> Pendiente</span>;
      case 'aprobada':
        return <span className="badge badge-aprobada"><FaCheckCircle /> Aprobada</span>;
      case 'rechazada':
        return <span className="badge badge-rechazada"><FaTimesCircle /> Rechazada</span>;
      default:
        return <span className="badge">{estado}</span>;
    }
  };

  const getRoleLabel = (rol: string) => {
    const labels: Record<string, string> = {
      estudiante: 'Estudiante',
      docente: 'Docente',
      consultante: 'Consultante',
      administrador: 'Administrador',
    };
    return labels[rol] || rol;
  };

  if (loading) {
    return <div className="solicitudes-loading">Cargando solicitudes...</div>;
  }

  const solicitudesPendientes = solicitudes.filter(s => s.estado === 'pendiente').length;

  return (
    <div className="solicitudes-reactivacion-list">
      <div className="list-header">
        <div>
          <h3>Solicitudes de Reactivación</h3>
          {solicitudesPendientes > 0 && (
            <div className="pending-badge">
              {solicitudesPendientes} {solicitudesPendientes === 1 ? 'solicitud pendiente' : 'solicitudes pendientes'}
            </div>
          )}
        </div>
        <div className="filters">
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
          >
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendientes</option>
            <option value="aprobada">Aprobadas</option>
            <option value="rechazada">Rechazadas</option>
          </select>
        </div>
      </div>

      <div className="table-container">
        <table className="solicitudes-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Usuario</th>
              <th>CI</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Fecha Solicitud</th>
              <th>Procesada Por</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {solicitudes.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty-state">
                  No se encontraron solicitudes
                </td>
              </tr>
            ) : (
              solicitudes.map((solicitud) => (
                <tr key={solicitud.id_solicitud}>
                  <td>{solicitud.id_solicitud}</td>
                  <td>{solicitud.usuario.nombre}</td>
                  <td>{solicitud.usuario.ci}</td>
                  <td>
                    {getRoleLabel(solicitud.usuario.rol)}
                    {solicitud.usuario.semestre && ` (${solicitud.usuario.semestre})`}
                  </td>
                  <td>{getEstadoBadge(solicitud.estado)}</td>
                  <td>{formatDate(solicitud.created_at)}</td>
                  <td>
                    {solicitud.administrador ? solicitud.administrador.nombre : '-'}
                  </td>
                  <td>
                    <div className="action-buttons">
                      {solicitud.estado === 'pendiente' && (
                        <>
                          <button
                            className="btn-action btn-approve"
                            onClick={() => handleProcesar(solicitud, 'aprobar')}
                            title="Aprobar solicitud"
                          >
                            <FaCheckCircle /> Aprobar
                          </button>
                          <button
                            className="btn-action btn-reject"
                            onClick={() => handleProcesar(solicitud, 'rechazar')}
                            title="Rechazar solicitud"
                          >
                            <FaTimesCircle /> Rechazar
                          </button>
                        </>
                      )}
                      <button
                        className="btn-action btn-view"
                        onClick={() => {
                          setSolicitudSeleccionada(solicitud);
                          setMostrarModal(true);
                        }}
                        title="Ver detalles"
                      >
                        <FaEye /> Ver
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal para procesar/ver solicitud */}
      {mostrarModal && solicitudSeleccionada && (
        <div className="modal-overlay" onClick={() => !procesando && setMostrarModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {solicitudSeleccionada.estado === 'pendiente' 
                  ? (accionModal === 'aprobar' ? 'Aprobar Solicitud' : 'Rechazar Solicitud')
                  : 'Detalles de la Solicitud'}
              </h2>
              <button
                className="close-btn"
                onClick={() => !procesando && setMostrarModal(false)}
                disabled={procesando}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="solicitud-info">
                <div className="info-row">
                  <span className="info-label">Usuario:</span>
                  <span className="info-value">{solicitudSeleccionada.usuario.nombre}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">CI:</span>
                  <span className="info-value">{solicitudSeleccionada.usuario.ci}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Correo:</span>
                  <span className="info-value">{solicitudSeleccionada.usuario.correo}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Rol:</span>
                  <span className="info-value">
                    {getRoleLabel(solicitudSeleccionada.usuario.rol)}
                    {solicitudSeleccionada.usuario.semestre && ` (${solicitudSeleccionada.usuario.semestre})`}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Estado:</span>
                  <span className="info-value">{getEstadoBadge(solicitudSeleccionada.estado)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Fecha de Solicitud:</span>
                  <span className="info-value">{formatDate(solicitudSeleccionada.created_at)}</span>
                </div>
                {solicitudSeleccionada.usuario.rol === 'estudiante' && solicitudSeleccionada.usuario.fecha_desactivacion_automatica && (
                  <div className="info-row">
                    <span className="info-label">Fecha de Desactivación Actual:</span>
                    <span className="info-value">{formatDate(solicitudSeleccionada.usuario.fecha_desactivacion_automatica)}</span>
                  </div>
                )}
                {solicitudSeleccionada.motivo && (
                  <div className="info-row-full">
                    <span className="info-label">Motivo:</span>
                    <div className="info-value-box">{solicitudSeleccionada.motivo}</div>
                  </div>
                )}
                {solicitudSeleccionada.respuesta && (
                  <div className="info-row-full">
                    <span className="info-label">Respuesta del Administrador:</span>
                    <div className="info-value-box">{solicitudSeleccionada.respuesta}</div>
                  </div>
                )}
                {solicitudSeleccionada.administrador && (
                  <div className="info-row">
                    <span className="info-label">Procesada Por:</span>
                    <span className="info-value">{solicitudSeleccionada.administrador.nombre}</span>
                  </div>
                )}
              </div>

              {solicitudSeleccionada.estado === 'pendiente' && (
                <>
                  {accionModal === 'aprobar' && necesitaNuevaFecha && solicitudSeleccionada.usuario.rol === 'estudiante' && (
                    <div className="form-group">
                      <label htmlFor="fecha_desactivacion">
                        Nueva Fecha de Desactivación Automática *
                      </label>
                      <input
                        id="fecha_desactivacion"
                        type="text"
                        value={fechaDesactivacion}
                        onChange={(e) => handleFechaChange(e.target.value)}
                        placeholder="dd/mm/aaaa"
                        maxLength={10}
                        disabled={procesando}
                        style={{ fontFamily: 'monospace' }}
                        required
                      />
                      <small className="form-hint">
                        Formato: dd/mm/aaaa (ejemplo: 15/05/2025). La fecha actual de desactivación es anterior a hoy, por lo que debe establecer una nueva fecha. Por defecto: 4 meses después de la reactivación.
                      </small>
                    </div>
                  )}
                  <div className="form-group">
                    <label htmlFor="respuesta">
                      {accionModal === 'aprobar' ? 'Observación (Opcional)' : 'Motivo del Rechazo (Opcional)'}
                    </label>
                    <textarea
                      id="respuesta"
                      value={respuesta}
                      onChange={(e) => setRespuesta(e.target.value)}
                      placeholder={accionModal === 'aprobar' 
                        ? 'Agregar una observación opcional...'
                        : 'Explicar el motivo del rechazo...'}
                      rows={4}
                      disabled={procesando}
                    />
                  </div>
                </>
              )}
            </div>
            <div className="modal-actions">
              <button
                className="btn-cancel"
                onClick={() => setMostrarModal(false)}
                disabled={procesando}
              >
                {solicitudSeleccionada.estado === 'pendiente' ? 'Cancelar' : 'Cerrar'}
              </button>
              {solicitudSeleccionada.estado === 'pendiente' && (
                <button
                  className={accionModal === 'aprobar' ? 'btn-approve' : 'btn-reject'}
                  onClick={handleConfirmarProcesar}
                  disabled={procesando}
                >
                  {procesando 
                    ? 'Procesando...' 
                    : accionModal === 'aprobar' 
                      ? 'Aprobar Solicitud' 
                      : 'Rechazar Solicitud'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

