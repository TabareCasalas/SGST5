import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { ApiService } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { FaPlus, FaFileExcel, FaSync, FaEdit, FaTrash, FaEye, FaCheckCircle, FaTimesCircle, FaChevronDown, FaChevronUp, FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaCalendarAlt, FaUsers } from 'react-icons/fa';
import { CreateUsuarioModal } from './CreateUsuarioModal';
import { EditUsuarioModal } from './EditUsuarioModal';
import { ImportUsuariosModal } from './ImportUsuariosModal';
import { ConfirmUsuarioModal } from './ConfirmUsuarioModal';
import { ConfirmDeleteUsuarioModal } from './ConfirmDeleteUsuarioModal';
import { SolicitudesReactivacionList } from './SolicitudesReactivacionList';
import { formatDate } from '../utils/dateFormatter';
import './UsuariosList.css';

// Componente memoizado para el input de búsqueda
const SearchInput = memo(({ value, onChange, inputRef }: { value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; inputRef: React.RefObject<HTMLInputElement> }) => {
  return (
    <input
      ref={inputRef}
      type="text"
      placeholder="Buscar por nombre, CI o correo..."
      value={value}
      onChange={onChange}
      className="search-input"
      autoComplete="off"
    />
  );
}, (prevProps, nextProps) => {
  // Solo re-renderizar si el valor cambia
  return prevProps.value === nextProps.value;
});

SearchInput.displayName = 'SearchInput';

interface Usuario {
  id_usuario: number;
  nombre: string;
  ci: string;
  correo: string;
  domicilio?: string;
  telefono?: string;
  rol: string;
  nivel_acceso?: number;
  activo: boolean;
  semestre?: string;
  fecha_desactivacion_automatica?: string;
  created_at?: string;
  updated_at?: string;
  grupos_participa?: Array<{
    grupo: {
      id_grupo: number;
      nombre: string;
    };
    rol_en_grupo: string;
  }>;
}

export function UsuariosList() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [usuarioEditar, setUsuarioEditar] = useState<Usuario | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSolicitudes, setShowSolicitudes] = useState(false);
  const [solicitudesPendientes, setSolicitudesPendientes] = useState(0);
  const [usuarioConfirmar, setUsuarioConfirmar] = useState<Usuario | null>(null);
  const [usuarioEliminar, setUsuarioEliminar] = useState<Usuario | null>(null);
  const [accionConfirmar, setAccionConfirmar] = useState<'activar' | 'desactivar'>('desactivar');
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [usuariosDetallados, setUsuariosDetallados] = useState<Map<number, Usuario>>(new Map());
  const [filters, setFilters] = useState({
    rol: '',
    activo: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  const { hasAccessLevel, hasRole, user } = useAuth();

  // Debounce para la búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadSolicitudesPendientes = useCallback(async () => {
    try {
      const solicitudes = await ApiService.getSolicitudesReactivacion('pendiente');
      setSolicitudesPendientes(solicitudes.length);
    } catch (error) {
      // Silenciar error, no es crítico
      console.error('Error al cargar solicitudes pendientes:', error);
    }
  }, []);

  const loadUsuarios = useCallback(async () => {
    // Guardar si el input tenía foco antes de cargar
    const hadFocus = document.activeElement === searchInputRef.current;
    
    try {
      setLoading(true);
      const data = await ApiService.getUsuarios({
        rol: filters.rol || undefined,
        activo: filters.activo === 'true' ? true : filters.activo === 'false' ? false : undefined,
        search: debouncedSearchTerm || undefined,
      });
      setUsuarios(data);
    } catch (error: any) {
      showToast('Error al cargar usuarios: ' + error.message, 'error');
    } finally {
      setLoading(false);
      // Restaurar el foco si lo tenía antes
      if (hadFocus && searchInputRef.current) {
        setTimeout(() => {
          searchInputRef.current?.focus();
          // Restaurar la posición del cursor al final del texto
          const length = searchInputRef.current.value.length;
          searchInputRef.current.setSelectionRange(length, length);
        }, 0);
      }
    }
  }, [filters.rol, filters.activo, debouncedSearchTerm, showToast]);

  useEffect(() => {
    loadUsuarios();
    loadSolicitudesPendientes();
    // Actualizar contador cada 30 segundos
    const interval = setInterval(() => {
      loadSolicitudesPendientes();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadUsuarios, loadSolicitudesPendientes]);

  const toggleRow = async (id: number) => {
    const newExpanded = new Set(expandedRows);
    if (expandedRows.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
      // Si no tenemos los detalles del usuario, cargarlos
      if (!usuariosDetallados.has(id)) {
        try {
          const usuarioDetallado = await ApiService.getUsuarioById(id);
          setUsuariosDetallados(prev => new Map(prev).set(id, usuarioDetallado));
        } catch (error: any) {
          showToast('Error al cargar detalles del usuario: ' + error.message, 'error');
        }
      }
    }
    setExpandedRows(newExpanded);
  };

  const handleToggleActivo = (usuario: Usuario) => {
    setUsuarioConfirmar(usuario);
    setAccionConfirmar(usuario.activo ? 'desactivar' : 'activar');
    setShowConfirmModal(true);
  };

  const handleConfirmAction = async () => {
    if (!usuarioConfirmar) return;

    setConfirmLoading(true);
    try {
      if (accionConfirmar === 'desactivar') {
        await ApiService.deactivateUsuario(usuarioConfirmar.id_usuario);
        showToast(`Usuario "${usuarioConfirmar.nombre}" desactivado exitosamente`, 'success');
      } else {
        await ApiService.activateUsuario(usuarioConfirmar.id_usuario);
        showToast(`Usuario "${usuarioConfirmar.nombre}" activado exitosamente`, 'success');
      }
      setShowConfirmModal(false);
      setUsuarioConfirmar(null);
      loadUsuarios();
    } catch (error: any) {
      showToast('Error: ' + error.message, 'error');
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleCloseConfirmModal = () => {
    if (!confirmLoading) {
      setShowConfirmModal(false);
      setUsuarioConfirmar(null);
    }
  };

  const getRoleLabel = (rol: string, nivel_acceso?: number) => {
    const labels: Record<string, string> = {
      estudiante: 'Estudiante',
      docente: 'Docente',
      consultante: 'Consultante',
      administrador: nivel_acceso === 3 ? 'Administrador Sistema' : 'Administrativo',
    };
    return labels[rol] || rol;
  };

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  return (
    <div className="usuarios-list">
      <div className="list-header">
        <div>
          <div className="filters">
          <SearchInput
            value={searchTerm}
            onChange={handleSearchChange}
            inputRef={searchInputRef}
          />
          <select
            value={filters.rol}
            onChange={(e) => setFilters({ ...filters, rol: e.target.value })}
          >
            <option value="">Todos los roles</option>
            <option value="estudiante">Estudiante</option>
            <option value="docente">Docente</option>
            <option value="consultante">Consultante</option>
            <option value="administrador">Administrador</option>
          </select>
          <select
            value={filters.activo}
            onChange={(e) => setFilters({ ...filters, activo: e.target.value })}
          >
            <option value="">Todos</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>
          </div>
        </div>
        <div className="header-actions">
          {hasRole('admin') && hasAccessLevel(1) && (
            <>
              <button
                className="btn-solicitudes"
                onClick={() => setShowSolicitudes(!showSolicitudes)}
                title="Ver solicitudes de reactivación"
              >
                <FaSync /> Solicitudes de Reactivación
                {solicitudesPendientes > 0 && (
                  <span className="badge-count">{solicitudesPendientes}</span>
                )}
              </button>
              <button
                className="btn-create"
                onClick={() => setShowCreateForm(true)}
                title="Crear nuevo usuario"
              >
                <FaPlus /> Crear Usuario
              </button>
              <button
                className="btn-import"
                onClick={() => setShowImportModal(true)}
                title="Importar usuarios desde Excel"
              >
                <FaFileExcel /> Importar Excel
              </button>
            </>
          )}
        </div>
      </div>

      {/* Sección de Solicitudes de Reactivación */}
      {showSolicitudes && hasRole('admin') && hasAccessLevel(1) && (
        <div className="solicitudes-section">
          <SolicitudesReactivacionList 
            onSolicitudProcesada={() => {
              loadSolicitudesPendientes();
              loadUsuarios();
            }}
          />
        </div>
      )}

      {loading && usuarios.length === 0 ? (
        <div className="usuarios-list-loading">Cargando usuarios...</div>
      ) : (
        <div className="table-container">
          <table className="usuarios-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.length === 0 ? (
                <tr>
                  <td colSpan={5} className="empty-state">
                    No se encontraron usuarios
                  </td>
                </tr>
              ) : (
                usuarios.map((usuario) => {
                const usuarioDetallado = usuariosDetallados.get(usuario.id_usuario) || usuario;
                return (
                  <>
                    <tr key={usuario.id_usuario} className="usuario-row">
                      <td>{usuario.id_usuario}</td>
                      <td>
                        <div className="user-info">
                          <FaUser />
                          <span>{usuario.nombre}</span>
                        </div>
                      </td>
                      <td>{getRoleLabel(usuario.rol, usuario.nivel_acceso)}</td>
                      <td>
                        <span className={`status-badge ${usuario.activo ? 'active' : 'inactive'}`}>
                          {usuario.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            onClick={() => toggleRow(usuario.id_usuario)}
                            className="btn-icon"
                            title="Ver detalles"
                          >
                            {expandedRows.has(usuario.id_usuario) ? <FaChevronUp /> : <FaChevronDown />}
                          </button>
                          {hasRole('admin') && hasAccessLevel(1) && (
                            <>
                              <button
                                onClick={() => {
                                  setUsuarioEditar(usuarioDetallado);
                                  setShowEditModal(true);
                                }}
                                className="btn-icon btn-edit"
                                title="Editar usuario"
                              >
                                <FaEdit />
                              </button>
                              {usuario.id_usuario === user?.id_usuario && usuario.activo ? (
                                <span className="text-muted" title="No puede desactivar su propia cuenta">
                                  -
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleToggleActivo(usuario)}
                                  className={`btn-icon ${usuario.activo ? 'btn-danger' : 'btn-success'}`}
                                  title={usuario.activo ? 'Desactivar usuario' : 'Activar usuario'}
                                >
                                  {usuario.activo ? <FaTimesCircle /> : <FaCheckCircle />}
                                </button>
                              )}
                              {usuario.id_usuario !== user?.id_usuario && (
                                <button
                                  onClick={() => {
                                    setUsuarioEliminar(usuario);
                                    setShowDeleteModal(true);
                                  }}
                                  className="btn-icon btn-danger"
                                  title="Eliminar usuario"
                                >
                                  <FaTrash />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedRows.has(usuario.id_usuario) && (
                      <tr className="usuario-details-row">
                        <td colSpan={5}>
                          <div className="usuario-details">
                            <div className="details-grid">
                              <div className="detail-item">
                                <strong>ID:</strong>
                                <span>{usuarioDetallado.id_usuario}</span>
                              </div>
                              <div className="detail-item">
                                <strong>Nombre:</strong>
                                <span>{usuarioDetallado.nombre}</span>
                              </div>
                              <div className="detail-item">
                                <strong>Cédula de Identidad:</strong>
                                <span>{usuarioDetallado.ci}</span>
                              </div>
                              <div className="detail-item">
                                <strong>Rol:</strong>
                                <span>{getRoleLabel(usuarioDetallado.rol, usuarioDetallado.nivel_acceso)}</span>
                              </div>
                              <div className="detail-item">
                                <strong>Estado:</strong>
                                <span className={`status-badge ${usuarioDetallado.activo ? 'active' : 'inactive'}`}>
                                  {usuarioDetallado.activo ? 'Activo' : 'Inactivo'}
                                </span>
                              </div>
                              {usuarioDetallado.correo && (
                                <div className="detail-item">
                                  <strong><FaEnvelope /> Correo Electrónico:</strong>
                                  <span>{usuarioDetallado.correo}</span>
                                </div>
                              )}
                              {usuarioDetallado.telefono && (
                                <div className="detail-item">
                                  <strong><FaPhone /> Teléfono(s):</strong>
                                  <span>{usuarioDetallado.telefono.split('|').join(', ')}</span>
                                </div>
                              )}
                              {usuarioDetallado.domicilio && (
                                <div className="detail-item">
                                  <strong><FaMapMarkerAlt /> Domicilio(s):</strong>
                                  <span>{usuarioDetallado.domicilio.split('|').join(', ')}</span>
                                </div>
                              )}
                              {usuarioDetallado.semestre && (
                                <div className="detail-item">
                                  <strong>Semestre:</strong>
                                  <span>{usuarioDetallado.semestre}</span>
                                </div>
                              )}
                              {usuarioDetallado.fecha_desactivacion_automatica && (
                                <div className="detail-item">
                                  <strong><FaCalendarAlt /> Fecha de Desactivación Automática:</strong>
                                  <span>{formatDate(usuarioDetallado.fecha_desactivacion_automatica)}</span>
                                </div>
                              )}
                              {usuarioDetallado.grupos_participa && usuarioDetallado.grupos_participa.length > 0 && (
                                <div className="detail-item full-width">
                                  <strong><FaUsers /> Grupos:</strong>
                                  <div className="grupos-list">
                                    {usuarioDetallado.grupos_participa.map((ug, idx) => (
                                      <span key={idx} className="grupo-badge">
                                        {ug.grupo.nombre} ({ug.rol_en_grupo})
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {usuarioDetallado.created_at && (
                                <div className="detail-item">
                                  <strong>Creado:</strong>
                                  <span>{formatDate(usuarioDetallado.created_at)}</span>
                                </div>
                              )}
                              {usuarioDetallado.updated_at && (
                                <div className="detail-item">
                                  <strong>Actualizado:</strong>
                                  <span>{formatDate(usuarioDetallado.updated_at)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de creación */}
      <CreateUsuarioModal
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        onSuccess={loadUsuarios}
      />

      {/* Modal de edición */}
      <EditUsuarioModal
        isOpen={showEditModal}
        usuario={usuarioEditar}
        onClose={() => {
          setShowEditModal(false);
          setUsuarioEditar(null);
        }}
        onSuccess={loadUsuarios}
      />

      {/* Modal de importación */}
      <ImportUsuariosModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={loadUsuarios}
      />

      {/* Modal de confirmación */}
      <ConfirmUsuarioModal
        isOpen={showConfirmModal}
        onClose={handleCloseConfirmModal}
        onConfirm={handleConfirmAction}
        usuario={usuarioConfirmar ? { nombre: usuarioConfirmar.nombre, ci: usuarioConfirmar.ci } : null}
        accion={accionConfirmar}
        loading={confirmLoading}
      />

      {/* Modal de confirmación de eliminación */}
      <ConfirmDeleteUsuarioModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setUsuarioEliminar(null);
        }}
        onConfirm={async () => {
          if (!usuarioEliminar) return;
          
          setDeleteLoading(true);
          try {
            await ApiService.deleteUsuario(usuarioEliminar.id_usuario);
            showToast('Usuario eliminado exitosamente', 'success');
            setShowDeleteModal(false);
            setUsuarioEliminar(null);
            await loadUsuarios();
          } catch (err: any) {
            showToast(`Error al eliminar usuario: ${err.message}`, 'error');
          } finally {
            setDeleteLoading(false);
          }
        }}
        usuario={usuarioEliminar ? { nombre: usuarioEliminar.nombre, ci: usuarioEliminar.ci } : null}
        loading={deleteLoading}
      />
    </div>
  );
}





