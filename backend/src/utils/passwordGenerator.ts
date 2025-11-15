/**
 * Genera una contraseña aleatoria segura
 * @param length Longitud de la contraseña (por defecto 12)
 * @returns Contraseña aleatoria
 */
export function generarPasswordAleatoria(length: number = 12): string {
  const mayusculas = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const minusculas = 'abcdefghijklmnopqrstuvwxyz';
  const numeros = '0123456789';
  const simbolos = '!@#$%&*';
  
  const todosLosCaracteres = mayusculas + minusculas + numeros + simbolos;
  
  let password = '';
  
  // Asegurar al menos un carácter de cada tipo
  password += mayusculas[Math.floor(Math.random() * mayusculas.length)];
  password += minusculas[Math.floor(Math.random() * minusculas.length)];
  password += numeros[Math.floor(Math.random() * numeros.length)];
  password += simbolos[Math.floor(Math.random() * simbolos.length)];
  
  // Completar el resto de la longitud
  for (let i = password.length; i < length; i++) {
    password += todosLosCaracteres[Math.floor(Math.random() * todosLosCaracteres.length)];
  }
  
  // Mezclar los caracteres para que no estén siempre en el mismo orden
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Valida que una contraseña cumpla con los requisitos de seguridad
 * @param password Contraseña a validar
 * @returns Objeto con isValid y errores
 */
export function validarPassword(password: string): { isValid: boolean; errores: string[] } {
  const errores: string[] = [];
  
  if (password.length < 8) {
    errores.push('La contraseña debe tener al menos 8 caracteres');
  }
  
  if (!/[A-Z]/.test(password)) {
    errores.push('La contraseña debe contener al menos una letra mayúscula');
  }
  
  if (!/[a-z]/.test(password)) {
    errores.push('La contraseña debe contener al menos una letra minúscula');
  }
  
  if (!/[0-9]/.test(password)) {
    errores.push('La contraseña debe contener al menos un número');
  }
  
  if (!/[!@#$%&*]/.test(password)) {
    errores.push('La contraseña debe contener al menos un carácter especial (!@#$%&*)');
  }
  
  return {
    isValid: errores.length === 0,
    errores,
  };
}

