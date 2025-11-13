import { useEffect, useState } from 'react';
import { ApiService } from '../services/api';
import './NotificacionesBadge.css';

interface NotificacionesBadgeProps {
  onClick: () => void;
}

export function NotificacionesBadge({ onClick }: NotificacionesBadgeProps) {
  const [contador, setContador] = useState(0);

  useEffect(() => {
    loadContador();
    
    // Actualizar contador cada 30 segundos
    const interval = setInterval(loadContador, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const loadContador = async () => {
    try {
      const data = await ApiService.getContadorNoLeidas();
      setContador(data.contador || 0);
    } catch (error: any) {
      // Silenciar errores para no molestar al usuario
      console.error('Error al cargar contador de notificaciones:', error);
    }
  };

  return (
    <button className="notificaciones-badge-btn" onClick={onClick} title="Notificaciones">
      <span className="notificaciones-icon">🔔</span>
      {contador > 0 && (
        <span className="notificaciones-contador">{contador > 99 ? '99+' : contador}</span>
      )}
    </button>
  );
}


