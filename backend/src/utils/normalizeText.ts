/**
 * Normaliza un texto eliminando tildes y caracteres especiales
 * para permitir búsquedas sin importar si el usuario usa tildes o no
 * 
 * Ejemplo: "José" -> "jose", "María" -> "maria", "José María" -> "jose maria"
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  
  return text
    .normalize('NFD') // Descompone los caracteres acentuados (é -> e + ´)
    .replace(/[\u0300-\u036f]/g, '') // Elimina los diacríticos (tildes, acentos)
    .toLowerCase()
    .trim();
}

