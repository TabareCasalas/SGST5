import React, { useEffect, useState, useCallback, useRef } from 'react';
import { ApiService } from '../services/api';
import type { Tramite } from '../types/tramite';
import { RechazoModal } from './RechazoModal';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  FaFileAlt, FaChevronDown, FaChevronUp, FaClock, FaCheckCircle, FaTimesCircle, 
  FaUser, FaUsers, FaFolderOpen, FaCalendarAlt, FaTrash, FaCommentAlt, FaSync,
  FaClipboardCheck, FaRoute, FaPaperclip, FaSearch, FaTimes, FaPlus
} from 'react-icons/fa';
import { HojaRutaModal } from './HojaRutaModal';
import { DocumentosModal } from './DocumentosModal';
import { CambiarEstadoTramiteModal } from './CambiarEstadoTramiteModal';
import { SearchInput } from './SearchInput';
import { formatDate, formatDateTime } from '../utils/dateFormatter';
import './TramitesList.css';

export function TramitesList() {
  const [tramites, setTramites] = useState<Tramite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'mis' | 'otras' | 'todas'>('mis');
  const [showRechazoModal, setShowRechazoModal] = useState(false);
  const [tramiteRechazar, setTramiteRechazar] = useState<number | null>(null);
  const [showConsultanteModal, setShowConsultanteModal] = useState(false);
  const [consultanteInfo, setConsultanteInfo] = useState<any>(null);
  const [loadingConsultante, setLoadingConsultante] = useState(false);
  const [showHojaRutaModal, setShowHojaRutaModal] = useState(false);
  const [tramiteHojaRuta, setTramiteHojaRuta] = useState<number | null>(null);
  const [showDocumentosModal, setShowDocumentosModal] = useState(false);
  const [tramiteDocumentos, setTramiteDocumentos] = useState<number | null>(null);
  const [showCambiarEstadoModal, setShowCambiarEstadoModal] = useState(false);
  const [tramiteCambiarEstado, setTramiteCambiarEstado] = useState<Tramite | null>(null);
  const { showToast } = useToast();
  const { user, hasRole, hasAccessLevel } = useAuth();

  // Debounce del término de búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // Esperar 500ms después de que el usuario deje de escribir

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadTramites = useCallback(async () => {
    // Guardar si el input tenía foco antes de cargar
    const hadFocus = document.activeElement === searchInputRef.current;
    
    try {
      setLoading(true);
      
      // Preparar filtros
      const filters: any = {};
      if (debouncedSearchTerm && debouncedSearchTerm.trim() !== '') {
        filters.search = debouncedSearchTerm.trim();
      }
      
      let data = await ApiService.getTramites(filters);
      
      // Filtrar según rol
      if (hasRole('estudiante') && user?.grupos_participa) {
        // Estudiantes solo ven trámites de sus grupos asignados
        const gruposIds = user.grupos_participa.map(gp => gp.id_grupo);
        data = data.filter((t: Tramite) => gruposIds.includes(t.id_grupo));
      } else if (hasRole('consultante')) {
        // Consultantes solo ven sus propios trámites
        data = data.filter((t: Tramite) => t.consultante?.id_usuario === user?.id_usuario);
      } else if (hasRole('docente') && user?.id_usuario) {
        // Docentes ven trámites según la pestaña seleccionada
        const gruposIds = user.grupos_participa?.map(gp => gp.id_grupo) || [];
        
        if (activeTab === 'mis') {
          // Mis trámites:
          // 1. Trámites en_tramite de los grupos donde participan
          // 2. Trámites iniciados desde fichas asignadas a ellos
          
          // Obtener fichas asignadas al docente que están iniciadas
          let fichasDocente: any[] = [];
          try {
            fichasDocente = await ApiService.getFichas({ 
              id_docente: user.id_usuario 
            });
            // Filtrar solo fichas iniciadas (que tienen trámite asociado)
            fichasDocente = fichasDocente.filter((f: any) => f.estado === 'iniciada');
          } catch (err) {
            console.error('Error al cargar fichas del docente:', err);
          }
          
          // Extraer consultantes y grupos de las fichas iniciadas
          const consultantesFichas = new Set(fichasDocente.map((f: any) => f.id_consultante));
          const gruposFichas = new Set(fichasDocente.map((f: any) => f.id_grupo).filter((g: any) => g != null));
          
          // Filtrar trámites:
          // - Trámites aprobados de grupos donde participa el docente
          // - Trámites que coinciden con consultante y grupo de fichas iniciadas asignadas al docente
          data = data.filter((t: Tramite) => {
            // Trámites en_tramite de grupos donde participa
            if (gruposIds.includes(t.id_grupo) && t.estado === 'en_tramite') {
              return true;
            }
            
            // Trámites iniciados desde fichas asignadas al docente
            // Deben coincidir con el consultante Y el grupo de una ficha iniciada
            if (consultantesFichas.has(t.id_consultante) && gruposFichas.has(t.id_grupo)) {
              return true;
            }
            
            return false;
          });
        } else if (activeTab === 'otras') {
          // Otras trámites: trámites iniciados desde fichas asignadas a otros docentes
          // Obtener todas las fichas iniciadas de otros docentes
          let fichasOtrosDocentes: any[] = [];
          try {
            const todasFichas = await ApiService.getFichas();
            fichasOtrosDocentes = todasFichas.filter((f: any) => 
              f.id_docente !== user.id_usuario && f.estado === 'iniciada'
            );
          } catch (err) {
            console.error('Error al cargar fichas de otros docentes:', err);
          }
          
          // Extraer consultantes y grupos de las fichas iniciadas de otros docentes
          const consultantesFichas = new Set(fichasOtrosDocentes.map((f: any) => f.id_consultante));
          const gruposFichas = new Set(fichasOtrosDocentes.map((f: any) => f.id_grupo).filter((g: any) => g != null));
          
          // Filtrar trámites que coinciden con consultante y grupo de fichas iniciadas de otros docentes
          data = data.filter((t: Tramite) => {
            return consultantesFichas.has(t.id_consultante) && gruposFichas.has(t.id_grupo);
          });
        } else if (activeTab === 'todas') {
          // Todas los trámites: todos los trámites en_tramite e iniciados
          // Obtener todas las fichas iniciadas
          let todasFichasIniciadas: any[] = [];
          try {
            const todasFichas = await ApiService.getFichas();
            todasFichasIniciadas = todasFichas.filter((f: any) => f.estado === 'iniciada');
          } catch (err) {
            console.error('Error al cargar todas las fichas:', err);
          }
          
          // Extraer consultantes y grupos de todas las fichas iniciadas
          const consultantesFichas = new Set(todasFichasIniciadas.map((f: any) => f.id_consultante));
          const gruposFichas = new Set(todasFichasIniciadas.map((f: any) => f.id_grupo).filter((g: any) => g != null));
          
          // Filtrar trámites:
          // - Trámites aprobados de grupos donde participa el docente
          // - Trámites que coinciden con consultante y grupo de cualquier ficha iniciada
          data = data.filter((t: Tramite) => {
            // Trámites en_tramite de grupos donde participa
            if (gruposIds.includes(t.id_grupo) && t.estado === 'en_tramite') {
              return true;
            }
            
            // Trámites iniciados desde cualquier ficha
            if (consultantesFichas.has(t.id_consultante) && gruposFichas.has(t.id_grupo)) {
              return true;
            }
            
            return false;
          });
        }
      }
      // Admin ve todos los trámites (incluyendo pendientes)
      
      setTramites(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
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
  }, [user, debouncedSearchTerm, activeTab, hasRole, showToast]);

  // Cargar trámites cuando cambia el usuario, el término de búsqueda con debounce o la pestaña
  useEffect(() => {
    loadTramites();
    // Auto-refresh cada 30 segundos
    const interval = setInterval(loadTramites, 30000);
    return () => clearInterval(interval);
  }, [loadTramites]);

  const toggleRow = (id: number) => {
    const newExpanded = new Set(expandedRows);
    if (expandedRows.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este trámite?')) return;
    
    try {
      await ApiService.deleteTramite(id);
      await loadTramites();
      showToast('Trámite eliminado exitosamente', 'success');
    } catch (err: any) {
      showToast(`Error al eliminar: ${err.message}`, 'error');
    }
  };

  const handleCompletarTarea = async (id: number, aprobado: boolean) => {
    if (!aprobado) {
      setTramiteRechazar(id);
      setShowRechazoModal(true);
      return;
    }
    await ejecutarCompletar(id, true);
  };

  const handleConfirmarRechazo = async (razon: string) => {
    if (tramiteRechazar) {
      setShowRechazoModal(false);
      await ejecutarCompletar(tramiteRechazar, false, razon);
      setTramiteRechazar(null);
    }
  };

  const ejecutarCompletar = async (id: number, aprobado: boolean, razon?: string) => {
    try {
      // Actualizar el estado del trámite directamente
      const nuevoEstado = aprobado ? 'finalizado' : 'desistido';
      await ApiService.updateTramite(id, {
        estado: nuevoEstado,
        motivo_cierre: razon,
      });
      await loadTramites();
      showToast(
        `Trámite ${aprobado ? 'aprobado' : 'rechazado'} exitosamente`,
        aprobado ? 'success' : 'info'
      );
    } catch (err: any) {
      showToast(`Error al completar tarea: ${err.message}`, 'error');
    }
  };

  const handleAprobarTramite = async (id: number) => {
    try {
      await ApiService.aprobarTramite(id);
      await loadTramites();
      showToast('Trámite aprobado exitosamente', 'success');
    } catch (err: any) {
      showToast(`Error al aprobar trámite: ${err.message}`, 'error');
    }
  };

  const handleConsultanteClick = async (idConsultante: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasRole('estudiante')) return;
    
    try {
      setLoadingConsultante(true);
      const consultante = await ApiService.getConsultanteById(idConsultante);
      setConsultanteInfo(consultante);
      setShowConsultanteModal(true);
    } catch (err: any) {
      showToast(`Error al cargar información del consultante: ${err.message}`, 'error');
    } finally {
      setLoadingConsultante(false);
    }
  };

  const getEstadoIcon = (estado: string) => {
    // Normalizar "iniciado" a "en_tramite" para visualización
    const estadoNormalizado = estado === 'iniciado' ? 'en_tramite' : estado;
    switch (estadoNormalizado) {
      case 'pendiente': return <FaClock className="status-icon pendiente" />;
      case 'en_tramite': return <FaSync className="status-icon en-tramite spin" />;
      case 'finalizado': return <FaCheckCircle className="status-icon finalizado" />;
      case 'desistido': return <FaTimesCircle className="status-icon desistido" />;
      default: return <FaFileAlt className="status-icon" />;
    }
  };

  const getEstadoLabel = (estado: string) => {
    // Normalizar "iniciado" a "en_tramite" para visualización
    const estadoNormalizado = estado === 'iniciado' ? 'en_tramite' : estado;
    const labels: { [key: string]: string } = {
      pendiente: 'Pendiente',
      en_tramite: 'En Trámite',
      iniciado: 'En Trámite', // Mapeo para compatibilidad
      finalizado: 'Finalizado',
      desistido: 'Desistido',
    };
    return labels[estadoNormalizado] || labels[estado] || estado;
  };

  if (loading && tramites.length === 0) return <div className="loading">Cargando trámites...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="tramites-container">
      <div className="tramites-header">
        <div>
          {hasRole('docente') && (
            <div className="tabs-container">
              <button
                className={`tab ${activeTab === 'mis' ? 'active' : ''}`}
                onClick={() => setActiveTab('mis')}
              >
                Mis Trámites
              </button>
              <button
                className={`tab ${activeTab === 'otras' ? 'active' : ''}`}
                onClick={() => setActiveTab('otras')}
              >
                Otros Trámites
              </button>
              <button
                className={`tab ${activeTab === 'todas' ? 'active' : ''}`}
                onClick={() => setActiveTab('todas')}
              >
                Todos los Trámites
              </button>
            </div>
          )}
        </div>
        <div className="header-actions">
          <div className="search-container">
            <FaSearch className="search-icon" />
            <SearchInput
              ref={searchInputRef}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por carpeta, consultante, grupo, estado..."
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
          <button onClick={loadTramites} className="refresh-btn" title="Actualizar">
            <FaSync /> Actualizar
          </button>
        </div>
      </div>


      {/* Tabla */}
      {tramites.length === 0 ? (
        <div className="empty-state">
          <p>No hay trámites registrados</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="tramites-table">
            <thead>
              <tr>
                <th></th>
                <th><FaFolderOpen /> Carpeta #</th>
                <th><FaUser /> Consultante</th>
                <th><FaUsers /> Grupo</th>
                <th><FaClipboardCheck /> Estado</th>
                <th><FaCalendarAlt /> Fecha</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tramites.map((tramite) => (
                <React.Fragment key={tramite.id_tramite}>
                  <tr 
                    className={`table-row ${(tramite.estado === 'en_tramite' || tramite.estado === 'iniciado') ? 'highlight-row' : ''}`}
                    onClick={() => toggleRow(tramite.id_tramite)}
                  >
                    <td className="expand-icon">
                      {expandedRows.has(tramite.id_tramite) ? <FaChevronUp /> : <FaChevronDown />}
                    </td>
                    <td className="folder-number">
                      <strong>{tramite.num_carpeta}</strong>
                    </td>
                    <td className="consultante-name">
                      {tramite.consultante && hasRole('estudiante') ? (
                        <button
                          className="consultante-link-btn"
                          onClick={(e) => handleConsultanteClick(tramite.consultante!.id_consultante, e)}
                          title="Ver información completa del consultante"
                        >
                          {tramite.consultante.usuario?.nombre || 'N/A'}
                        </button>
                      ) : (
                        tramite.consultante?.usuario?.nombre || 'N/A'
                      )}
                    </td>
                    <td>
                      {tramite.grupo?.nombre || 'N/A'}
                    </td>
                    <td>
                      <div className="estado-badge-container">
                        {getEstadoIcon(tramite.estado)}
                        <span className={`estado-badge estado-${tramite.estado}`}>
                          {getEstadoLabel(tramite.estado)}
                        </span>
                      </div>
                    </td>
                    <td>
                      {formatDate(tramite.fecha_inicio)}
                    </td>
                    <td>
                      <div className="action-buttons">
                        {/* Administradores pueden aprobar trámites pendientes */}
                        {tramite.estado === 'pendiente' && hasRole('admin') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAprobarTramite(tramite.id_tramite);
                            }}
                            className="btn-icon btn-success"
                            title="Aprobar trámite pendiente"
                          >
                            <FaCheckCircle />
                          </button>
                        )}
                        {/* Alumnos y docentes pueden cambiar el estado del trámite */}
                        {(hasRole('estudiante') || hasRole('docente') || (hasRole('admin') && hasAccessLevel(2))) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setTramiteCambiarEstado(tramite);
                              setShowCambiarEstadoModal(true);
                            }}
                            className="btn-icon"
                            style={{ color: '#6c757d' }}
                            title="Cambiar estado del trámite"
                          >
                            <FaSync />
                          </button>
                        )}
                        {/* Solo admin sistema y admin docente pueden eliminar */}
                        {hasRole('admin') && hasAccessLevel(2) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(tramite.id_tramite);
                            }}
                            className="btn-icon btn-danger"
                            title="Eliminar trámite"
                          >
                            <FaTrash />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedRows.has(tramite.id_tramite) && (
                    <tr className="expanded-content">
                      <td colSpan={7}>
                        <div className="details-grid">
                          <div className="detail-item">
                            <FaUser className="detail-icon" />
                            <div>
                              <strong>Consultante</strong>
                              {tramite.consultante && hasRole('estudiante') ? (
                                <button
                                  className="consultante-link-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleConsultanteClick(tramite.consultante!.id_consultante, e);
                                  }}
                                  title="Ver información completa del consultante"
                                >
                                  <p>{tramite.consultante.usuario?.nombre || 'N/A'}</p>
                                  <small>CI: {tramite.consultante.usuario?.ci || 'N/A'} - Click para ver más</small>
                                </button>
                              ) : (
                                <>
                                  <p>{tramite.consultante.usuario?.nombre || 'N/A'}</p>
                                  <small>CI: {tramite.consultante.usuario?.ci || 'N/A'}</small>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="detail-item">
                            <FaUsers className="detail-icon" />
                            <div>
                              <strong>Grupo</strong>
                              <p>{tramite.grupo?.nombre || 'N/A'}</p>
                              {tramite.grupo?.descripcion && (
                                <small>{tramite.grupo.descripcion}</small>
                              )}
                            </div>
                          </div>
                          <div className="detail-item">
                            <FaCalendarAlt className="detail-icon" />
                            <div>
                              <strong>Fecha de Inicio</strong>
                              <p>{formatDateTime(tramite.fecha_inicio)}</p>
                            </div>
                          </div>
                          {tramite.fecha_cierre && (
                            <div className="detail-item">
                              <FaTimesCircle className="detail-icon" />
                              <div>
                                <strong>Fecha de Cierre</strong>
                                <p>{formatDateTime(tramite.fecha_cierre)}</p>
                              </div>
                            </div>
                          )}
                          {tramite.observaciones && (
                            <div className="detail-item full-width">
                              <FaCommentAlt className="detail-icon" />
                              <div>
                                <strong>Observaciones</strong>
                                <p>{tramite.observaciones}</p>
                              </div>
                            </div>
                          )}
                          {tramite.motivo_cierre && (
                            <div className="detail-item full-width">
                              <FaCommentAlt className="detail-icon" />
                              <div>
                                <strong>Motivo de Cierre</strong>
                                <p>{tramite.motivo_cierre}</p>
                              </div>
                            </div>
                          )}
                          {/* Botón para ver hoja de ruta (estudiantes y docentes) */}
                          {(hasRole('estudiante') || hasRole('docente')) && (
                            <div className="detail-item full-width">
                              <button
                                className="btn-hoja-ruta"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTramiteHojaRuta(tramite.id_tramite);
                                  setShowHojaRutaModal(true);
                                }}
                                title="Ver hoja de ruta y bitácora de actuaciones"
                              >
                                <FaRoute /> Ver Hoja de Ruta
                                {tramite.hoja_ruta && tramite.hoja_ruta.length > 0 && (
                                  <span className="badge-count">{tramite.hoja_ruta.length}</span>
                                )}
                              </button>
                            </div>
                          )}
                          {/* Botón para ver documentos adjuntos */}
                          {(hasRole('estudiante') || hasRole('docente')) && (
                            <div className="detail-item full-width">
                              <button
                                className="btn-documentos"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTramiteDocumentos(tramite.id_tramite);
                                  setShowDocumentosModal(true);
                                }}
                                title="Ver y gestionar documentos adjuntos"
                              >
                                <FaPaperclip /> Documentos Adjuntos
                                {tramite.documentos && tramite.documentos.length > 0 && (
                                  <span className="badge-count">{tramite.documentos.length}</span>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <RechazoModal
        isOpen={showRechazoModal}
        onClose={() => {
          setShowRechazoModal(false);
          setTramiteRechazar(null);
        }}
        onConfirm={handleConfirmarRechazo}
      />

      {/* Modal de información del consultante para estudiantes */}
      {showConsultanteModal && consultanteInfo && (
        <div className="modal-overlay" onClick={() => setShowConsultanteModal(false)}>
          <div className="modal-content consultante-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>👤 Información del Consultante</h2>
              <button 
                className="close-btn" 
                onClick={() => setShowConsultanteModal(false)}
                title="Cerrar"
              >
                ✕
              </button>
            </div>
            
            <div className="modal-body">
              {loadingConsultante ? (
                <div className="loading">Cargando información...</div>
              ) : (
                <>
                  <div className="consultante-info-section">
                    <h3>📋 Datos Personales</h3>
                    <div className="info-grid">
                      <div className="info-item">
                        <strong>Nombre:</strong>
                        <span>{consultanteInfo.usuario?.nombre || 'N/A'}</span>
                      </div>
                      <div className="info-item">
                        <strong>Cédula de Identidad:</strong>
                        <span>{consultanteInfo.usuario?.ci || 'N/A'}</span>
                      </div>
                      <div className="info-item">
                        <strong>Estado Civil:</strong>
                        <span>{consultanteInfo.est_civil || 'N/A'}</span>
                      </div>
                      <div className="info-item">
                        <strong>Número de Padrón:</strong>
                        <span>{consultanteInfo.nro_padron || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="consultante-info-section">
                    <h3>📧 Información de Contacto</h3>
                    <div className="info-grid">
                      <div className="info-item full-width">
                        <strong>Correo Electrónico:</strong>
                        {consultanteInfo.usuario?.correo ? (
                          <span>{consultanteInfo.usuario.correo.split('|').map((c: string, idx: number) => (
                            <div key={idx} className="multi-value-item">
                              📧 {c}
                            </div>
                          ))}</span>
                        ) : (
                          <span>N/A</span>
                        )}
                      </div>
                      <div className="info-item full-width">
                        <strong>Teléfono:</strong>
                        {consultanteInfo.usuario?.telefono ? (
                          <span>{consultanteInfo.usuario.telefono.split('|').map((t: string, idx: number) => (
                            <div key={idx} className="multi-value-item">
                              📞 {t}
                            </div>
                          ))}</span>
                        ) : (
                          <span>N/A</span>
                        )}
                      </div>
                      <div className="info-item full-width">
                        <strong>Domicilio:</strong>
                        {consultanteInfo.usuario?.domicilio ? (
                          <span>{consultanteInfo.usuario.domicilio.split('|').map((d: string, idx: number) => (
                            <div key={idx} className="multi-value-item">
                              📍 {d}
                            </div>
                          ))}</span>
                        ) : (
                          <span>N/A</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {consultanteInfo.tramites && consultanteInfo.tramites.length > 0 && (
                    <div className="consultante-info-section">
                      <h3>📂 Trámites del Consultante</h3>
                      <div className="tramites-list-consultante">
                        {consultanteInfo.tramites.map((tramite: any) => (
                          <div key={tramite.id_tramite} className="tramite-item-consultante">
                            <div className="tramite-header-consultante">
                              <strong>Carpeta #{tramite.num_carpeta}</strong>
                              <span className={`estado-badge estado-${tramite.estado}`}>
                                {getEstadoLabel(tramite.estado)}
                              </span>
                            </div>
                            {tramite.grupo && (
                              <small>Grupo: {tramite.grupo.nombre}</small>
                            )}
                            <small>Fecha: {formatDateTime(tramite.fecha_inicio)}</small>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de hoja de ruta */}
      {showHojaRutaModal && tramiteHojaRuta && (
        <HojaRutaModal
          idTramite={tramiteHojaRuta}
          isOpen={showHojaRutaModal}
          onClose={() => {
            setShowHojaRutaModal(false);
            setTramiteHojaRuta(null);
          }}
          onUpdate={loadTramites}
          tramiteInfo={tramites.find(t => t.id_tramite === tramiteHojaRuta)}
        />
      )}

      {/* Modal de documentos adjuntos */}
      {showDocumentosModal && tramiteDocumentos && (
        <DocumentosModal
          idTramite={tramiteDocumentos}
          isOpen={showDocumentosModal}
          onClose={() => {
            setShowDocumentosModal(false);
            setTramiteDocumentos(null);
          }}
          onUpdate={loadTramites}
        />
      )}
      {/* Modal para cambiar estado del trámite */}
      {showCambiarEstadoModal && tramiteCambiarEstado && (
        <CambiarEstadoTramiteModal
          tramite={tramiteCambiarEstado}
          onClose={() => {
            setShowCambiarEstadoModal(false);
            setTramiteCambiarEstado(null);
          }}
          onSuccess={() => {
            loadTramites();
          }}
        />
      )}
    </div>
  );
}
