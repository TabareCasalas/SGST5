import { useEffect, useState, useCallback, useRef } from 'react';
import type { JSX } from 'react';
import { ApiService } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  FaFileAlt, FaChevronDown, FaChevronUp, FaClock, FaCheckCircle, 
  FaUser, FaUsers, FaCalendarAlt, FaSearch, FaTimes, FaUserTie, FaPlay
} from 'react-icons/fa';
import { SearchInput } from './SearchInput';
import { formatDateTime } from '../utils/dateFormatter';
import './FichasList.css';

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

export function EstudianteFichasList() {
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [showIniciarModal, setShowIniciarModal] = useState(false);
  const [fichaIniciar, setFichaIniciar] = useState<Ficha | null>(null);
  const [iniciando, setIniciando] = useState(false);
  const { showToast } = useToast();
  const { user } = useAuth();

  // Debounce del término de búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadFichas = useCallback(async () => {
    // Guardar si el input tenía foco antes de cargar
    const hadFocus = document.activeElement === searchInputRef.current;
    
    try {
      setLoading(true);
      
      // Obtener el grupo del estudiante
      if (!user || !user.grupos_participa || user.grupos_participa.length === 0) {
        setFichas([]);
        setLoading(false);
        return;
      }

      const grupoId = user.grupos_participa[0].id_grupo;
      
      // Preparar filtros
      const filters: any = {};
      if (debouncedSearchTerm && debouncedSearchTerm.trim() !== '') {
        filters.search = debouncedSearchTerm.trim();
      }
      
      // Obtener fichas asignadas o iniciadas
      let data = await ApiService.getFichas(filters);
      
      // Filtrar solo fichas asignadas o iniciadas a este grupo
      data = data.filter((f: Ficha) => {
        const fichaGrupoId = f.id_grupo || f.grupo?.id_grupo;
        return fichaGrupoId === grupoId && (f.estado === 'asignada' || f.estado === 'iniciada');
      });
      
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
  }, [debouncedSearchTerm, user, showToast]);

  useEffect(() => {
    loadFichas();
    // Auto-refresh cada 30 segundos
    const interval = setInterval(loadFichas, 30000);
    return () => clearInterval(interval);
  }, [loadFichas]);

  const toggleRow = (id: number) => {
    const newExpanded = new Set(expandedRows);
    if (expandedRows.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const getEstadoBadge = (estado: string) => {
    const estados: Record<string, { label: string; className: string; icon: JSX.Element }> = {
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

    const estadoInfo = estados[estado] || estados.asignada;
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

  const handleIniciarTramite = (ficha: Ficha) => {
    if (ficha.estado !== 'asignada') {
      showToast('Solo se pueden iniciar trámites desde fichas asignadas', 'warning');
      return;
    }
    setFichaIniciar(ficha);
    setShowIniciarModal(true);
  };

  const handleConfirmarInicio = async () => {
    if (!fichaIniciar) {
      return;
    }

    setIniciando(true);
    try {
      await ApiService.iniciarTramiteDesdeFicha(fichaIniciar.id_ficha);
      showToast('Trámite iniciado exitosamente. El número de carpeta se asignó automáticamente.', 'success');
      setShowIniciarModal(false);
      setFichaIniciar(null);
      await loadFichas();
    } catch (err: any) {
      showToast(`Error al iniciar trámite: ${err.message}`, 'error');
    } finally {
      setIniciando(false);
    }
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
          <h2>📄 Fichas Asignadas a Mi Grupo</h2>
        </div>
        <div className="header-actions">
          <div className="search-container">
            <FaSearch className="search-icon" />
            <SearchInput
              ref={searchInputRef}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por número, consultante, tema..."
            />
            {searchTerm && (
              <button
                className="search-clear-btn"
                onClick={() => setSearchTerm('')}
                title="Limpiar búsqueda"
              >
                <FaTimes />
              </button>
            )}
          </div>
        </div>
      </div>

      {fichas.length === 0 ? (
        <div className="no-fichas-message">
          <FaFileAlt className="no-fichas-icon" />
          <p>No hay fichas asignadas a tu grupo</p>
        </div>
      ) : (
        <div className="fichas-table-container">
          <table className="fichas-table">
            <thead>
              <tr>
                <th>Número</th>
                <th>Consultante</th>
                <th>Fecha de Cita</th>
                <th>Estado</th>
                <th>Docente</th>
                <th>Acciones</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {fichas.map((ficha) => (
                <>
                  <tr key={ficha.id_ficha} className={expandedRows.has(ficha.id_ficha) ? 'expanded' : ''}>
                    <td>
                      <div className="ficha-numero-cell">
                        <FaFileAlt className="ficha-icon" />
                        <strong>{ficha.numero_consulta}</strong>
                      </div>
                    </td>
                    <td>
                      <div className="consultante-cell">
                        <FaUser className="user-icon" />
                        <span>{ficha.consultante.usuario.nombre}</span>
                      </div>
                    </td>
                    <td>
                      <div className="fecha-cell">
                        <FaCalendarAlt className="calendar-icon" />
                        <span>{formatDate(ficha.fecha_cita, ficha.hora_cita)}</span>
                      </div>
                    </td>
                    <td>{getEstadoBadge(ficha.estado)}</td>
                    <td>
                      <div className="docente-cell">
                        <FaUserTie className="docente-icon" />
                        <span>{ficha.docente.nombre}</span>
                      </div>
                    </td>
                    <td>
                      {ficha.estado === 'asignada' && (
                        <button
                          className="btn-iniciar-tramite"
                          onClick={() => handleIniciarTramite(ficha)}
                          title="Iniciar trámite desde esta ficha"
                        >
                          <FaPlay /> Iniciar
                        </button>
                      )}
                    </td>
                    <td>
                      <button
                        className="expand-btn"
                        onClick={() => toggleRow(ficha.id_ficha)}
                        title={expandedRows.has(ficha.id_ficha) ? 'Ocultar detalles' : 'Ver detalles'}
                      >
                        {expandedRows.has(ficha.id_ficha) ? <FaChevronUp /> : <FaChevronDown />}
                      </button>
                    </td>
                  </tr>
                  {expandedRows.has(ficha.id_ficha) && (
                    <tr key={`details-${ficha.id_ficha}`} className="ficha-details-row">
                      <td colSpan={7}>
                        <div className="ficha-details">
                          <div className="details-grid">
                            <div className="detail-item">
                              <strong>Tema de Consulta:</strong>
                              <p>{ficha.tema_consulta}</p>
                            </div>
                            {ficha.observaciones && (
                              <div className="detail-item">
                                <strong>Observaciones:</strong>
                                <p>{ficha.observaciones}</p>
                              </div>
                            )}
                            <div className="detail-item">
                              <strong>CI del Consultante:</strong>
                              <span>{ficha.consultante.usuario.ci}</span>
                            </div>
                            {ficha.grupo && (
                              <div className="detail-item">
                                <strong>Grupo:</strong>
                                <span>{ficha.grupo.nombre}</span>
                              </div>
                            )}
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

      {/* Modal para iniciar trámite */}
      {showIniciarModal && fichaIniciar && (
        <div className="modal-overlay" onClick={() => setShowIniciarModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Iniciar Trámite desde Ficha</h3>
              <button 
                className="modal-close" 
                onClick={() => setShowIniciarModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="ficha-info-preview">
                <p><strong>Número de Consulta:</strong> {fichaIniciar.numero_consulta}</p>
                <p><strong>Consultante:</strong> {fichaIniciar.consultante.usuario.nombre}</p>
                <p><strong>Tema:</strong> {fichaIniciar.tema_consulta}</p>
              </div>
              <div className="info-message">
                <p>El número de carpeta se asignará automáticamente de forma secuencial.</p>
                <p>¿Desea iniciar el trámite desde esta ficha?</p>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setShowIniciarModal(false)}
                disabled={iniciando}
              >
                Cancelar
              </button>
              <button
                className="btn-primary"
                onClick={handleConfirmarInicio}
                disabled={iniciando}
              >
                {iniciando ? 'Iniciando...' : 'Iniciar Trámite'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

