/**
 * Formatea una fecha al formato dd/mm/aaaa
 * @param dateString - Fecha en formato ISO string o Date
 * @returns Fecha formateada como dd/mm/aaaa
 */
export function formatDate(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  
  if (isNaN(date.getTime())) {
    return 'Fecha inválida';
  }
  
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear().toString(); // Año completo con 4 dígitos
  
  return `${day}/${month}/${year}`;
}

/**
 * Formatea una hora al formato HH:mm (24 horas)
 * @param timeString - Hora en formato HH:mm o Date
 * @returns Hora formateada como HH:mm
 */
export function formatTime(timeString: string | Date): string {
  if (typeof timeString === 'string') {
    // Si ya está en formato HH:mm, devolverlo
    if (/^\d{2}:\d{2}$/.test(timeString)) {
      return timeString;
    }
    // Si es una fecha completa, extraer hora y minutos
    const date = new Date(timeString);
    if (!isNaN(date.getTime())) {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    }
    return timeString;
  } else {
    // Es un objeto Date
    const hours = timeString.getHours().toString().padStart(2, '0');
    const minutes = timeString.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }
}

/**
 * Formatea una fecha y hora al formato dd/mm/aaaa HH:mm
 * @param dateString - Fecha en formato ISO string o Date
 * @param timeString - Hora opcional en formato HH:mm
 * @returns Fecha y hora formateada como dd/mm/aaaa HH:mm
 */
export function formatDateTime(dateString: string | Date, timeString?: string): string {
  const fecha = formatDate(dateString);
  
  if (timeString) {
    const hora = formatTime(timeString);
    return `${fecha} ${hora}`;
  }
  
  // Si no hay hora específica pero es un Date, extraer la hora del objeto
  if (dateString instanceof Date || typeof dateString === 'string') {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    if (!isNaN(date.getTime())) {
      const hora = formatTime(date);
      return `${fecha} ${hora}`;
    }
  }
  
  return fecha;
}

/**
 * Formatea una fecha con hora para mostrar en notificaciones (formato relativo o absoluto)
 * @param dateString - Fecha en formato ISO string o Date
 * @returns Fecha formateada de manera relativa o absoluta
 */
export function formatDateRelative(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Ahora';
  if (diffMins < 60) return `Hace ${diffMins} min`;
  if (diffHours < 24) return `Hace ${diffHours} h`;
  if (diffDays < 7) return `Hace ${diffDays} días`;
  
  // Si es más de una semana, mostrar fecha absoluta
  return formatDate(date);
}

