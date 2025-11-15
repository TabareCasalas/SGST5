/**
 * Formatea una fecha al formato dd/mm/aaaa
 * @param date - Fecha en formato Date o string ISO
 * @returns Fecha formateada como dd/mm/aaaa
 */
export function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Fecha inválida';
  }
  
  const day = dateObj.getDate().toString().padStart(2, '0');
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const year = dateObj.getFullYear().toString(); // Año completo con 4 dígitos
  
  return `${day}/${month}/${year}`;
}

/**
 * Formatea una fecha y hora al formato dd/mm/aaaa HH:mm
 * @param date - Fecha en formato Date o string ISO
 * @param timeString - Hora opcional en formato HH:mm
 * @returns Fecha y hora formateada como dd/mm/aaaa HH:mm
 */
export function formatDateTime(date: Date | string, timeString?: string): string {
  const fecha = formatDate(date);
  
  if (timeString) {
    return `${fecha} ${timeString}`;
  }
  
  // Si no hay hora específica, extraer la hora del objeto Date
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (!isNaN(dateObj.getTime())) {
    const hours = dateObj.getHours().toString().padStart(2, '0');
    const minutes = dateObj.getMinutes().toString().padStart(2, '0');
    return `${fecha} ${hours}:${minutes}`;
  }
  
  return fecha;
}

