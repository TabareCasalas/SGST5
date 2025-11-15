import { useState, useEffect } from 'react';
import { ApiService } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { 
  FaChartBar, FaFileAlt, FaUsers, FaUser, FaClock, FaChartLine,
  FaFilter, FaCalendarAlt, FaFilePdf, FaTimes
} from 'react-icons/fa';
import './ReportesPanel.css';

interface FiltrosReporte {
  fecha_desde: string;
  fecha_hasta: string;
  id_grupo: string;
  id_docente: string;
  id_consultante: string;
  id_estudiante: string;
  estado: string;
}

type TipoReporte = 
  | 'dashboard'
  | 'tramites-estado'
  | 'tramites-tiempo'
  | 'tramites-docente'
  | 'tramites-grupo'
  | 'tramites-consultante'
  | 'tramites-desistimientos'
  | 'tramites-antiguos'
  | 'fichas-estado'
  | 'fichas-tiempos'
  | 'fichas-docente'
  | 'grupos-actividad'
  | 'estudiantes-activos'
  | 'estudiantes-documentos'
  | 'evolucion-temporal'
  | 'actuaciones';

export function ReportesPanel() {
  const { showToast } = useToast();
  const [tipoReporte, setTipoReporte] = useState<TipoReporte>('dashboard');
  const [filtros, setFiltros] = useState<FiltrosReporte>({
    fecha_desde: '',
    fecha_hasta: '',
    id_grupo: '',
    id_docente: '',
    id_consultante: '',
    id_estudiante: '',
    estado: '',
  });
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [loading, setLoading] = useState(false);
  const [datos, setDatos] = useState<any>(null);
  const [grupos, setGrupos] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);

  useEffect(() => {
    loadRecursos();
  }, []);

  useEffect(() => {
    if (tipoReporte) {
      loadReporte();
    }
  }, [tipoReporte, filtros]);

  const loadRecursos = async () => {
    try {
      const [gruposData, usuariosData] = await Promise.all([
        ApiService.getGrupos(),
        ApiService.getUsuarios(),
      ]);
      setGrupos(gruposData);
      setUsuarios(usuariosData);
    } catch (error: any) {
      console.error('Error al cargar recursos:', error);
    }
  };

  const loadReporte = async () => {
    try {
      setLoading(true);
      const filtrosParaEnviar: any = {};
      if (filtros.fecha_desde) filtrosParaEnviar.fecha_desde = filtros.fecha_desde;
      if (filtros.fecha_hasta) filtrosParaEnviar.fecha_hasta = filtros.fecha_hasta;
      if (filtros.id_grupo) filtrosParaEnviar.id_grupo = parseInt(filtros.id_grupo);
      if (filtros.id_docente) filtrosParaEnviar.id_docente = parseInt(filtros.id_docente);
      if (filtros.id_consultante) filtrosParaEnviar.id_consultante = parseInt(filtros.id_consultante);
      if (filtros.id_estudiante) filtrosParaEnviar.id_estudiante = parseInt(filtros.id_estudiante);
      if (filtros.estado) filtrosParaEnviar.estado = filtros.estado;

      let resultado;
      switch (tipoReporte) {
        case 'dashboard':
          resultado = await ApiService.getDashboardMetricas(filtrosParaEnviar);
          break;
        case 'tramites-estado':
          resultado = await ApiService.getTramitesPorEstado(filtrosParaEnviar);
          break;
        case 'tramites-tiempo':
          resultado = await ApiService.getTiempoPromedioResolucion(filtrosParaEnviar);
          break;
        case 'tramites-docente':
          resultado = await ApiService.getTramitesPorDocente(filtrosParaEnviar);
          break;
        case 'tramites-grupo':
          resultado = await ApiService.getTramitesPorGrupo(filtrosParaEnviar);
          break;
        case 'tramites-consultante':
          resultado = await ApiService.getTramitesPorConsultante(filtrosParaEnviar);
          break;
        case 'tramites-desistimientos':
          resultado = await ApiService.getAnalisisDesistimientos(filtrosParaEnviar);
          break;
        case 'tramites-antiguos':
          resultado = await ApiService.getTramitesAntiguos(filtrosParaEnviar);
          break;
        case 'fichas-estado':
          resultado = await ApiService.getFichasPorEstado(filtrosParaEnviar);
          break;
        case 'fichas-tiempos':
          resultado = await ApiService.getTiemposProcesamientoFichas(filtrosParaEnviar);
          break;
        case 'fichas-docente':
          resultado = await ApiService.getFichasPorDocente(filtrosParaEnviar);
          break;
        case 'grupos-actividad':
          resultado = await ApiService.getActividadPorGrupo(filtrosParaEnviar);
          break;
        case 'estudiantes-activos':
          resultado = await ApiService.getEstudiantesActivos(filtrosParaEnviar);
          break;
        case 'estudiantes-documentos':
          resultado = await ApiService.getDocumentosPorEstudiante(filtrosParaEnviar);
          break;
        case 'evolucion-temporal':
          resultado = await ApiService.getEvolucionTemporal(filtrosParaEnviar);
          break;
        case 'actuaciones':
          resultado = await ApiService.getActuacionesHojaRuta(filtrosParaEnviar);
          break;
        default:
          return;
      }
      setDatos(resultado);
    } catch (error: any) {
      showToast(`Error al cargar reporte: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const limpiarFiltros = () => {
    setFiltros({
      fecha_desde: '',
      fecha_hasta: '',
      id_grupo: '',
      id_docente: '',
      id_consultante: '',
      id_estudiante: '',
      estado: '',
    });
  };

  const exportarPDF = async () => {
    showToast('Funcionalidad de exportación PDF en desarrollo', 'info');
  };

  const renderReporte = () => {
    if (loading) {
      return <div className="reporte-loading">Cargando reporte...</div>;
    }

    if (!datos) {
      return <div className="reporte-empty">Seleccione un reporte para ver los datos</div>;
    }

    switch (tipoReporte) {
      case 'dashboard':
        return <DashboardMetricas datos={datos} />;
      case 'tramites-estado':
        return <TramitesPorEstado datos={datos} />;
      case 'tramites-tiempo':
        return <TiempoPromedioResolucion datos={datos} />;
      case 'tramites-docente':
        return <TramitesPorDocente datos={datos} />;
      case 'tramites-grupo':
        return <TramitesPorGrupo datos={datos} />;
      case 'tramites-consultante':
        return <TramitesPorConsultante datos={datos} />;
      case 'tramites-desistimientos':
        return <AnalisisDesistimientos datos={datos} />;
      case 'tramites-antiguos':
        return <TramitesAntiguos datos={datos} />;
      case 'fichas-estado':
        return <FichasPorEstado datos={datos} />;
      case 'fichas-tiempos':
        return <TiemposProcesamientoFichas datos={datos} />;
      case 'fichas-docente':
        return <FichasPorDocente datos={datos} />;
      case 'grupos-actividad':
        return <ActividadPorGrupo datos={datos} />;
      case 'estudiantes-activos':
        return <EstudiantesActivos datos={datos} />;
      case 'estudiantes-documentos':
        return <DocumentosPorEstudiante datos={datos} />;
      case 'evolucion-temporal':
        return <EvolucionTemporal datos={datos} />;
      case 'actuaciones':
        return <ActuacionesHojaRuta datos={datos} />;
      default:
        return null;
    }
  };

  return (
    <div className="reportes-panel">
      <div className="reportes-header">
        <div className="header-actions">
          <button
            className="btn-filtros"
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
          >
            <FaFilter />
            {mostrarFiltros ? 'Ocultar' : 'Mostrar'} Filtros
          </button>
          <button className="btn-export" onClick={exportarPDF}>
            <FaFilePdf />
            Exportar PDF
          </button>
        </div>
      </div>

      {mostrarFiltros && (
        <div className="filtros-panel">
          <div className="filtros-grid">
            <div className="filtro-item">
              <label><FaCalendarAlt /> Fecha Desde</label>
              <input
                type="date"
                value={filtros.fecha_desde}
                onChange={(e) => setFiltros({ ...filtros, fecha_desde: e.target.value })}
              />
            </div>
            <div className="filtro-item">
              <label><FaCalendarAlt /> Fecha Hasta</label>
              <input
                type="date"
                value={filtros.fecha_hasta}
                onChange={(e) => setFiltros({ ...filtros, fecha_hasta: e.target.value })}
              />
            </div>
            <div className="filtro-item">
              <label>Grupo</label>
              <select
                value={filtros.id_grupo}
                onChange={(e) => setFiltros({ ...filtros, id_grupo: e.target.value })}
              >
                <option value="">Todos</option>
                {grupos.map(g => (
                  <option key={g.id_grupo} value={g.id_grupo.toString()}>
                    {g.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="filtro-item">
              <label>Docente</label>
              <select
                value={filtros.id_docente}
                onChange={(e) => setFiltros({ ...filtros, id_docente: e.target.value })}
              >
                <option value="">Todos</option>
                {usuarios.filter(u => u.rol === 'docente').map(u => (
                  <option key={u.id_usuario} value={u.id_usuario.toString()}>
                    {u.nombre} ({u.ci})
                  </option>
                ))}
              </select>
            </div>
            <div className="filtro-item">
              <label>Estado</label>
              <select
                value={filtros.estado}
                onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
              >
                <option value="">Todos</option>
                <option value="en_tramite">En Trámite</option>
                <option value="finalizado">Finalizado</option>
                <option value="pendiente">Pendiente</option>
                <option value="desistido">Desistido</option>
              </select>
            </div>
          </div>
          <div className="filtros-actions">
            <button className="btn-limpiar" onClick={limpiarFiltros}>
              <FaTimes /> Limpiar Filtros
            </button>
          </div>
        </div>
      )}

      <div className="reportes-content">
        <div className="reportes-sidebar">
          <div className="reporte-categoria">
            <h3><FaChartLine /> Dashboard</h3>
            <button
              className={tipoReporte === 'dashboard' ? 'active' : ''}
              onClick={() => setTipoReporte('dashboard')}
            >
              Métricas Generales
            </button>
          </div>

          <div className="reporte-categoria">
            <h3><FaFileAlt /> Trámites</h3>
            <button
              className={tipoReporte === 'tramites-estado' ? 'active' : ''}
              onClick={() => setTipoReporte('tramites-estado')}
            >
              Por Estado
            </button>
            <button
              className={tipoReporte === 'tramites-tiempo' ? 'active' : ''}
              onClick={() => setTipoReporte('tramites-tiempo')}
            >
              Tiempo Promedio
            </button>
            <button
              className={tipoReporte === 'tramites-docente' ? 'active' : ''}
              onClick={() => setTipoReporte('tramites-docente')}
            >
              Por Docente
            </button>
            <button
              className={tipoReporte === 'tramites-grupo' ? 'active' : ''}
              onClick={() => setTipoReporte('tramites-grupo')}
            >
              Por Grupo
            </button>
            <button
              className={tipoReporte === 'tramites-consultante' ? 'active' : ''}
              onClick={() => setTipoReporte('tramites-consultante')}
            >
              Por Consultante
            </button>
            <button
              className={tipoReporte === 'tramites-desistimientos' ? 'active' : ''}
              onClick={() => setTipoReporte('tramites-desistimientos')}
            >
              Desistimientos
            </button>
            <button
              className={tipoReporte === 'tramites-antiguos' ? 'active' : ''}
              onClick={() => setTipoReporte('tramites-antiguos')}
            >
              Trámites Antiguos
            </button>
          </div>

          <div className="reporte-categoria">
            <h3><FaFileAlt /> Fichas</h3>
            <button
              className={tipoReporte === 'fichas-estado' ? 'active' : ''}
              onClick={() => setTipoReporte('fichas-estado')}
            >
              Por Estado
            </button>
            <button
              className={tipoReporte === 'fichas-tiempos' ? 'active' : ''}
              onClick={() => setTipoReporte('fichas-tiempos')}
            >
              Tiempos de Procesamiento
            </button>
            <button
              className={tipoReporte === 'fichas-docente' ? 'active' : ''}
              onClick={() => setTipoReporte('fichas-docente')}
            >
              Por Docente
            </button>
          </div>

          <div className="reporte-categoria">
            <h3><FaUsers /> Grupos</h3>
            <button
              className={tipoReporte === 'grupos-actividad' ? 'active' : ''}
              onClick={() => setTipoReporte('grupos-actividad')}
            >
              Actividad por Grupo
            </button>
          </div>

          <div className="reporte-categoria">
            <h3><FaUser /> Estudiantes</h3>
            <button
              className={tipoReporte === 'estudiantes-activos' ? 'active' : ''}
              onClick={() => setTipoReporte('estudiantes-activos')}
            >
              Estudiantes Más Activos
            </button>
            <button
              className={tipoReporte === 'estudiantes-documentos' ? 'active' : ''}
              onClick={() => setTipoReporte('estudiantes-documentos')}
            >
              Documentos por Estudiante
            </button>
          </div>

          <div className="reporte-categoria">
            <h3><FaClock /> Actividad</h3>
            <button
              className={tipoReporte === 'evolucion-temporal' ? 'active' : ''}
              onClick={() => setTipoReporte('evolucion-temporal')}
            >
              Evolución Temporal
            </button>
            <button
              className={tipoReporte === 'actuaciones' ? 'active' : ''}
              onClick={() => setTipoReporte('actuaciones')}
            >
              Actuaciones en Hoja de Ruta
            </button>
          </div>
        </div>

        <div className="reportes-main">
          {renderReporte()}
        </div>
      </div>
    </div>
  );
}

// Componentes de visualización de reportes
function DashboardMetricas({ datos }: { datos: any }) {
  return (
    <div className="reporte-container">
      <h3>Dashboard de Métricas Generales</h3>
      <div className="metricas-grid">
        <div className="metrica-card">
          <h4>Trámites</h4>
          <div className="metrica-valor">{datos.tramites?.total || 0}</div>
          <div className="metrica-detalle">
            <span>Finalizados: {datos.tramites?.finalizados || 0}</span>
            <span>Desistidos: {datos.tramites?.desistidos || 0}</span>
            <span>Activos: {datos.tramites?.activos || 0}</span>
          </div>
        </div>
        <div className="metrica-card">
          <h4>Fichas</h4>
          <div className="metrica-valor">{datos.fichas?.total || 0}</div>
          <div className="metrica-detalle">
            <span>Iniciadas: {datos.fichas?.iniciadas || 0}</span>
          </div>
        </div>
        <div className="metrica-card">
          <h4>Recursos</h4>
          <div className="metrica-valor">{datos.recursos?.grupos || 0}</div>
          <div className="metrica-detalle">
            <span>Grupos: {datos.recursos?.grupos || 0}</span>
            <span>Estudiantes: {datos.recursos?.estudiantes || 0}</span>
            <span>Docentes: {datos.recursos?.docentes || 0}</span>
          </div>
        </div>
        <div className="metrica-card">
          <h4>Tasa de Éxito</h4>
          <div className="metrica-valor">{datos.metricas?.tasaExito || 0}%</div>
        </div>
        <div className="metrica-card">
          <h4>Tasa de Conversión</h4>
          <div className="metrica-valor">{datos.metricas?.tasaConversion || 0}%</div>
        </div>
        <div className="metrica-card">
          <h4>Tiempo Promedio</h4>
          <div className="metrica-valor">{datos.metricas?.tiempoPromedioResolucion || 0} días</div>
        </div>
      </div>
    </div>
  );
}

function TramitesPorEstado({ datos }: { datos: any }) {
  return (
    <div className="reporte-container">
      <h3>Distribución de Trámites por Estado</h3>
      <div className="reporte-tabla">
        <table>
          <thead>
            <tr>
              <th>Estado</th>
              <th>Cantidad</th>
              <th>Porcentaje</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(datos.distribucion || {}).map(([estado, cantidad]: [string, any]) => (
              <tr key={estado}>
                <td>{estado}</td>
                <td>{cantidad}</td>
                <td>{datos.porcentajes?.[estado] || 0}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="reporte-total">Total: {datos.total || 0}</div>
      </div>
    </div>
  );
}

function TiempoPromedioResolucion({ datos }: { datos: any }) {
  return (
    <div className="reporte-container">
      <h3>Tiempo Promedio de Resolución</h3>
      <div className="metricas-grid">
        <div className="metrica-card">
          <h4>Promedio General</h4>
          <div className="metrica-valor">{datos.promedio || 0} días</div>
        </div>
        <div className="metrica-card">
          <h4>Mínimo</h4>
          <div className="metrica-valor">{datos.min || 0} días</div>
        </div>
        <div className="metrica-card">
          <h4>Máximo</h4>
          <div className="metrica-valor">{datos.max || 0} días</div>
        </div>
        <div className="metrica-card">
          <h4>Total Analizado</h4>
          <div className="metrica-valor">{datos.total || 0}</div>
        </div>
      </div>
      {datos.porEstado && Object.keys(datos.porEstado).length > 0 && (
        <div className="reporte-tabla">
          <h4>Por Estado</h4>
          <table>
            <thead>
              <tr>
                <th>Estado</th>
                <th>Tiempo Promedio (días)</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(datos.porEstado).map(([estado, tiempo]: [string, any]) => (
                <tr key={estado}>
                  <td>{estado}</td>
                  <td>{Math.round(tiempo * 100) / 100}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TramitesPorDocente({ datos }: { datos: any }) {
  return (
    <div className="reporte-container">
      <h3>Trámites por Docente Responsable</h3>
      <div className="reporte-tabla">
        <table>
          <thead>
            <tr>
              <th>Docente</th>
              <th>Total</th>
              <th>Finalizados</th>
              <th>En Trámite</th>
              <th>Pendientes</th>
              <th>Desistidos</th>
              <th>Tasa Finalización</th>
            </tr>
          </thead>
          <tbody>
            {datos.porDocente?.map((item: any, index: number) => (
              <tr key={index}>
                <td>{item.docente?.nombre || 'N/A'}</td>
                <td>{item.total || 0}</td>
                <td>{item.finalizados || 0}</td>
                <td>{item.enTramite || 0}</td>
                <td>{item.pendientes || 0}</td>
                <td>{item.desistidos || 0}</td>
                <td>{item.tasaFinalizacion || 0}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="reporte-total">Total: {datos.total || 0}</div>
      </div>
    </div>
  );
}

function TramitesPorGrupo({ datos }: { datos: any }) {
  return (
    <div className="reporte-container">
      <h3>Trámites por Grupo</h3>
      <div className="reporte-tabla">
        <table>
          <thead>
            <tr>
              <th>Grupo</th>
              <th>Total</th>
              <th>Finalizados</th>
              <th>En Trámite</th>
              <th>Pendientes</th>
              <th>Desistidos</th>
              <th>Tasa Finalización</th>
            </tr>
          </thead>
          <tbody>
            {datos.porGrupo?.map((item: any, index: number) => (
              <tr key={index}>
                <td>{item.grupo?.nombre || 'N/A'}</td>
                <td>{item.total || 0}</td>
                <td>{item.finalizados || 0}</td>
                <td>{item.enTramite || 0}</td>
                <td>{item.pendientes || 0}</td>
                <td>{item.desistidos || 0}</td>
                <td>{item.tasaFinalizacion || 0}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="reporte-total">Total: {datos.total || 0}</div>
      </div>
    </div>
  );
}

function TramitesPorConsultante({ datos }: { datos: any }) {
  return (
    <div className="reporte-container">
      <h3>Trámites por Consultante</h3>
      <div className="reporte-tabla">
        <table>
          <thead>
            <tr>
              <th>Consultante</th>
              <th>CI</th>
              <th>Total</th>
              <th>Pendientes</th>
            </tr>
          </thead>
          <tbody>
            {datos.porConsultante?.map((item: any, index: number) => (
              <tr key={index}>
                <td>{item.consultante?.nombre || 'N/A'}</td>
                <td>{item.consultante?.ci || 'N/A'}</td>
                <td>{item.total || 0}</td>
                <td>{item.pendientes || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="reporte-total">Total: {datos.total || 0}</div>
      </div>
    </div>
  );
}

function AnalisisDesistimientos({ datos }: { datos: any }) {
  return (
    <div className="reporte-container">
      <h3>Análisis de Desistimientos</h3>
      <div className="metricas-grid">
        <div className="metrica-card">
          <h4>Tasa de Desistimiento</h4>
          <div className="metrica-valor">{datos.tasaDesistimiento || 0}%</div>
        </div>
        <div className="metrica-card">
          <h4>Total Desistidos</h4>
          <div className="metrica-valor">{datos.totalDesistidos || 0}</div>
        </div>
        <div className="metrica-card">
          <h4>Total Trámites</h4>
          <div className="metrica-valor">{datos.total || 0}</div>
        </div>
      </div>
      {datos.motivos && Object.keys(datos.motivos).length > 0 && (
        <div className="reporte-tabla">
          <h4>Motivos Más Frecuentes</h4>
          <table>
            <thead>
              <tr>
                <th>Motivo</th>
                <th>Cantidad</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(datos.motivos).map(([motivo, cantidad]: [string, any]) => (
                <tr key={motivo}>
                  <td>{motivo}</td>
                  <td>{cantidad}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TramitesAntiguos({ datos }: { datos: any }) {
  return (
    <div className="reporte-container">
      <h3>Trámites Más Antiguos (Pendientes de Resolución)</h3>
      <div className="reporte-tabla">
        <table>
          <thead>
            <tr>
              <th>Carpeta</th>
              <th>Consultante</th>
              <th>Grupo</th>
              <th>Estado</th>
              <th>Días Pendiente</th>
            </tr>
          </thead>
          <tbody>
            {datos.tramites?.map((t: any, index: number) => (
              <tr key={index}>
                <td>{t.num_carpeta || 'N/A'}</td>
                <td>{t.consultante?.usuario?.nombre || 'N/A'}</td>
                <td>{t.grupo?.nombre || 'N/A'}</td>
                <td>{t.estado || 'N/A'}</td>
                <td>{t.diasPendiente || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="reporte-total">Total: {datos.total || 0}</div>
      </div>
    </div>
  );
}

function FichasPorEstado({ datos }: { datos: any }) {
  return (
    <div className="reporte-container">
      <h3>Distribución de Fichas por Estado</h3>
      <div className="reporte-tabla">
        <table>
          <thead>
            <tr>
              <th>Estado</th>
              <th>Cantidad</th>
              <th>Porcentaje</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(datos.distribucion || {}).map(([estado, cantidad]: [string, any]) => (
              <tr key={estado}>
                <td>{estado}</td>
                <td>{cantidad}</td>
                <td>{datos.porcentajes?.[estado] || 0}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="reporte-total">Total: {datos.total || 0}</div>
      </div>
    </div>
  );
}

function TiemposProcesamientoFichas({ datos }: { datos: any }) {
  return (
    <div className="reporte-container">
      <h3>Tiempos de Procesamiento de Fichas</h3>
      <div className="metricas-grid">
        <div className="metrica-card">
          <h4>Tiempo Promedio Aprobación</h4>
          <div className="metrica-valor">{Math.round((datos.tiempoPromedioAprobacion || 0) * 100) / 100} días</div>
        </div>
        <div className="metrica-card">
          <h4>Tiempo Promedio Asignación</h4>
          <div className="metrica-valor">{Math.round((datos.tiempoPromedioAsignacion || 0) * 100) / 100} días</div>
        </div>
        <div className="metrica-card">
          <h4>Tiempo Promedio Inicio</h4>
          <div className="metrica-valor">{Math.round((datos.tiempoPromedioInicio || 0) * 100) / 100} días</div>
        </div>
        <div className="metrica-card">
          <h4>Total Aprobadas</h4>
          <div className="metrica-valor">{datos.totalAprobadas || 0}</div>
        </div>
        <div className="metrica-card">
          <h4>Total Asignadas</h4>
          <div className="metrica-valor">{datos.totalAsignadas || 0}</div>
        </div>
        <div className="metrica-card">
          <h4>Total Iniciadas</h4>
          <div className="metrica-valor">{datos.totalIniciadas || 0}</div>
        </div>
      </div>
    </div>
  );
}

function FichasPorDocente({ datos }: { datos: any }) {
  return (
    <div className="reporte-container">
      <h3>Fichas por Docente</h3>
      <div className="reporte-tabla">
        <table>
          <thead>
            <tr>
              <th>Docente</th>
              <th>Total</th>
              <th>Asignadas</th>
              <th>Iniciadas</th>
              <th>Tasa Conversión</th>
            </tr>
          </thead>
          <tbody>
            {datos.porDocente?.map((item: any, index: number) => (
              <tr key={index}>
                <td>{item.docente?.nombre || 'N/A'}</td>
                <td>{item.total || 0}</td>
                <td>{item.asignadas || 0}</td>
                <td>{item.iniciadas || 0}</td>
                <td>{item.tasaConversion || 0}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="reporte-total">Total: {datos.total || 0}</div>
      </div>
    </div>
  );
}

function ActividadPorGrupo({ datos }: { datos: any }) {
  return (
    <div className="reporte-container">
      <h3>Actividad por Grupo</h3>
      <div className="reporte-tabla">
        <table>
          <thead>
            <tr>
              <th>Grupo</th>
              <th>Miembros</th>
              <th>Trámites Total</th>
              <th>Trámites Activos</th>
              <th>Trámites Finalizados</th>
              <th>Fichas Total</th>
              <th>Fichas Asignadas</th>
            </tr>
          </thead>
          <tbody>
            {datos.porGrupo?.map((item: any, index: number) => (
              <tr key={index}>
                <td>{item.grupo?.nombre || 'N/A'}</td>
                <td>
                  {item.miembros?.total || 0} 
                  (R: {item.miembros?.responsables || 0}, 
                  A: {item.miembros?.asistentes || 0}, 
                  E: {item.miembros?.estudiantes || 0})
                </td>
                <td>{item.tramites?.total || 0}</td>
                <td>{item.tramites?.activos || 0}</td>
                <td>{item.tramites?.finalizados || 0}</td>
                <td>{item.fichas?.total || 0}</td>
                <td>{item.fichas?.asignadas || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="reporte-total">Total Grupos: {datos.total || 0}</div>
      </div>
    </div>
  );
}

function EstudiantesActivos({ datos }: { datos: any }) {
  return (
    <div className="reporte-container">
      <h3>Estudiantes Más Activos</h3>
      <div className="reporte-tabla">
        <table>
          <thead>
            <tr>
              <th>Estudiante</th>
              <th>CI</th>
              <th>Actuaciones</th>
            </tr>
          </thead>
          <tbody>
            {datos.estudiantes?.map((item: any, index: number) => (
              <tr key={index}>
                <td>{item.estudiante?.nombre || 'N/A'}</td>
                <td>{item.estudiante?.ci || 'N/A'}</td>
                <td>{item.actuaciones || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="reporte-total">Total Actuaciones: {datos.total || 0}</div>
      </div>
    </div>
  );
}

function DocumentosPorEstudiante({ datos }: { datos: any }) {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="reporte-container">
      <h3>Documentos por Estudiante</h3>
      <div className="reporte-tabla">
        <table>
          <thead>
            <tr>
              <th>Estudiante</th>
              <th>CI</th>
              <th>Documentos</th>
              <th>Tamaño Total</th>
            </tr>
          </thead>
          <tbody>
            {datos.porEstudiante?.map((item: any, index: number) => (
              <tr key={index}>
                <td>{item.estudiante?.nombre || 'N/A'}</td>
                <td>{item.estudiante?.ci || 'N/A'}</td>
                <td>{item.documentos || 0}</td>
                <td>{formatBytes(item.tamanoTotal || 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="reporte-total">
          Total Documentos: {datos.totalDocumentos || 0} | 
          Tamaño Total: {formatBytes(datos.tamanoTotal || 0)}
        </div>
      </div>
    </div>
  );
}

function EvolucionTemporal({ datos }: { datos: any }) {
  return (
    <div className="reporte-container">
      <h3>Evolución Temporal de Trámites</h3>
      <div className="reporte-tabla">
        <table>
          <thead>
            <tr>
              <th>Mes</th>
              <th>Total</th>
              <th>En Trámite</th>
              <th>Finalizados</th>
              <th>Pendientes</th>
              <th>Desistidos</th>
            </tr>
          </thead>
          <tbody>
            {datos.porMes?.map((item: any, index: number) => (
              <tr key={index}>
                <td>{item.mes}</td>
                <td>{item.total || 0}</td>
                <td>{item.porEstado?.en_tramite || 0}</td>
                <td>{item.porEstado?.finalizado || 0}</td>
                <td>{item.porEstado?.pendiente || 0}</td>
                <td>{item.porEstado?.desistido || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="reporte-total">Total: {datos.total || 0}</div>
      </div>
    </div>
  );
}

function ActuacionesHojaRuta({ datos }: { datos: any }) {
  return (
    <div className="reporte-container">
      <h3>Actuaciones en Hoja de Ruta</h3>
      <div className="metricas-grid">
        <div className="metrica-card">
          <h4>Total Actuaciones</h4>
          <div className="metrica-valor">{datos.total || 0}</div>
        </div>
        <div className="metrica-card">
          <h4>Promedio por Trámite</h4>
          <div className="metrica-valor">{datos.promedioPorTramite || 0}</div>
        </div>
      </div>
      <div className="reporte-tabla">
        <h4>Actuaciones por Trámite</h4>
        <table>
          <thead>
            <tr>
              <th>Carpeta</th>
              <th>Actuaciones</th>
            </tr>
          </thead>
          <tbody>
            {datos.porTramite?.map((item: any, index: number) => (
              <tr key={index}>
                <td>{item.tramite?.num_carpeta || 'N/A'}</td>
                <td>{item.actuaciones || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


