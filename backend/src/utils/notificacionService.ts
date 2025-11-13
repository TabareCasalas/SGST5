import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CrearNotificacionParams {
  id_usuario: number;
  id_usuario_emisor?: number;
  titulo: string;
  mensaje: string;
  tipo?: 'info' | 'success' | 'warning' | 'error';
  tipo_entidad?: string;
  id_entidad?: number;
  id_tramite?: number;
}

/**
 * Servicio para crear notificaciones de forma centralizada
 * Este servicio puede ser usado desde cualquier controlador para generar notificaciones automáticas
 */
export class NotificacionService {
  /**
   * Crea una notificación
   */
  static async crear(params: CrearNotificacionParams) {
    try {
      const notificacion = await prisma.notificacion.create({
        data: {
          id_usuario: params.id_usuario,
          id_usuario_emisor: params.id_usuario_emisor || null,
          titulo: params.titulo,
          mensaje: params.mensaje,
          tipo: params.tipo || 'info',
          tipo_entidad: params.tipo_entidad || null,
          id_entidad: params.id_entidad || null,
          id_tramite: params.id_tramite || null,
        },
      });

      return notificacion;
    } catch (error: any) {
      console.error('Error al crear notificación:', error);
      throw error;
    }
  }

  /**
   * Crea notificaciones para múltiples usuarios
   */
  static async crearMultiple(
    id_usuarios: number[],
    params: Omit<CrearNotificacionParams, 'id_usuario'>
  ) {
    try {
      const notificaciones = await Promise.all(
        id_usuarios.map((id_usuario) =>
          this.crear({
            ...params,
            id_usuario,
          })
        )
      );

      return notificaciones;
    } catch (error: any) {
      console.error('Error al crear notificaciones múltiples:', error);
      throw error;
    }
  }

  /**
   * Crea notificación para todos los miembros de un grupo
   */
  static async crearParaGrupo(
    id_grupo: number,
    params: Omit<CrearNotificacionParams, 'id_usuario'>
  ) {
    try {
      const grupo = await prisma.grupo.findUnique({
        where: { id_grupo },
        include: {
          miembros_grupo: {
            include: {
              usuario: true,
            },
          },
        },
      });

      if (!grupo) {
        throw new Error('Grupo no encontrado');
      }

      const id_usuarios = grupo.miembros_grupo.map((mg) => mg.id_usuario);

      return await this.crearMultiple(id_usuarios, params);
    } catch (error: any) {
      console.error('Error al crear notificaciones para grupo:', error);
      throw error;
    }
  }
}


