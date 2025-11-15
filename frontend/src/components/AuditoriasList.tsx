import { useEffect, useState, useCallback, useRef } from 'react';
import { ApiService } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { 
  FaHistory, FaSearch, FaTimes, FaFilter, FaUser, FaCalendarAlt,
  FaFileAlt, FaUsers, FaUserTie, FaCheckCircle, FaEdit, FaTrash, FaFilePdf
} from 'react-icons/fa';
import { SearchInput } from './SearchInput';
import { formatDateTime, formatDate } from '../utils/dateFormatter';
import './AuditoriasList.css';

interface Auditoria {
  id_auditoria: number;
  id_usuario?: number;
  tipo_entidad: string;
  id_entidad?: number;
  accion: string;
  detalles?: string;
  ip_address?: string;
  created_at: string;
  usuario?: {
    id_usuario: number;
    nombre: string;
    ci: string;
    rol: string;
  };
}

export function AuditoriasList() {
  const { showToast } = useToast();
  const [auditorias, setAuditorias] = useState<Auditoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [filtros, setFiltros] = useState({
    tipo_entidad: '',
    accion: '',
    fecha_desde: '',
    fecha_hasta: '',
    id_usuario: '',
  });
  const [usuarios, setUsuarios] = useState<Array<{ id_usuario: number; nombre: string; ci: string; rol: string }>>([]);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [limite] = useState(50);

  // Debounce del término de búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    loadUsuarios();
  }, []);

  useEffect(() => {
    loadAuditorias();
  }, [debouncedSearchTerm, filtros, pagina]);

  const loadUsuarios = async () => {
    try {
      const data = await ApiService.getUsuarios();
      setUsuarios(data.map((u: any) => ({
        id_usuario: u.id_usuario,
        nombre: u.nombre,
        ci: u.ci,
        rol: u.rol,
      })));
    } catch (err: any) {
      console.error('Error al cargar usuarios:', err);
    }
  };

  const loadAuditorias = useCallback(async () => {
    // Guardar si el input tenía foco antes de cargar
    const hadFocus = document.activeElement === searchInputRef.current;
    
    try {
      setLoading(true);
      setError(null);

      const filters: any = {
        limit: limite,
        offset: (pagina - 1) * limite,
      };

      if (filtros.tipo_entidad) filters.tipo_entidad = filtros.tipo_entidad;
      if (filtros.accion) filters.accion = filtros.accion;
      if (filtros.fecha_desde) filters.fecha_desde = filtros.fecha_desde;
      if (filtros.fecha_hasta) filters.fecha_hasta = filtros.fecha_hasta;
      if (filtros.id_usuario) filters.id_usuario = parseInt(filtros.id_usuario);

      const data = await ApiService.getAuditorias(filters);
      setAuditorias(data.auditorias || []);
      setTotal(data.total || 0);
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
  }, [debouncedSearchTerm, filtros, pagina, limite]);

  useEffect(() => {
    loadAuditorias();
  }, [loadAuditorias]);

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'usuario':
        return <FaUser className="tipo-icon" />;
      case 'tramite':
        return <FaFileAlt className="tipo-icon" />;
      case 'grupo':
        return <FaUsers className="tipo-icon" />;
      case 'ficha':
        return <FaFileAlt className="tipo-icon" />;
      case 'auth':
        return <FaUserTie className="tipo-icon" />;
      default:
        return <FaHistory className="tipo-icon" />;
    }
  };

  const getAccionIcon = (accion: string) => {
    switch (accion) {
      case 'crear':
        return <FaCheckCircle className="accion-icon crear" />;
      case 'modificar':
      case 'actualizar':
        return <FaEdit className="accion-icon modificar" />;
      case 'eliminar':
        return <FaTrash className="accion-icon eliminar" />;
      default:
        return <FaHistory className="accion-icon" />;
    }
  };

  const formatFecha = (fecha: string) => {
    return formatDateTime(fecha);
  };

  const limpiarFiltros = () => {
    setFiltros({
      tipo_entidad: '',
      accion: '',
      fecha_desde: '',
      fecha_hasta: '',
      id_usuario: '',
    });
    setPagina(1);
  };

  const exportarPDF = async (todosLosLogs: boolean = false) => {
    try {
      showToast('Generando PDF...', 'info');
      
      // Importación dinámica de jsPDF
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      let yPosition = margin;

      // Función para agregar nueva página si es necesario
      const checkPageBreak = (requiredSpace: number) => {
        if (yPosition + requiredSpace > pageHeight - margin) {
          doc.addPage();
          yPosition = margin;
          return true;
        }
        return false;
      };

      // Encabezado
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('REPORTE DE AUDITORÍAS DEL SISTEMA', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      // Información del reporte
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const fechaActual = formatDateTime(new Date());
      doc.text(`Fecha de generación: ${fechaActual}`, margin, yPosition);
      yPosition += 6;

      if (!todosLosLogs) {
        // Mostrar filtros aplicados
        doc.setFont('helvetica', 'bold');
        doc.text('Filtros aplicados:', margin, yPosition);
        yPosition += 6;
        doc.setFont('helvetica', 'normal');
        
        if (filtros.tipo_entidad) {
          doc.text(`  • Tipo de entidad: ${filtros.tipo_entidad}`, margin, yPosition);
          yPosition += 5;
        }
        if (filtros.accion) {
          doc.text(`  • Acción: ${filtros.accion}`, margin, yPosition);
          yPosition += 5;
        }
        if (filtros.fecha_desde) {
          doc.text(`  • Fecha desde: ${filtros.fecha_desde}`, margin, yPosition);
          yPosition += 5;
        }
        if (filtros.fecha_hasta) {
          doc.text(`  • Fecha hasta: ${filtros.fecha_hasta}`, margin, yPosition);
          yPosition += 5;
        }
        if (filtros.id_usuario) {
          const usuarioSeleccionado = usuarios.find(u => u.id_usuario.toString() === filtros.id_usuario);
          if (usuarioSeleccionado) {
            doc.text(`  • Usuario: ${usuarioSeleccionado.nombre} (${usuarioSeleccionado.ci})`, margin, yPosition);
            yPosition += 5;
          }
        }
        if (!filtros.tipo_entidad && !filtros.accion && !filtros.fecha_desde && !filtros.fecha_hasta && !filtros.id_usuario) {
          doc.text('  • Sin filtros específicos (página actual)', margin, yPosition);
          yPosition += 5;
        }
      } else {
        doc.setFont('helvetica', 'bold');
        doc.text('Reporte completo: Todos los registros', margin, yPosition);
        yPosition += 6;
      }

      yPosition += 5;

      // Línea separadora
      doc.setLineWidth(0.5);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 8;

      // Obtener todos los datos según el caso
      let datosParaExportar: Auditoria[] = [];
      
      if (todosLosLogs) {
        // Obtener todos los logs sin filtros ni paginación
        const filters: any = {};
        // Aplicar solo filtros de fecha y usuario si existen (para no sobrecargar)
        if (filtros.fecha_desde) filters.fecha_desde = filtros.fecha_desde;
        if (filtros.fecha_hasta) filters.fecha_hasta = filtros.fecha_hasta;
        if (filtros.id_usuario) filters.id_usuario = parseInt(filtros.id_usuario);
        
        // Obtener en lotes grandes
        let offset = 0;
        const batchSize = 1000;
        let hasMore = true;
        
        while (hasMore) {
          const batchFilters = { ...filters, limit: batchSize, offset };
          const data = await ApiService.getAuditorias(batchFilters);
          if (data.auditorias && data.auditorias.length > 0) {
            datosParaExportar = [...datosParaExportar, ...data.auditorias];
            offset += batchSize;
            hasMore = data.auditorias.length === batchSize;
          } else {
            hasMore = false;
          }
        }
      } else {
        // Usar los datos actuales con filtros aplicados
        // Obtener todos los registros que coincidan con los filtros actuales
        const filters: any = {};
        if (filtros.tipo_entidad) filters.tipo_entidad = filtros.tipo_entidad;
        if (filtros.accion) filters.accion = filtros.accion;
        if (filtros.fecha_desde) filters.fecha_desde = filtros.fecha_desde;
        if (filtros.fecha_hasta) filters.fecha_hasta = filtros.fecha_hasta;
        if (filtros.id_usuario) filters.id_usuario = parseInt(filtros.id_usuario);
        
        // Obtener en lotes
        let offset = 0;
        const batchSize = 1000;
        let hasMore = true;
        
        while (hasMore) {
          const batchFilters = { ...filters, limit: batchSize, offset };
          const data = await ApiService.getAuditorias(batchFilters);
          if (data.auditorias && data.auditorias.length > 0) {
            datosParaExportar = [...datosParaExportar, ...data.auditorias];
            offset += batchSize;
            hasMore = data.auditorias.length === batchSize;
          } else {
            hasMore = false;
          }
        }
      }

      // Aplicar búsqueda de texto si existe
      if (debouncedSearchTerm) {
        const term = debouncedSearchTerm.toLowerCase();
        datosParaExportar = datosParaExportar.filter((aud) => 
          aud.detalles?.toLowerCase().includes(term) ||
          aud.usuario?.nombre.toLowerCase().includes(term) ||
          aud.usuario?.ci.toLowerCase().includes(term) ||
          aud.tipo_entidad.toLowerCase().includes(term) ||
          aud.accion.toLowerCase().includes(term) ||
          aud.ip_address?.toLowerCase().includes(term)
        );
      }

      // Título de la tabla
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`Total de registros: ${datosParaExportar.length}`, margin, yPosition);
      yPosition += 8;

      // Encabezados de tabla
      checkPageBreak(15);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      const colWidths = [32, 38, 28, 28, 45, 30];
      const colPositions = [margin];
      for (let i = 1; i < colWidths.length; i++) {
        colPositions.push(colPositions[i - 1] + colWidths[i - 1]);
      }

      doc.text('Fecha/Hora', colPositions[0], yPosition);
      doc.text('Usuario', colPositions[1], yPosition);
      doc.text('Tipo', colPositions[2], yPosition);
      doc.text('Acción', colPositions[3], yPosition);
      doc.text('Detalles', colPositions[4], yPosition);
      doc.text('IP', colPositions[5], yPosition);
      
      yPosition += 5;
      doc.setLineWidth(0.3);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 5;

      // Datos de la tabla
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      
      datosParaExportar.forEach((auditoria, index) => {
        checkPageBreak(20);

        const fecha = formatFecha(auditoria.created_at);
        const usuario = auditoria.usuario 
          ? `${auditoria.usuario.nombre} (${auditoria.usuario.rol})`
          : 'Sistema';
        const tipo = auditoria.tipo_entidad;
        const accion = auditoria.accion;
        const detalles = auditoria.detalles || '-';
        const ip = auditoria.ip_address || '-';

        // Fecha/Hora
        const fechaLines = doc.splitTextToSize(fecha, colWidths[0] - 2);
        doc.text(fechaLines, colPositions[0], yPosition);
        
        // Usuario
        const usuarioLines = doc.splitTextToSize(usuario, colWidths[1] - 2);
        doc.text(usuarioLines, colPositions[1], yPosition);
        
        // Tipo
        doc.text(tipo, colPositions[2], yPosition);
        
        // Acción
        doc.text(accion, colPositions[3], yPosition);
        
        // Detalles
        const detallesLines = doc.splitTextToSize(detalles, colWidths[4] - 2);
        doc.text(detallesLines, colPositions[4], yPosition);
        
        // IP
        const ipLines = doc.splitTextToSize(ip, colWidths[5] - 2);
        doc.text(ipLines, colPositions[5], yPosition);

        // Calcular altura máxima de esta fila
        const maxHeight = Math.max(
          fechaLines.length * 4,
          usuarioLines.length * 4,
          detallesLines.length * 4,
          ipLines.length * 4,
          4
        );
        yPosition += maxHeight + 2;

        // Línea separadora cada 5 registros
        if ((index + 1) % 5 === 0 && index < datosParaExportar.length - 1) {
          doc.setLineWidth(0.1);
          doc.setDrawColor(200, 200, 200);
          doc.line(margin, yPosition, pageWidth - margin, yPosition);
          yPosition += 2;
          doc.setDrawColor(0, 0, 0);
        }
      });

      // Pie de página
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.text(
          `Página ${i} de ${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }

      // Generar nombre del archivo
      const fechaArchivo = new Date().toISOString().split('T')[0];
      const nombreArchivo = todosLosLogs 
        ? `Auditorias_Completo_${fechaArchivo}.pdf`
        : `Auditorias_Filtradas_${fechaArchivo}.pdf`;

      // Descargar PDF
      doc.save(nombreArchivo);
      showToast('PDF generado exitosamente', 'success');
    } catch (err: any) {
      console.error('Error al generar PDF:', err);
      showToast(`Error al generar PDF: ${err.message}`, 'error');
    }
  };

  const auditoriasFiltradas = auditorias.filter((aud) => {
    if (!debouncedSearchTerm) return true;
    const term = debouncedSearchTerm.toLowerCase();
    return (
      aud.detalles?.toLowerCase().includes(term) ||
      aud.usuario?.nombre.toLowerCase().includes(term) ||
      aud.usuario?.ci.toLowerCase().includes(term) ||
      aud.tipo_entidad.toLowerCase().includes(term) ||
      aud.accion.toLowerCase().includes(term) ||
      aud.ip_address?.toLowerCase().includes(term)
    );
  });

  const totalPaginas = Math.ceil(total / limite);

  if (loading && auditorias.length === 0) {
    return (
      <div className="auditorias-container">
        <div className="loading">Cargando auditorías...</div>
      </div>
    );
  }

  return (
    <div className="auditorias-container">
      <div className="auditorias-header">
        <div className="header-top">
          <div className="header-actions">
            <div className="export-buttons">
              <button
                className="btn-export btn-export-filtered"
                onClick={() => exportarPDF(false)}
                title="Exportar logs con filtros actuales"
              >
                <FaFilePdf />
                Exportar Filtrados
              </button>
              <button
                className="btn-export btn-export-all"
                onClick={() => exportarPDF(true)}
                title="Exportar todos los logs"
              >
                <FaFilePdf />
                Exportar Todos
              </button>
            </div>
            <button
              className="btn-filtros"
              onClick={() => setMostrarFiltros(!mostrarFiltros)}
            >
              <FaFilter />
              {mostrarFiltros ? 'Ocultar' : 'Mostrar'} Filtros
            </button>
          </div>
        </div>

        {/* Barra de búsqueda */}
        <div className="search-bar">
          <FaSearch className="search-icon" />
          <SearchInput
            ref={searchInputRef}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por usuario, acción, detalles, IP..."
          />
          {searchTerm && (
            <button
              className="clear-search"
              onClick={() => setSearchTerm('')}
              title="Limpiar búsqueda"
            >
              <FaTimes />
            </button>
          )}
        </div>

        {/* Filtros */}
        {mostrarFiltros && (
          <div className="filtros-panel">
            <div className="filtros-grid">
              <div className="filtro-item">
                <label>Tipo de Entidad</label>
                <select
                  value={filtros.tipo_entidad}
                  onChange={(e) => setFiltros({ ...filtros, tipo_entidad: e.target.value })}
                >
                  <option value="">Todos</option>
                  <option value="usuario">Usuario</option>
                  <option value="tramite">Trámite</option>
                  <option value="grupo">Grupo</option>
                  <option value="ficha">Ficha</option>
                  <option value="auth">Autenticación</option>
                </select>
              </div>

              <div className="filtro-item">
                <label>Acción</label>
                <select
                  value={filtros.accion}
                  onChange={(e) => setFiltros({ ...filtros, accion: e.target.value })}
                >
                  <option value="">Todas</option>
                  <option value="crear">Crear</option>
                  <option value="modificar">Modificar</option>
                  <option value="eliminar">Eliminar</option>
                  <option value="desactivar">Desactivar</option>
                  <option value="activar">Activar</option>
                  <option value="login">Login</option>
                </select>
              </div>

              <div className="filtro-item">
                <label>
                  <FaCalendarAlt /> Fecha Desde
                </label>
                <input
                  type="date"
                  value={filtros.fecha_desde}
                  onChange={(e) => setFiltros({ ...filtros, fecha_desde: e.target.value })}
                />
              </div>

              <div className="filtro-item">
                <label>
                  <FaCalendarAlt /> Fecha Hasta
                </label>
                <input
                  type="date"
                  value={filtros.fecha_hasta}
                  onChange={(e) => setFiltros({ ...filtros, fecha_hasta: e.target.value })}
                />
              </div>

              <div className="filtro-item">
                <label>
                  <FaUser /> Usuario
                </label>
                <select
                  value={filtros.id_usuario}
                  onChange={(e) => setFiltros({ ...filtros, id_usuario: e.target.value })}
                >
                  <option value="">Todos los usuarios</option>
                  {usuarios.map((usuario) => (
                    <option key={usuario.id_usuario} value={usuario.id_usuario.toString()}>
                      {usuario.nombre} ({usuario.ci}) - {usuario.rol}
                    </option>
                  ))}
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
      </div>

      {error && (
        <div className="error-message">
          Error: {error}
        </div>
      )}

      <div className="auditorias-stats">
        <span>Total de registros: <strong>{total}</strong></span>
        <span>Página {pagina} de {totalPaginas}</span>
      </div>

      {auditorias.length === 0 ? (
        <div className="no-auditorias">
          <FaHistory className="empty-icon" />
          <p>No se encontraron auditorías</p>
        </div>
      ) : (
        <>
          <div className="auditorias-table-container">
            <table className="auditorias-table">
              <thead>
                <tr>
                  <th>Fecha y Hora</th>
                  <th>Usuario</th>
                  <th>Tipo</th>
                  <th>Acción</th>
                  <th>Detalles</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {auditorias.filter((aud) => {
                  if (!debouncedSearchTerm) return true;
                  const term = debouncedSearchTerm.toLowerCase();
                  return (
                    aud.detalles?.toLowerCase().includes(term) ||
                    aud.usuario?.nombre.toLowerCase().includes(term) ||
                    aud.usuario?.ci.toLowerCase().includes(term) ||
                    aud.tipo_entidad.toLowerCase().includes(term) ||
                    aud.accion.toLowerCase().includes(term) ||
                    aud.ip_address?.toLowerCase().includes(term)
                  );
                }).map((auditoria) => (
                  <tr key={auditoria.id_auditoria}>
                    <td className="fecha-cell">
                      {formatFecha(auditoria.created_at)}
                    </td>
                    <td className="usuario-cell">
                      {auditoria.usuario ? (
                        <div className="usuario-info">
                          <FaUser />
                          <div>
                            <strong>{auditoria.usuario.nombre}</strong>
                            <span className="usuario-rol">{auditoria.usuario.rol}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="sin-usuario">Sistema</span>
                      )}
                    </td>
                    <td className="tipo-cell">
                      <div className="tipo-badge">
                        {getTipoIcon(auditoria.tipo_entidad)}
                        <span>{auditoria.tipo_entidad}</span>
                        {auditoria.id_entidad && (
                          <span className="id-entidad">#{auditoria.id_entidad}</span>
                        )}
                      </div>
                    </td>
                    <td className="accion-cell">
                      <div className="accion-badge">
                        {getAccionIcon(auditoria.accion)}
                        <span>{auditoria.accion}</span>
                      </div>
                    </td>
                    <td className="detalles-cell">
                      {auditoria.detalles || '-'}
                    </td>
                    <td className="ip-cell">
                      {auditoria.ip_address || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPaginas > 1 && (
            <div className="paginacion">
              <button
                className="btn-pagina"
                onClick={() => setPagina(p => Math.max(1, p - 1))}
                disabled={pagina === 1}
              >
                Anterior
              </button>
              <span>
                Página {pagina} de {totalPaginas}
              </span>
              <button
                className="btn-pagina"
                onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                disabled={pagina === totalPaginas}
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

