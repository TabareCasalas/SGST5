import { useEffect, useState } from 'react';
import { ApiService } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { 
  FaBell, FaTimes, FaCheck, FaCheckDouble, FaTrash, 
  FaInfoCircle, FaCheckCircle, FaExclamationTriangle, FaExclamationCircle
} from 'react-icons/fa';
import { formatDateRelative } from '../utils/dateFormatter';
import './NotificacionesPanel.css';

interface Notificacion {
  id_notificacion: number;
  id_usuario: number;
  id_usuario_emisor?: number;
  titulo: string;
  mensaje: string;
  tipo: 'info' | 'success' | 'warning' | 'error';
  leida: boolean;
  tipo_entidad?: string;
  id_entidad?: number;
  id_tramite?: number;
  created_at: string;
  emisor?: {
    id_usuario: number;
    nombre: string;
    correo: string;
    rol?: string;
  };
}

interface NotificacionesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isFullPage?: boolean; // Si es true, se muestra como página completa sin overlay
  onNotificacionLeida?: () => void; // Callback cuando se marca una notificación como leída
}

type FiltroTab = 'todas' | 'no_leidas' | 'leidas';

export function NotificacionesPanel({ isOpen, onClose, isFullPage = false, onNotificacionLeida }: NotificacionesPanelProps) {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [contador, setContador] = useState(0);
  const [filtroActivo, setFiltroActivo] = useState<FiltroTab>('todas');
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen || isFullPage) {
      loadNotificaciones();
      loadContador();
    }
  }, [isOpen, isFullPage]);

  // Cargar contador periódicamente
  useEffect(() => {
    const interval = setInterval(() => {
      loadContador();
      if (isOpen || isFullPage) {
        loadNotificaciones();
      }
    }, 30000); // Cada 30 segundos

    return () => clearInterval(interval);
  }, [isOpen, isFullPage]);

  const loadNotificaciones = async () => {
    try {
      setLoading(true);
      // Cargar todas las notificaciones (sin filtro de leída)
      const data = await ApiService.getMisNotificaciones({ limit: 100 });
      setNotificaciones(data.notificaciones || []);
    } catch (error: any) {
      showToast(`Error al cargar notificaciones: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Filtrar notificaciones según la pestaña activa
  const notificacionesFiltradas = notificaciones.filter((notif) => {
    switch (filtroActivo) {
      case 'no_leidas':
        return !notif.leida;
      case 'leidas':
        return notif.leida;
      default:
        return true; // 'todas'
    }
  });

  const loadContador = async () => {
    try {
      const data = await ApiService.getContadorNoLeidas();
      setContador(data.contador || 0);
    } catch (error: any) {
      // Silenciar errores del contador para no molestar al usuario
      console.error('Error al cargar contador:', error);
    }
  };

  const handleMarcarLeida = async (id: number) => {
    try {
      await ApiService.marcarLeida(id);
      setNotificaciones((prev) =>
        prev.map((n) =>
          n.id_notificacion === id ? { ...n, leida: true } : n
        )
      );
      setContador((prev) => Math.max(0, prev - 1));
      if (onNotificacionLeida) {
        onNotificacionLeida();
      }
    } catch (error: any) {
      showToast(`Error al marcar notificación: ${error.message}`, 'error');
    }
  };

  const handleMarcarTodasLeidas = async () => {
    try {
      await ApiService.marcarTodasLeidas();
      setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
      setContador(0);
      showToast('Todas las notificaciones marcadas como leídas', 'success');
      if (onNotificacionLeida) {
        onNotificacionLeida();
      }
    } catch (error: any) {
      showToast(`Error: ${error.message}`, 'error');
    }
  };

  const handleEliminar = async (id: number) => {
    try {
      await ApiService.eliminarNotificacion(id);
      const notificacion = notificaciones.find((n) => n.id_notificacion === id);
      setNotificaciones((prev) => prev.filter((n) => n.id_notificacion !== id));
      if (notificacion && !notificacion.leida) {
        setContador((prev) => Math.max(0, prev - 1));
      }
      showToast('Notificación eliminada', 'success');
      if (onNotificacionLeida) {
        onNotificacionLeida();
      }
    } catch (error: any) {
      showToast(`Error al eliminar: ${error.message}`, 'error');
    }
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'success':
        return <FaCheckCircle className="tipo-icon success" />;
      case 'warning':
        return <FaExclamationTriangle className="tipo-icon warning" />;
      case 'error':
        return <FaExclamationCircle className="tipo-icon error" />;
      default:
        return <FaInfoCircle className="tipo-icon info" />;
    }
  };

  const formatFecha = (fecha: string) => {
    return formatDateRelative(fecha);
  };

  if (!isOpen && !isFullPage) return null;

  return (
    <div className={isFullPage ? "notificaciones-full-page" : "notificaciones-overlay"} onClick={isFullPage ? undefined : onClose}>
      <div className={`notificaciones-panel ${isFullPage ? 'full-page' : ''}`} onClick={(e) => isFullPage ? undefined : e.stopPropagation()}>
        <div className="notificaciones-header">
          <div className="notificaciones-title">
            <FaBell />
            <h3>Notificaciones</h3>
            {contador > 0 && <span className="contador-badge">{contador}</span>}
          </div>
          <div className="notificaciones-actions">
            {notificaciones.some((n) => !n.leida) && (
              <button
                className="btn-marcar-todas"
                onClick={handleMarcarTodasLeidas}
                title="Marcar todas como leídas"
              >
                <FaCheckDouble />
              </button>
            )}
            {!isFullPage && (
              <button className="btn-cerrar" onClick={onClose} title="Cerrar">
                <FaTimes />
              </button>
            )}
          </div>
        </div>
        
        {/* Pestañas de filtrado */}
        <div className="notificaciones-tabs">
          <button
            className={`tab-item ${filtroActivo === 'todas' ? 'active' : ''}`}
            onClick={() => setFiltroActivo('todas')}
          >
            Todas ({notificaciones.length})
          </button>
          <button
            className={`tab-item ${filtroActivo === 'no_leidas' ? 'active' : ''}`}
            onClick={() => setFiltroActivo('no_leidas')}
          >
            No leídas ({notificaciones.filter(n => !n.leida).length})
          </button>
          <button
            className={`tab-item ${filtroActivo === 'leidas' ? 'active' : ''}`}
            onClick={() => setFiltroActivo('leidas')}
          >
            Leídas ({notificaciones.filter(n => n.leida).length})
          </button>
        </div>

        <div className="notificaciones-content">
          {loading ? (
            <div className="notificaciones-loading">Cargando...</div>
          ) : notificacionesFiltradas.length === 0 ? (
            <div className="notificaciones-empty">
              <FaBell className="empty-icon" />
              <p>
                {filtroActivo === 'todas' && 'No tienes notificaciones'}
                {filtroActivo === 'no_leidas' && 'No tienes notificaciones no leídas'}
                {filtroActivo === 'leidas' && 'No tienes notificaciones leídas'}
              </p>
            </div>
          ) : (
            <div className="notificaciones-list">
              {notificacionesFiltradas.map((notificacion) => (
                <div
                  key={notificacion.id_notificacion}
                  className={`notificacion-item ${notificacion.leida ? 'leida' : 'no-leida'}`}
                >
                  <div className="notificacion-content">
                    <div className="notificacion-header-item">
                      {getTipoIcon(notificacion.tipo)}
                      <div className="notificacion-text">
                        <h4>{notificacion.titulo}</h4>
                        <p>{notificacion.mensaje}</p>
                        <div className="notificacion-meta">
                          <span className="notificacion-fecha">
                            {formatFecha(notificacion.created_at)}
                          </span>
                          {notificacion.emisor && (
                            <span className="notificacion-emisor">
                              de {notificacion.emisor.nombre}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="notificacion-actions">
                    {!notificacion.leida && (
                      <button
                        className="btn-marcar-leida"
                        onClick={() => handleMarcarLeida(notificacion.id_notificacion)}
                        title="Marcar como leída"
                      >
                        <FaCheck />
                      </button>
                    )}
                    <button
                      className="btn-eliminar"
                      onClick={() => handleEliminar(notificacion.id_notificacion)}
                      title="Eliminar"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

