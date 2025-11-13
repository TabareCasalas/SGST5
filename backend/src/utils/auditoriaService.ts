import { prisma } from '../lib/prisma';

interface CrearAuditoriaParams {
  id_usuario?: number;
  tipo_entidad: string; // 'usuario', 'tramite', 'grupo', 'ficha', etc.
  id_entidad?: number; // ID de la entidad modificada
  accion: string; // 'crear', 'modificar', 'eliminar', 'desactivar', etc.
  detalles?: string; // Detalles del cambio
  ip_address?: string;
}

/**
 * Servicio para crear registros de auditoría de forma centralizada
 * Este servicio puede ser usado desde cualquier controlador para registrar acciones
 */
export class AuditoriaService {
  /**
   * Crea un registro de auditoría
   */
  static async crear(params: CrearAuditoriaParams) {
    try {
      const auditoria = await prisma.auditoria.create({
        data: {
          id_usuario: params.id_usuario || null,
          tipo_entidad: params.tipo_entidad,
          id_entidad: params.id_entidad || null,
          accion: params.accion,
          detalles: params.detalles || null,
          ip_address: params.ip_address || null,
        },
      });

      return auditoria;
    } catch (error: any) {
      console.error('Error al crear registro de auditoría:', error);
      // No lanzar error para no interrumpir el flujo principal
      return null;
    }
  }

  /**
   * Crea un registro de auditoría desde un request (extrae IP automáticamente)
   */
  static async crearDesdeRequest(
    req: any,
    params: Omit<CrearAuditoriaParams, 'ip_address'>
  ) {
    const ip_address = req.ip || req.connection?.remoteAddress || 'unknown';
    return this.crear({
      ...params,
      ip_address,
    });
  }
}


