/**
 * Utilidades para validar cédulas de identidad uruguayas
 * La CI uruguaya tiene un dígito verificador que valida la autenticidad del número
 */

/**
 * Limpia la CI removiendo todos los caracteres no numéricos
 */
export function cleanCI(ci: string): string {
  return ci.replace(/\D/g, '');
}

/**
 * Calcula el dígito verificador para una CI
 * @param ci - Cédula sin el dígito verificador (6 o 7 dígitos)
 * @returns El dígito verificador (0-9)
 */
export function validationDigit(ci: string): number {
  let a = 0;
  let i = 0;
  
  // Asegurar que la CI tenga 7 dígitos (rellenar con ceros a la izquierda)
  if (ci.length <= 6) {
    for (i = ci.length; i < 7; i++) {
      ci = '0' + ci;
    }
  }
  
  // Calcular el dígito verificador usando el multiplicador "2987634"
  const multiplicador = "2987634";
  for (i = 0; i < 7; i++) {
    a += (parseInt(multiplicador[i]) * parseInt(ci[i])) % 10;
  }
  
  if (a % 10 === 0) {
    return 0;
  } else {
    return 10 - (a % 10);
  }
}

/**
 * Valida que una CI tenga un dígito verificador correcto
 * @param ci - Cédula completa con dígito verificador (7 u 8 dígitos)
 * @returns true si la CI es válida, false en caso contrario
 */
export function validateCI(ci: string): boolean {
  const cleaned = cleanCI(ci);
  
  // La CI debe tener entre 7 y 8 dígitos (7 dígitos base + 1 dígito verificador opcional)
  if (cleaned.length < 7 || cleaned.length > 8) {
    return false;
  }
  
  // Extraer el dígito verificador (último dígito)
  const dig = parseInt(cleaned[cleaned.length - 1]);
  
  // Obtener la CI sin el dígito verificador
  const ciSinDigito = cleaned.substring(0, cleaned.length - 1);
  
  // Calcular el dígito verificador esperado
  const digitoEsperado = validationDigit(ciSinDigito);
  
  // Comparar
  return dig === digitoEsperado;
}

/**
 * Formatea una CI para almacenamiento (limpia y valida)
 * @param ci - Cédula a formatear
 * @returns CI limpia o null si no es válida
 */
export function formatCI(ci: string): string | null {
  const cleaned = cleanCI(ci);
  
  if (!validateCI(cleaned)) {
    return null;
  }
  
  return cleaned;
}

