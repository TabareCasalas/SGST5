import { useState, useEffect, useCallback, useRef } from 'react';
import { ApiService } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  FaUsers, FaChevronDown, FaChevronUp, FaUserTie, FaUser, 
  FaFileAlt, FaSync, FaEdit, FaTrash, FaCheckCircle, FaTimesCircle,
  FaSearch, FaTimes, FaPlus
} from 'react-icons/fa';
import { CreateGrupoModal } from './CreateGrupoModal';
import { SearchInput } from './SearchInput';
import './GruposList.css';

interface UsuarioGrupo {
  id_usuario_grupo: number;
  rol_en_grupo: string;
  usuario: {
    id_usuario: number;
    nombre: string;
    ci: string;
    rol: string;
  };
}

interface Usuario {
  id_usuario: number;
  nombre: string;
  ci: string;
  rol: string;
  activo?: boolean;
}

interface Grupo {
  id_grupo: number;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  miembros_grupo?: UsuarioGrupo[];
  tramites?: any[];
}

export function GruposList() {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'mis' | 'otras' | 'todas'>('mis');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [selectedGrupo, setSelectedGrupo] = useState<Grupo | null>(null);
  const [showModifyMembers, setShowModifyMembers] = useState(false);
  const [docentes, setDocentes] = useState<Usuario[]>([]);
  const [estudiantes, setEstudiantes] = useState<Usuario[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editFormData, setEditFormData] = useState({
    responsable_id: '',
    asistentes_ids: [] as string[],
    estudiantes_ids: [] as string[],
  });
  const { showToast } = useToast();
  const { user, hasRole, hasAccessLevel } = useAuth();

  // Debounce del término de búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // Esperar 500ms después de que el usuario deje de escribir

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadGrupos = useCallback(async () => {
    // Guardar si el input tenía foco antes de cargar
    const hadFocus = document.activeElement === searchInputRef.current;
    
    try {
      setLoading(true);
      
      // Preparar filtros
      const filters: any = {};
      if (debouncedSearchTerm && debouncedSearchTerm.trim() !== '') {
        filters.search = debouncedSearchTerm.trim();
      }
      
      let data = await ApiService.getGrupos(filters);
      
      // Filtrar según rol y pestaña activa
      if (hasRole('docente') && user?.grupos_participa) {
        const gruposIds = user.grupos_participa.map(gp => gp.id_grupo);
        
        if (activeTab === 'mis') {
          // Mis grupos: solo los grupos donde participa el docente
          data = data.filter((g: Grupo) => gruposIds.includes(g.id_grupo));
        } else if (activeTab === 'otras') {
          // Otros grupos: grupos donde NO participa el docente
          data = data.filter((g: Grupo) => !gruposIds.includes(g.id_grupo));
        } else if (activeTab === 'todas') {
          // Todas los grupos: todos los grupos (sin filtrar)
          // data ya contiene todos los grupos
        }
      }
      // Admins ven todos los grupos (sin filtros)
      
      setGrupos(data);
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
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
  }, [user, activeTab, debouncedSearchTerm, hasRole, showToast]);

  // Handler memoizado para el cambio de búsqueda
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  // Cargar grupos cuando cambia el usuario, la pestaña o el término de búsqueda con debounce
  useEffect(() => {
    loadGrupos();
  }, [loadGrupos]);

  const getMiembrosByRol = (grupo: Grupo, rol: string) => {
    return grupo.miembros_grupo?.filter(m => m.rol_en_grupo === rol) || [];
  };

  const toggleRow = (id: number) => {
    const newExpanded = new Set(expandedRows);
    if (expandedRows.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const loadDocentes = async () => {
    try {
      const allUsers = await ApiService.getUsuarios();
      const docentesList = allUsers.filter((u: Usuario) => {
        const esDocente = u.rol === 'docente';
        const esActivo = u.activo === true || u.activo === undefined || u.activo === null;
        return esDocente && esActivo;
      });
      setDocentes(docentesList);
    } catch (err: any) {
      showToast(`Error al cargar docentes: ${err.message}`, 'error');
    }
  };

  const loadEstudiantes = async () => {
    if (!selectedGrupo) return;
    
    try {
      const allUsers = await ApiService.getUsuarios();
      
      // Obtener IDs de estudiantes actuales del grupo
      const estudiantesActualesIds = getMiembrosByRol(selectedGrupo, 'estudiante')
        .map(e => e.usuario.id_usuario);
      
      // Filtrar estudiantes activos (incluir los que ya están en el grupo)
      const estudiantesList = allUsers.filter((u: any) => {
        const esEstudiante = u.rol === 'estudiante';
        const esActivo = u.activo === true || u.activo === undefined || u.activo === null;
        
        // Incluir estudiantes del grupo actual O estudiantes sin grupo
        const estaEnEsteGrupo = estudiantesActualesIds.includes(u.id_usuario);
        const yaEnOtroGrupo = u.grupos_participa && u.grupos_participa.length > 0 && !estaEnEsteGrupo;
        
        return esEstudiante && esActivo && (!yaEnOtroGrupo || estaEnEsteGrupo);
      });
      
      setEstudiantes(estudiantesList);
    } catch (err: any) {
      showToast(`Error al cargar estudiantes: ${err.message}`, 'error');
    }
  };

  const handleOpenModifyMembers = async () => {
    if (!selectedGrupo) return;
    
    setShowModifyMembers(true);
    setLoadingMembers(true);
    
    try {
      // Cargar docentes y estudiantes
      await Promise.all([loadDocentes(), loadEstudiantes()]);
      
      // Inicializar el formulario con los miembros actuales
      const responsable = getMiembrosByRol(selectedGrupo, 'responsable')[0];
      const asistentes = getMiembrosByRol(selectedGrupo, 'asistente');
      const estudiantes = getMiembrosByRol(selectedGrupo, 'estudiante');
      
      setEditFormData({
        responsable_id: responsable ? responsable.usuario.id_usuario.toString() : '',
        asistentes_ids: asistentes.map(a => a.usuario.id_usuario.toString()),
        estudiantes_ids: estudiantes.map(e => e.usuario.id_usuario.toString()),
      });
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleResponsableChange = (id: string) => {
    setEditFormData({ ...editFormData, responsable_id: id });
  };

  const handleAsistenteToggle = (id: string) => {
    const newAsistentes = editFormData.asistentes_ids.includes(id)
      ? editFormData.asistentes_ids.filter(aid => aid !== id)
      : [...editFormData.asistentes_ids, id];
    
    setEditFormData({ ...editFormData, asistentes_ids: newAsistentes });
  };

  const handleEstudianteToggle = (id: string) => {
    const newEstudiantes = editFormData.estudiantes_ids.includes(id)
      ? editFormData.estudiantes_ids.filter(eid => eid !== id)
      : [...editFormData.estudiantes_ids, id];
    
    setEditFormData({ ...editFormData, estudiantes_ids: newEstudiantes });
  };

  const handleSaveMembers = async () => {
    if (!selectedGrupo) return;

    if (!editFormData.responsable_id) {
      showToast('Debe seleccionar un docente responsable', 'error');
      return;
    }

    setSaving(true);

    try {
      // Obtener miembros actuales del grupo
      const miembrosActuales = selectedGrupo.miembros_grupo || [];
      
      // Obtener miembros deseados
      const responsableId = parseInt(editFormData.responsable_id);
      const asistentesIds = editFormData.asistentes_ids.map(id => parseInt(id));
      const estudiantesIds = editFormData.estudiantes_ids.map(id => parseInt(id));
      
      // Identificar miembros a eliminar (están en actuales pero no en deseados)
      const responsablesActuales = getMiembrosByRol(selectedGrupo, 'responsable');
      const asistentesActuales = getMiembrosByRol(selectedGrupo, 'asistente');
      const estudiantesActuales = getMiembrosByRol(selectedGrupo, 'estudiante');
      
      // Manejar cambio de responsable
      // El backend ahora maneja el cambio automáticamente si el usuario ya está en el grupo
      // O si agregamos un nuevo responsable, convierte el actual en asistente automáticamente
      const responsableActual = responsablesActuales[0];
      const esResponsableActual = responsableActual && responsableActual.usuario.id_usuario === responsableId;
      
      // Guardar el ID del responsable anterior para limpiarlo después si no está en asistentes
      const responsableAnteriorId = responsableActual ? responsableActual.usuario.id_usuario : null;
      
      if (!esResponsableActual) {
        // Verificar si el nuevo responsable ya es miembro del grupo
        const todosLosMiembros = selectedGrupo.miembros_grupo || [];
        const nuevoResponsableComoMiembro = todosLosMiembros.find(
          m => m.usuario.id_usuario === responsableId
        );
        
        if (nuevoResponsableComoMiembro) {
          // El nuevo responsable ya está en el grupo con otro rol
          // El backend lo actualizará automáticamente a responsable y convertirá el actual en asistente
          await ApiService.addMiembroGrupo(selectedGrupo.id_grupo, {
            id_usuario: responsableId,
            rol_en_grupo: 'responsable',
          });
        } else {
          // El nuevo responsable no está en el grupo
          // El backend lo agregará como responsable y convertirá el actual en asistente automáticamente
          await ApiService.addMiembroGrupo(selectedGrupo.id_grupo, {
            id_usuario: responsableId,
            rol_en_grupo: 'responsable',
          });
        }
      }
      
      // Recargar el grupo después de cambiar el responsable para tener datos actualizados
      const grupoActualizadoParaAsistentes = await ApiService.getGrupoById(selectedGrupo.id_grupo);
      const asistentesActualesActualizados = grupoActualizadoParaAsistentes.miembros_grupo?.filter(
        (m: UsuarioGrupo) => m.rol_en_grupo === 'asistente'
      ) || [];
      
      // Recargar grupo nuevamente para tener los datos más recientes
      const grupoRecargado = await ApiService.getGrupoById(selectedGrupo.id_grupo);
      const asistentesActualesRecargados = grupoRecargado.miembros_grupo?.filter(
        (m: UsuarioGrupo) => m.rol_en_grupo === 'asistente'
      ) || [];
      const asistentesActualesIds = asistentesActualesRecargados.map(a => a.usuario.id_usuario);
      
      // Filtrar asistentes: excluir al responsable actual de los deseados
      const asistentesIdsFiltrados = asistentesIds
        .filter(id => id !== responsableId);
      
      // Si el responsable anterior fue convertido a asistente pero no está en la lista deseada, eliminarlo
      if (responsableAnteriorId && !esResponsableActual && !asistentesIds.includes(responsableAnteriorId)) {
        const responsableAnteriorComoAsistente = asistentesActualesRecargados.find(
          (a: UsuarioGrupo) => a.usuario.id_usuario === responsableAnteriorId
        );
        if (responsableAnteriorComoAsistente) {
          await ApiService.removeMiembroGrupo(selectedGrupo.id_grupo, responsableAnteriorComoAsistente.id_usuario_grupo);
        }
      }
      
      // Recargar nuevamente después de posibles cambios
      const grupoFinal = await ApiService.getGrupoById(selectedGrupo.id_grupo);
      const asistentesFinales = grupoFinal.miembros_grupo?.filter(
        (m: UsuarioGrupo) => m.rol_en_grupo === 'asistente'
      ) || [];
      const asistentesFinalesIds = asistentesFinales.map(a => a.usuario.id_usuario);
      
      // Eliminar asistentes que ya no están en la lista deseada
      for (const asistente of asistentesFinales) {
        if (!asistentesIdsFiltrados.includes(asistente.usuario.id_usuario)) {
          await ApiService.removeMiembroGrupo(selectedGrupo.id_grupo, asistente.id_usuario_grupo);
        }
      }
      
      // Agregar nuevos asistentes que no están en el grupo
      for (const asistenteId of asistentesIdsFiltrados) {
        if (!asistentesFinalesIds.includes(asistenteId)) {
          await ApiService.addMiembroGrupo(selectedGrupo.id_grupo, {
            id_usuario: asistenteId,
            rol_en_grupo: 'asistente',
          });
        }
      }
      
      // Actualizar estudiantes
      const estudiantesActualesIds = estudiantesActuales.map(e => e.usuario.id_usuario);
      // Eliminar estudiantes que ya no están en la lista
      for (const estudiante of estudiantesActuales) {
        if (!estudiantesIds.includes(estudiante.usuario.id_usuario)) {
          await ApiService.removeMiembroGrupo(selectedGrupo.id_grupo, estudiante.id_usuario_grupo);
        }
      }
      // Agregar nuevos estudiantes
      for (const estudianteId of estudiantesIds) {
        if (!estudiantesActualesIds.includes(estudianteId)) {
          await ApiService.addMiembroGrupo(selectedGrupo.id_grupo, {
            id_usuario: estudianteId,
            rol_en_grupo: 'estudiante',
          });
        }
      }
      
      showToast('Miembros actualizados exitosamente', 'success');
      setShowModifyMembers(false);
      
      // Recargar el grupo seleccionado
      const grupoActualizado = await ApiService.getGrupoById(selectedGrupo.id_grupo);
      setSelectedGrupo(grupoActualizado);
      loadGrupos();
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (id_usuario_grupo: number) => {
    if (!selectedGrupo) return;

    if (!window.confirm('¿Está seguro de que desea eliminar a este miembro del grupo?')) {
      return;
    }

    try {
      await ApiService.removeMiembroGrupo(selectedGrupo.id_grupo, id_usuario_grupo);
      showToast('Miembro eliminado exitosamente', 'success');
      // Recargar el grupo seleccionado
      const grupoActualizado = await ApiService.getGrupoById(selectedGrupo.id_grupo);
      setSelectedGrupo(grupoActualizado);
      loadGrupos();
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  const canRemoveMember = (miembro: UsuarioGrupo) => {
    // No permitir eliminar al responsable si es el único
    if (miembro.rol_en_grupo === 'responsable') {
      const responsables = getMiembrosByRol(selectedGrupo!, 'responsable');
      return responsables.length > 1;
    }
    return true;
  };

  const handleToggleActivo = async (grupo: Grupo) => {
    const accion = grupo.activo ? 'desactivar' : 'activar';
    if (!window.confirm(`¿Está seguro de que desea ${accion} el grupo "${grupo.nombre}"?`)) {
      return;
    }

    try {
      if (grupo.activo) {
        await ApiService.deactivateGrupo(grupo.id_grupo);
        showToast('Grupo desactivado exitosamente', 'success');
      } else {
        await ApiService.activateGrupo(grupo.id_grupo);
        showToast('Grupo activado exitosamente', 'success');
      }
      
      // Recargar grupos y actualizar el grupo seleccionado si es el mismo
      await loadGrupos();
      if (selectedGrupo && selectedGrupo.id_grupo === grupo.id_grupo) {
        const grupoActualizado = await ApiService.getGrupoById(grupo.id_grupo);
        setSelectedGrupo(grupoActualizado);
      }
    } catch (err: any) {
      showToast(`Error al ${accion} grupo: ${err.message}`, 'error');
    }
  };

  return (
    <div className="grupos-container">
      <div className="grupos-header">
        <div>
          {hasRole('docente') && (
            <div className="tabs-container">
              <button
                className={`tab ${activeTab === 'mis' ? 'active' : ''}`}
                onClick={() => setActiveTab('mis')}
              >
                Mis Grupos
              </button>
              <button
                className={`tab ${activeTab === 'otras' ? 'active' : ''}`}
                onClick={() => setActiveTab('otras')}
              >
                Otros Grupos
              </button>
              <button
                className={`tab ${activeTab === 'todas' ? 'active' : ''}`}
                onClick={() => setActiveTab('todas')}
              >
                Todos los Grupos
              </button>
            </div>
          )}
        </div>
        <div className="header-actions">
          {hasRole('admin') && hasAccessLevel(1) && (
            <button
              className="btn-create"
              onClick={() => setShowCreateForm(true)}
              title="Crear nuevo grupo"
            >
              <FaPlus /> Crear Grupo
            </button>
          )}
          <div className="search-container">
            <FaSearch className="search-icon" />
            <SearchInput
              value={searchTerm}
              onChange={handleSearchChange}
              inputRef={searchInputRef}
              placeholder="Buscar por nombre, descripción, miembros..."
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
          <button onClick={loadGrupos} className="refresh-btn" disabled={loading} title="Actualizar">
            <FaSync className={loading ? 'spinning' : ''} />
            <span>Actualizar</span>
          </button>
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value as 'mis' | 'otras' | 'todas')}
            disabled={loading}
            className="tab-select"
          >
            <option value="mis">Mis Grupos</option>
            <option value="otras">Otros Grupos</option>
            <option value="todas">Todos los Grupos</option>
          </select>
        </div>
        <div className="stats">
          <div className="stat-card stat-card-compact">
            <span className="stat-number stat-number-compact">{grupos.length}</span>
            <span className="stat-label stat-label-compact">Grupos totales</span>
          </div>
          <div className="stat-card stat-card-compact">
            <span className="stat-number stat-number-compact">{grupos.filter(g => g.activo).length}</span>
            <span className="stat-label stat-label-compact">Grupos activos</span>
          </div>
          {(() => {
            // Calcular estadísticas de estudiantes y docentes
            const estudiantesSet = new Set<number>();
            const docentesSet = new Set<number>();
            const gruposConEstudiantes = new Set<number>();
            const gruposConDocentes = new Set<number>();

            grupos.forEach(grupo => {
              grupo.miembros_grupo?.forEach(miembro => {
                if (miembro.usuario.rol === 'estudiante') {
                  estudiantesSet.add(miembro.usuario.id_usuario);
                  gruposConEstudiantes.add(grupo.id_grupo);
                } else if (miembro.usuario.rol === 'docente') {
                  docentesSet.add(miembro.usuario.id_usuario);
                  gruposConDocentes.add(grupo.id_grupo);
                }
              });
            });

            return (
              <>
                <div className="stat-card stat-card-compact">
                  <span className="stat-number stat-number-compact">{estudiantesSet.size}</span>
                  <span className="stat-label stat-label-compact">Estudiantes en {gruposConEstudiantes.size} grupo{gruposConEstudiantes.size !== 1 ? 's' : ''}</span>
                </div>
                <div className="stat-card stat-card-compact">
                  <span className="stat-number stat-number-compact">{docentesSet.size}</span>
                  <span className="stat-label stat-label-compact">Docentes en {gruposConDocentes.size} grupo{gruposConDocentes.size !== 1 ? 's' : ''}</span>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Modal de creación */}
      <CreateGrupoModal
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        onSuccess={loadGrupos}
      />

      {loading && grupos.length === 0 ? (
        <div className="grupos-list-loading">Cargando grupos...</div>
      ) : grupos.length === 0 ? (
        <div className="empty-state">
          <p>No hay grupos registrados</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="grupos-table">
            <thead>
              <tr>
                <th></th>
                <th><FaUsers /> Nombre</th>
                <th><FaUserTie /> Responsable</th>
                <th><FaUsers /> Miembros</th>
                <th><FaFileAlt /> Trámites</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {grupos.map((grupo) => {
                const responsables = getMiembrosByRol(grupo, 'responsable');
                const asistentes = getMiembrosByRol(grupo, 'asistente');
                const estudiantes = getMiembrosByRol(grupo, 'estudiante');
                const totalMiembros = grupo.miembros_grupo?.length || 0;
                const totalTramites = grupo.tramites?.length || 0;

                return (
                  <>
                    <tr 
                      key={grupo.id_grupo} 
                      className={`table-row ${!grupo.activo ? 'inactive-row' : ''}`}
                      onClick={() => toggleRow(grupo.id_grupo)}
                    >
                      <td className="expand-icon">
                        {expandedRows.has(grupo.id_grupo) ? <FaChevronUp /> : <FaChevronDown />}
                      </td>
                      <td className="grupo-name">
                        <strong>{grupo.nombre}</strong>
                        {grupo.descripcion && (
                          <small className="grupo-desc-preview">{grupo.descripcion}</small>
                        )}
                      </td>
                      <td>
                        {responsables.length > 0 ? (
                          responsables[0].usuario.nombre
                        ) : (
                          <span className="no-data">Sin responsable</span>
                        )}
                      </td>
                      <td>
                        <div className="miembros-summary">
                          <span className="miembros-count">{totalMiembros}</span>
                          <small>
                            {responsables.length > 0 && `${responsables.length} resp.`}
                            {asistentes.length > 0 && `, ${asistentes.length} asis.`}
                            {estudiantes.length > 0 && `, ${estudiantes.length} est.`}
                          </small>
                        </div>
                      </td>
                      <td>
                        <span className="tramites-count">{totalTramites}</span>
                      </td>
                      <td>
                        <span className={`estado-badge ${grupo.activo ? 'activo' : 'inactivo'}`}>
                          {grupo.activo ? (
                            <>
                              <FaCheckCircle /> Activo
                            </>
                          ) : (
                            <>
                              <FaTimesCircle /> Inactivo
                            </>
                          )}
                        </span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="action-buttons">
                          {(hasRole('admin') || hasRole('docente')) && (
                            <button
                              onClick={() => {
                                setSelectedGrupo(grupo);
                                setShowModifyMembers(true);
                                loadDocentes();
                                loadEstudiantes();
                              }}
                              className="btn-icon btn-edit"
                              title="Modificar Miembros"
                            >
                              <FaEdit />
                            </button>
                          )}
                          {hasRole('admin') && hasAccessLevel(1) && (
                            <button
                              onClick={async () => {
                                if (!window.confirm(`¿Está seguro de que desea eliminar el grupo "${grupo.nombre}"?\n\nEsta acción no se puede deshacer.`)) {
                                  return;
                                }
                                
                                try {
                                  await ApiService.deleteGrupo(grupo.id_grupo);
                                  showToast('Grupo eliminado exitosamente', 'success');
                                  await loadGrupos();
                                } catch (err: any) {
                                  showToast(`Error al eliminar grupo: ${err.message}`, 'error');
                                }
                              }}
                              className="btn-icon btn-danger"
                              title="Eliminar Grupo"
                            >
                              <FaTrash />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedRows.has(grupo.id_grupo) && (
                      <tr className="grupo-details-row">
                        <td colSpan={7}>
                          <div className="grupo-details">
                            <div className="details-grid">
                              <div className="detail-item full-width">
                                <strong>Descripción:</strong>
                                <span>{grupo.descripcion || 'Sin descripción'}</span>
                              </div>
                              <div className="detail-item">
                                <strong>Total de Miembros:</strong>
                                <span>{totalMiembros}</span>
                              </div>
                              <div className="detail-item">
                                <strong>Total de Trámites:</strong>
                                <span>{totalTramites}</span>
                              </div>
                              <div className="detail-item full-width">
                                <strong>Responsable:</strong>
                                {responsables.length > 0 ? (
                                  <div className="miembro-detail responsable">
                                    <FaUserTie />
                                    <span>{responsables[0].usuario.nombre}</span>
                                    <small>CI: {responsables[0].usuario.ci}</small>
                                  </div>
                                ) : (
                                  <span className="no-data">Sin responsable asignado</span>
                                )}
                              </div>
                              {asistentes.length > 0 && (
                                <div className="detail-item full-width">
                                  <strong>Asistentes ({asistentes.length}):</strong>
                                  <div className="miembros-detail-list">
                                    {asistentes.map(a => (
                                      <div key={a.id_usuario_grupo} className="miembro-detail asistente">
                                        <FaUserTie />
                                        <span>{a.usuario.nombre}</span>
                                        <small>CI: {a.usuario.ci}</small>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {estudiantes.length > 0 && (
                                <div className="detail-item full-width">
                                  <strong>Estudiantes ({estudiantes.length}):</strong>
                                  <div className="miembros-detail-list">
                                    {estudiantes.map(e => (
                                      <div key={e.id_usuario_grupo} className="miembro-detail estudiante">
                                        <FaUser />
                                        <span>{e.usuario.nombre}</span>
                                        <small>CI: {e.usuario.ci}</small>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedGrupo && (
        <div className="modal-overlay" onClick={() => {
          setSelectedGrupo(null);
          setShowModifyMembers(false);
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2>{selectedGrupo.nombre}</h2>
                <span className={`estado-badge ${selectedGrupo.activo ? 'activo' : 'inactivo'}`}>
                  {selectedGrupo.activo ? '✓ Activo' : '⏸ Inactivo'}
                </span>
              </div>
              <button className="close-btn" onClick={() => {
                setSelectedGrupo(null);
                setShowModifyMembers(false);
              }}>×</button>
            </div>
            
            <div className="modal-body">
              {selectedGrupo.descripcion && (
                <p className="descripcion">{selectedGrupo.descripcion}</p>
              )}

              {!showModifyMembers ? (
                <>
                  <div className="detalle-miembros-header">
                    <h3>👥 Miembros del Grupo</h3>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      {hasRole('admin') && (
                        <button 
                          className={`btn-toggle-activo ${selectedGrupo.activo ? 'deactivate' : 'activate'}`}
                          onClick={() => handleToggleActivo(selectedGrupo)}
                          title={selectedGrupo.activo ? 'Desactivar grupo' : 'Activar grupo'}
                        >
                          {selectedGrupo.activo ? '⏸ Desactivar' : '▶ Activar'}
                        </button>
                      )}
                      {(hasRole('admin') || hasRole('docente')) && (
                        <button 
                          className="btn-add-member"
                          onClick={handleOpenModifyMembers}
                        >
                          ✏️ Modificar Miembros
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="detalle-miembros">
                    <div className="miembros-seccion">
                      <h4>👨‍🏫 Responsable</h4>
                      {getMiembrosByRol(selectedGrupo, 'responsable').map(m => (
                        <div key={m.id_usuario_grupo} className="detalle-miembro">
                          <div className="miembro-info">
                            <span className="nombre">{m.usuario.nombre}</span>
                            <span className="ci">CI: {m.usuario.ci}</span>
                          </div>
                          {canRemoveMember(m) && (hasRole('admin') || hasRole('docente')) && (
                            <button
                              className="btn-remove-member"
                              onClick={() => handleRemoveMember(m.id_usuario_grupo)}
                              title="Eliminar miembro"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                      {getMiembrosByRol(selectedGrupo, 'responsable').length === 0 && (
                        <p className="no-miembros-text">Sin responsable asignado</p>
                      )}
                    </div>

                    <div className="miembros-seccion">
                      <div className="miembros-seccion-header">
                        <h4>👥 Asistentes ({getMiembrosByRol(selectedGrupo, 'asistente').length})</h4>
                      </div>
                      {getMiembrosByRol(selectedGrupo, 'asistente').length > 0 ? (
                        getMiembrosByRol(selectedGrupo, 'asistente').map(m => (
                          <div key={m.id_usuario_grupo} className="detalle-miembro">
                            <div className="miembro-info">
                              <span className="nombre">{m.usuario.nombre}</span>
                              <span className="ci">CI: {m.usuario.ci}</span>
                            </div>
                            {(hasRole('admin') || hasRole('docente')) && (
                              <button
                                className="btn-remove-member"
                                onClick={() => handleRemoveMember(m.id_usuario_grupo)}
                                title="Eliminar miembro"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="no-miembros-text">Sin asistentes asignados</p>
                      )}
                    </div>

                    <div className="miembros-seccion">
                      <div className="miembros-seccion-header">
                        <h4>👨‍🎓 Estudiantes ({getMiembrosByRol(selectedGrupo, 'estudiante').length})</h4>
                      </div>
                      {getMiembrosByRol(selectedGrupo, 'estudiante').length > 0 ? (
                        getMiembrosByRol(selectedGrupo, 'estudiante').map(m => (
                          <div key={m.id_usuario_grupo} className="detalle-miembro">
                            <div className="miembro-info">
                              <span className="nombre">{m.usuario.nombre}</span>
                              <span className="ci">CI: {m.usuario.ci}</span>
                            </div>
                            {(hasRole('admin') || hasRole('docente')) && (
                              <button
                                className="btn-remove-member"
                                onClick={() => handleRemoveMember(m.id_usuario_grupo)}
                                title="Eliminar miembro"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="no-miembros-text">Sin estudiantes asignados</p>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="add-member-form">
                  <h3>✏️ Modificar Miembros del Grupo</h3>
                  
                  {loadingMembers ? (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                      <p>Cargando miembros...</p>
                    </div>
                  ) : (
                    <>
                      <div className="form-content">
                        <div className="form-group">
                          <label htmlFor="responsable">Docente Responsable *</label>
                          <select
                            id="responsable"
                            value={editFormData.responsable_id}
                            onChange={(e) => handleResponsableChange(e.target.value)}
                            disabled={saving}
                            required
                          >
                            <option value="">Seleccionar docente responsable</option>
                            {docentes.map((d) => (
                              <option key={d.id_usuario} value={d.id_usuario.toString()}>
                                {d.nombre} - CI: {d.ci}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="form-group">
                          <label>Docentes Asistentes (opcional)</label>
                          <div className="asistentes-list">
                            {docentes.filter(d => d.id_usuario.toString() !== editFormData.responsable_id).length === 0 ? (
                              <p className="no-docentes">
                                {editFormData.responsable_id 
                                  ? 'No hay más docentes disponibles como asistentes' 
                                  : 'Seleccione primero un responsable'}
                              </p>
                            ) : (
                              docentes
                                .filter(d => d.id_usuario.toString() !== editFormData.responsable_id)
                                .map((d) => (
                                  <div key={d.id_usuario} className="asistente-item">
                                    <label>
                                      <input
                                        type="checkbox"
                                        checked={editFormData.asistentes_ids.includes(d.id_usuario.toString())}
                                        onChange={() => handleAsistenteToggle(d.id_usuario.toString())}
                                        disabled={saving}
                                      />
                                      <span>{d.nombre} - CI: {d.ci}</span>
                                    </label>
                                  </div>
                                ))
                            )}
                          </div>
                          <p className="selection-count">
                            Seleccionados: {editFormData.asistentes_ids.length}
                          </p>
                        </div>

                        <div className="form-group">
                          <label>Estudiantes (opcional)</label>
                          <p className="hint-text" style={{ fontSize: '0.85em', color: '#666', marginBottom: '10px' }}>
                            Nota: Los estudiantes solo pueden pertenecer a un grupo. Si un estudiante ya está en otro grupo, no podrá agregarse.
                          </p>
                          <div className="estudiantes-list">
                            {estudiantes.length === 0 ? (
                              <p className="no-docentes">
                                No hay estudiantes disponibles
                              </p>
                            ) : (
                              estudiantes.map((e) => (
                                <div key={e.id_usuario} className="asistente-item">
                                  <label>
                                    <input
                                      type="checkbox"
                                      checked={editFormData.estudiantes_ids.includes(e.id_usuario.toString())}
                                      onChange={() => handleEstudianteToggle(e.id_usuario.toString())}
                                      disabled={saving}
                                    />
                                    <span>{e.nombre} - CI: {e.ci}</span>
                                  </label>
                                </div>
                              ))
                            )}
                          </div>
                          <p className="selection-count">
                            Seleccionados: {editFormData.estudiantes_ids.length}
                          </p>
                        </div>
                      </div>
                      
                      <div className="form-actions-container">
                        <div className="form-actions">
                          <button
                            className="btn-cancel"
                            onClick={() => setShowModifyMembers(false)}
                            disabled={saving}
                          >
                            Cancelar
                          </button>
                          <button
                            className="btn-submit"
                            onClick={handleSaveMembers}
                            disabled={saving || !editFormData.responsable_id}
                          >
                            {saving ? 'Guardando...' : '💾 Guardar Cambios'}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

