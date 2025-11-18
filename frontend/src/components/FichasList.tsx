import { useEffect, useState, useCallback, useRef, memo } from 'react';
import type { JSX } from 'react';
import { ApiService } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  FaFileAlt, FaChevronDown, FaChevronUp, FaClock, FaCheckCircle, 
  FaUser, FaUsers, FaCalendarAlt, FaTrash, FaCommentAlt, FaSync,
  FaUserTie, FaEdit, FaHandPointer, FaSearch, FaTimes, FaPlus
} from 'react-icons/fa';
import { EditFichaModal } from './EditFichaModal';
import { AprobarFichaModal } from './AprobarFichaModal';
import { CreateFichaModal } from './CreateFichaModal';
import { formatDateTime } from '../utils/dateFormatter';
import './FichasList.css';

// Componente memoizado para el input de búsqueda
const SearchInput = memo(({ value, onChange, inputRef, placeholder }: { value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; inputRef: React.RefObject<HTMLInputElement>; placeholder: string }) => {
  return (
    <input
      ref={inputRef}
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className="search-input"
      autoComplete="off"
    />
  );
}, (prevProps, nextProps) => {
  return prevProps.value === nextProps.value;
});

SearchInput.displayName = 'SearchInput';

interface Ficha {
  id_ficha: number;
  id_consultante: number;
  fecha_cita: string;
  hora_cita?: string;
  tema_consulta: string;
  id_docente: number;
  numero_consulta: string;
  estado: 'pendiente' | 'standby' | 'asignada' | 'iniciada';
  id_grupo?: number;
  observaciones?: string;
  created_at: string;
  updated_at: string;
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
  grupo?: {
    id_grupo: number;
    nombre: string;
    descripcion?: string;
  };
}

interface Grupo {
  id_grupo: number;
  nombre: string;
  descripcion?: string;
  miembros_grupo?: Array<{
    id_usuario_grupo: number;
    rol_en_grupo: string;
    usuario: {
      id_usuario: number;
      nombre: string;
      ci: string;
      correo: string;
    };
  }>;
}

export function FichasList() {
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [filterEstado, setFilterEstado] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'mis' | 'otras' | 'todas'>('mis');
  const [showAsignarModal, setShowAsignarModal] = useState(false);
  const [fichaAsignar, setFichaAsignar] = useState<Ficha | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [fichaEditar, setFichaEditar] = useState<Ficha | null>(null);
  const [showAprobarModal, setShowAprobarModal] = useState(false);
  const [fichaAprobar, setFichaAprobar] = useState<Ficha | null>(null);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<string>('');
  const [grupoSeleccionadoInfo, setGrupoSeleccionadoInfo] = useState<Grupo | null>(null);
  const [loadingGrupoInfo, setLoadingGrupoInfo] = useState(false);
  const [asignando, setAsignando] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { showToast } = useToast();
  const { user, hasRole, hasAccessLevel } = useAuth();

  const loadFichas = useCallback(async () => {
    // Guardar si el input tenía foco antes de cargar
    const hadFocus = document.activeElement === searchInputRef.current;
    
    try {
      setLoading(true);
      let data: Ficha[];
      
      // Preparar filtros
      const filters: any = {};
      const hasSearch = searchTerm && searchTerm.trim() !== '';
      
      // Si hay búsqueda, siempre usar getFichas para aprovechar la búsqueda del backend
      // Si no hay búsqueda y el filtro es 'standby', usar getFichasStandby
      if (hasSearch || filterEstado !== 'standby') {
        if (filterEstado !== 'all' && filterEstado !== 'standby') {
          filters.estado = filterEstado;
        }
        if (hasSearch) {
          filters.search = searchTerm.trim();
        }
        // Si hay búsqueda o filtro diferente a standby, usar getFichas
        data = await ApiService.getFichas(filters);
      } else {
        // Sin búsqueda y filtro es 'standby', usar getFichasStandby
        data = await ApiService.getFichasStandby();
      }
      
      // Filtrar según rol y pestaña activa
      if (hasRole('docente')) {
        // Filtrar según la pestaña seleccionada
        if (activeTab === 'mis') {
          // Mis fichas: solo las asignadas a este docente (excluyendo pendientes)
          data = data.filter((f: Ficha) => 
            f.id_docente === user?.id_usuario && f.estado !== 'pendiente'
          );
        } else if (activeTab === 'otras') {
          // Otras fichas: asignadas a otros docentes (excluyendo pendientes)
          data = data.filter((f: Ficha) => 
            f.id_docente !== user?.id_usuario && f.estado !== 'pendiente'
          );
        } else if (activeTab === 'todas') {
          // Todas las fichas: todas excepto pendientes
          data = data.filter((f: Ficha) => f.estado !== 'pendiente');
        }
      }
      
      setFichas(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      showToast(`Error al cargar fichas: ${err.message}`, 'error');
    } finally {
      setLoading(false);
      // Restaurar el foco si lo tenía antes
      if (hadFocus && searchInputRef.current) {
        setTimeout(() => {
          searchInputRef.current?.focus();
          const length = searchInputRef.current.value.length;
          searchInputRef.current.setSelectionRange(length, length);
        }, 0);
      }
    }
  }, [filterEstado, searchTerm, activeTab, hasRole, hasAccessLevel, user, showToast]);

  useEffect(() => {
    loadFichas();
    if (hasRole('docente') || (hasRole('admin') && hasAccessLevel(1))) {
      loadGrupos();
    }
    // Auto-refresh cada 30 segundos
    const interval = setInterval(loadFichas, 30000);
    return () => clearInterval(interval);
  }, [loadFichas, hasRole, hasAccessLevel]);

  const toggleRow = (id: number) => {
    const newExpanded = new Set(expandedRows);
    if (expandedRows.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const loadGrupos = async () => {
    try {
      const data = await ApiService.getGrupos();
      // Los docentes pueden ver todos los grupos para asignar fichas
      // (tanto sus propios grupos como los de otros docentes)
      setGrupos(data);
    } catch (err: any) {
      showToast(`Error al cargar grupos: ${err.message}`, 'error');
    }
  };

  const handleAsignarAGrupo = (ficha: Ficha) => {
    if (ficha.estado !== 'standby') {
      showToast('Solo se pueden asignar fichas en estado "En Espera"', 'warning');
      return;
    }
    setFichaAsignar(ficha);
    setGrupoSeleccionado('');
    setGrupoSeleccionadoInfo(null);
    setShowAsignarModal(true);
  };

  const handleGrupoChange = async (grupoId: string) => {
    setGrupoSeleccionado(grupoId);
    if (grupoId) {
      try {
        setLoadingGrupoInfo(true);
        const grupoInfo = await ApiService.getGrupoById(parseInt(grupoId));
        setGrupoSeleccionadoInfo(grupoInfo);
      } catch (err: any) {
        showToast(`Error al cargar información del grupo: ${err.message}`, 'error');
        setGrupoSeleccionadoInfo(null);
      } finally {
        setLoadingGrupoInfo(false);
      }
    } else {
      setGrupoSeleccionadoInfo(null);
    }
  };

  const handleConfirmarAsignacion = async () => {
    if (!fichaAsignar || !grupoSeleccionado) {
      showToast('Por favor seleccione un grupo', 'warning');
      return;
    }

    setAsignando(true);
    try {
      await ApiService.asignarFichaAGrupo(fichaAsignar.id_ficha, parseInt(grupoSeleccionado));
      showToast('Ficha asignada al grupo exitosamente', 'success');
      setShowAsignarModal(false);
      setFichaAsignar(null);
      setGrupoSeleccionado('');
      await loadFichas();
    } catch (err: any) {
      showToast(`Error al asignar ficha: ${err.message}`, 'error');
    } finally {
      setAsignando(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar esta ficha? Solo se pueden eliminar fichas en estado "standby".')) return;
    
    try {
      await ApiService.deleteFicha(id);
      await loadFichas();
      showToast('Ficha eliminada exitosamente', 'success');
    } catch (err: any) {
      showToast(`Error al eliminar: ${err.message}`, 'error');
    }
  };

  const handleAprobarFicha = (ficha: Ficha) => {
    setFichaAprobar(ficha);
    setShowAprobarModal(true);
  };

  const handleEditFicha = (ficha: Ficha) => {
    setFichaEditar(ficha);
    setShowEditModal(true);
  };

  const getEstadoBadge = (estado: string) => {
    const estados: Record<string, { label: string; className: string; icon: JSX.Element }> = {
      pendiente: {
        label: 'Pendiente',
        className: 'badge-secondary',
        icon: <FaClock />
      },
      standby: {
        label: 'En Espera',
        className: 'badge-warning',
        icon: <FaClock />
      },
      asignada: {
        label: 'Asignada',
        className: 'badge-info',
        icon: <FaUsers />
      },
      iniciada: {
        label: 'Iniciada',
        className: 'badge-success',
        icon: <FaCheckCircle />
      }
    };

    const estadoInfo = estados[estado] || estados.standby;
    return (
      <span className={`badge ${estadoInfo.className}`}>
        {estadoInfo.icon}
        <span>{estadoInfo.label}</span>
      </span>
    );
  };

  const formatDate = (dateString: string, horaCita?: string) => {
    if (horaCita) {
      return formatDateTime(dateString, horaCita);
    }
    return formatDateTime(dateString);
  };

  if (loading && fichas.length === 0) {
    return (
      <div className="fichas-container">
        <div className="loading">Cargando fichas...</div>
      </div>
    );
  }

  if (error && fichas.length === 0) {
    return (
      <div className="fichas-container">
        <div className="error">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="fichas-container">
      <div className="fichas-header">
        <div>
          {hasRole('docente') && (
            <div className="tabs-container">
              <button
                className={`tab ${activeTab === 'mis' ? 'active' : ''}`}
                onClick={() => setActiveTab('mis')}
              >
                Mis Fichas
              </button>
              <button
                className={`tab ${activeTab === 'otras' ? 'active' : ''}`}
                onClick={() => setActiveTab('otras')}
              >
                Otras Fichas
              </button>
              <button
                className={`tab ${activeTab === 'todas' ? 'active' : ''}`}
                onClick={() => setActiveTab('todas')}
              >
                Todas las Fichas
              </button>
            </div>
          )}
        </div>
        <div className="header-actions">
          {hasRole('admin') && hasAccessLevel(1) && (
            <button
              className="btn-create"
              onClick={() => setShowCreateForm(true)}
              title="Crear nueva ficha"
            >
              <FaPlus /> Crear Ficha
            </button>
          )}
          <div className="search-container">
            <FaSearch className="search-icon" />
            <SearchInput
              inputRef={searchInputRef}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por número, consultante, docente, tema..."
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="clear-search-btn"
                title="Limpiar búsqueda"
              >
                <FaTimes />
              </button>
            )}
          </div>
          <select 
            value={filterEstado} 
            onChange={(e) => setFilterEstado(e.target.value)}
            className="filter-select"
          >
            <option value="all">Todas</option>
            <option value="pendiente">Pendientes</option>
            <option value="standby">En Espera</option>
            <option value="asignada">Asignadas</option>
            <option value="iniciada">Iniciadas</option>
          </select>
          <button onClick={loadFichas} className="refresh-btn" disabled={loading}>
            <FaSync className={loading ? 'spinning' : ''} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Modal de creación */}
      <CreateFichaModal
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        onSuccess={loadFichas}
      />

      {fichas.length === 0 ? (
        <div className="empty-state">
          <FaFileAlt size={48} />
          <p>No hay fichas disponibles</p>
        </div>
      ) : (
        <div className="fichas-table-container">
          <table className="fichas-table">
            <thead>
              <tr>
                <th>N° Consulta</th>
                <th>Consultante</th>
                <th>Fecha Cita</th>
                <th>Tema</th>
                <th>Docente</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {fichas.map((ficha) => (
                <>
                  <tr key={ficha.id_ficha} className="ficha-row">
                    <td>
                      <strong className="numero-consulta">{ficha.numero_consulta}</strong>
                    </td>
                    <td>
                      <div className="user-info">
                        <FaUser />
                        <span>{ficha.consultante.usuario.nombre}</span>
                        <small>CI: {ficha.consultante.usuario.ci}</small>
                      </div>
                    </td>
                    <td>
                      <div className="date-info">
                        <FaCalendarAlt />
                        <span>{formatDate(ficha.fecha_cita, ficha.hora_cita)}</span>
                      </div>
                    </td>
                    <td>
                      <div className="tema-info">
                        {ficha.tema_consulta.length > 50 
                          ? `${ficha.tema_consulta.substring(0, 50)}...` 
                          : ficha.tema_consulta}
                      </div>
                    </td>
                    <td>
                      <div className="user-info">
                        <FaUserTie />
                        <span>{ficha.docente.nombre}</span>
                      </div>
                    </td>
                    <td>{getEstadoBadge(ficha.estado)}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          onClick={() => toggleRow(ficha.id_ficha)}
                          className="btn-icon"
                          title="Ver detalles"
                        >
                          {expandedRows.has(ficha.id_ficha) ? <FaChevronUp /> : <FaChevronDown />}
                        </button>
                        {hasRole('admin') && hasAccessLevel(1) && (
                          <button
                            onClick={() => handleEditFicha(ficha)}
                            className="btn-icon btn-edit"
                            title="Editar Ficha"
                          >
                            <FaEdit />
                          </button>
                        )}
                        {ficha.estado === 'standby' && (hasRole('docente') || (hasRole('admin') && hasAccessLevel(1))) && (
                          <button
                            onClick={() => handleAsignarAGrupo(ficha)}
                            className="btn-icon btn-assign"
                            title="Asignar a Grupo"
                          >
                            <FaHandPointer />
                          </button>
                        )}
                        {ficha.estado === 'pendiente' && hasRole('admin') && (
                          <button
                            onClick={() => handleAprobarFicha(ficha)}
                            className="btn-icon btn-success"
                            title="Aprobar Ficha"
                          >
                            <FaCheckCircle />
                          </button>
                        )}
                        {ficha.estado === 'standby' && hasRole('admin') && hasAccessLevel(1) && (
                          <button
                            onClick={() => handleDelete(ficha.id_ficha)}
                            className="btn-icon btn-danger"
                            title="Eliminar"
                          >
                            <FaTrash />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedRows.has(ficha.id_ficha) && (
                    <tr className="ficha-details-row">
                      <td colSpan={7}>
                        <div className="ficha-details">
                          <div className="details-grid">
                            <div className="detail-item">
                              <strong>Número de Consulta:</strong>
                              <span>{ficha.numero_consulta}</span>
                            </div>
                            <div className="detail-item">
                              <strong>Estado:</strong>
                              {getEstadoBadge(ficha.estado)}
                            </div>
                            <div className="detail-item">
                              <strong>Consultante:</strong>
                              <span>
                                {ficha.consultante.usuario.nombre} - CI: {ficha.consultante.usuario.ci}
                              </span>
                            </div>
                            <div className="detail-item">
                              <strong>Fecha de Cita:</strong>
                              <span>{formatDate(ficha.fecha_cita, ficha.hora_cita)}</span>
                            </div>
                            <div className="detail-item">
                              <strong>Docente Asignado:</strong>
                              <span>
                                {ficha.docente.nombre} - {ficha.docente.correo}
                              </span>
                            </div>
                            {ficha.grupo && (
                              <div className="detail-item">
                                <strong>Grupo Asignado:</strong>
                                <span>{ficha.grupo.nombre}</span>
                              </div>
                            )}
                            <div className="detail-item full-width">
                              <strong>Tema de Consulta:</strong>
                              <p>{ficha.tema_consulta}</p>
                            </div>
                            {ficha.observaciones && (
                              <div className="detail-item full-width">
                                <strong>Observaciones:</strong>
                                <p>{ficha.observaciones}</p>
                              </div>
                            )}
                            <div className="detail-item">
                              <strong>Creada:</strong>
                              <span>{formatDate(ficha.created_at)}</span>
                            </div>
                            <div className="detail-item">
                              <strong>Actualizada:</strong>
                              <span>{formatDate(ficha.updated_at)}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal para asignar ficha a grupo */}
      {showAsignarModal && fichaAsignar && (
        <div className="modal-overlay" onClick={() => setShowAsignarModal(false)}>
          <div className={`modal-content ${grupoSeleccionadoInfo ? 'modal-with-members' : ''}`} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Asignar Ficha a Grupo</h3>
              <button 
                className="modal-close" 
                onClick={() => setShowAsignarModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="ficha-info-preview">
                <p><strong>Número de Consulta:</strong> {fichaAsignar.numero_consulta}</p>
                <p><strong>Consultante:</strong> {fichaAsignar.consultante.usuario.nombre}</p>
                <p><strong>Tema:</strong> {fichaAsignar.tema_consulta}</p>
              </div>
              <div className="form-group">
                <label htmlFor="grupo-select">Seleccione el Grupo *</label>
                <select
                  id="grupo-select"
                  value={grupoSeleccionado}
                  onChange={(e) => handleGrupoChange(e.target.value)}
                  className="form-select"
                  disabled={asignando}
                >
                  <option value="">Seleccione un grupo</option>
                  {grupos.map((grupo) => (
                    <option key={grupo.id_grupo} value={grupo.id_grupo}>
                      {grupo.nombre} {grupo.descripcion ? `- ${grupo.descripcion}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              
              {loadingGrupoInfo && (
                <div className="grupo-loading">
                  <p>Cargando información del grupo...</p>
                </div>
              )}
              
              {grupoSeleccionadoInfo && !loadingGrupoInfo && (
                <div className="grupo-members-preview">
                  <h4>Integrantes del Grupo: {grupoSeleccionadoInfo.nombre}</h4>
                  {grupoSeleccionadoInfo.miembros_grupo && grupoSeleccionadoInfo.miembros_grupo.length > 0 ? (
                    <div className="members-list">
                      {grupoSeleccionadoInfo.miembros_grupo
                        .filter((m: any) => m.rol_en_grupo === 'responsable')
                        .map((miembro: any) => (
                          <div key={miembro.id_usuario_grupo} className="member-item member-responsable">
                            <FaUserTie className="member-icon" />
                            <div className="member-info">
                              <strong>{miembro.usuario.nombre}</strong>
                              <span className="member-role">Responsable</span>
                            </div>
                          </div>
                        ))}
                      {grupoSeleccionadoInfo.miembros_grupo
                        .filter((m: any) => m.rol_en_grupo === 'asistente')
                        .map((miembro: any) => (
                          <div key={miembro.id_usuario_grupo} className="member-item member-asistente">
                            <FaUserTie className="member-icon" />
                            <div className="member-info">
                              <strong>{miembro.usuario.nombre}</strong>
                              <span className="member-role">Asistente</span>
                            </div>
                          </div>
                        ))}
                      {grupoSeleccionadoInfo.miembros_grupo
                        .filter((m: any) => m.rol_en_grupo === 'estudiante')
                        .map((miembro: any) => (
                          <div key={miembro.id_usuario_grupo} className="member-item member-estudiante">
                            <FaUser className="member-icon" />
                            <div className="member-info">
                              <strong>{miembro.usuario.nombre}</strong>
                              <span className="member-role">Estudiante</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="no-members">Este grupo no tiene miembros asignados.</p>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setShowAsignarModal(false)}
                disabled={asignando}
              >
                Cancelar
              </button>
              <button
                className="btn-primary"
                onClick={handleConfirmarAsignacion}
                disabled={asignando || !grupoSeleccionado}
              >
                {asignando ? 'Asignando...' : 'Asignar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de edición de ficha */}
      <EditFichaModal
        ficha={fichaEditar}
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setFichaEditar(null);
        }}
        onSuccess={loadFichas}
      />

      {/* Modal de aprobación de ficha */}
      <AprobarFichaModal
        ficha={fichaAprobar}
        isOpen={showAprobarModal}
        onClose={() => {
          setShowAprobarModal(false);
          setFichaAprobar(null);
        }}
        onSuccess={loadFichas}
      />
    </div>
  );
}

