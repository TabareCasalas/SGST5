import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/authMiddleware';
import { AuditoriaService } from '../utils/auditoriaService';

const prisma = new PrismaClient();

interface CreateNotificacionData {
  id_usuario: number;
  id_usuario_emisor?: number;
  titulo: string;
  mensaje: string;
  tipo?: 'info' | 'success' | 'warning' | 'error';
  tipo_entidad?: string;
  id_entidad?: number;
  id_tramite?: number;
}

// Crear una nueva notificación
export async function create(req: AuthRequest, res: Response) {
  try {
    const {
      id_usuario,
      id_usuario_emisor,
      titulo,
      mensaje,
      tipo = 'info',
      tipo_entidad,
      id_entidad,
      id_tramite,
    }: CreateNotificacionData = req.body;

    // Validar campos requeridos
    if (!id_usuario || !titulo || !mensaje) {
      return res.status(400).json({
        error: 'id_usuario, titulo y mensaje son requeridos',
      });
    }

    // Verificar que el usuario destinatario existe
    const usuario = await prisma.usuario.findUnique({
      where: { id_usuario },
    });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario destinatario no encontrado' });
    }

    // Verificar que el emisor existe si se proporciona
    if (id_usuario_emisor) {
      const emisor = await prisma.usuario.findUnique({
        where: { id_usuario: id_usuario_emisor },
      });

      if (!emisor) {
        return res.status(404).json({ error: 'Usuario emisor no encontrado' });
      }
    }

    // Verificar que el trámite existe si se proporciona
    if (id_tramite) {
      const tramite = await prisma.tramite.findUnique({
        where: { id_tramite },
      });

      if (!tramite) {
        return res.status(404).json({ error: 'Trámite no encontrado' });
      }
    }

    const notificacion = await prisma.notificacion.create({
      data: {
        id_usuario,
        id_usuario_emisor: id_usuario_emisor || null,
        titulo,
        mensaje,
        tipo,
        tipo_entidad: tipo_entidad || null,
        id_entidad: id_entidad || null,
        id_tramite: id_tramite || null,
      },
      include: {
        usuario: {
          select: {
            id_usuario: true,
            nombre: true,
            correo: true,
          },
        },
        emisor: {
          select: {
            id_usuario: true,
            nombre: true,
            correo: true,
          },
        },
      },
    });

    // Registrar auditoría
    const userId = req.user?.id;
    if (userId) {
      await AuditoriaService.crearDesdeRequest(req, {
        id_usuario: userId,
        tipo_entidad: 'notificacion',
        id_entidad: notificacion.id_notificacion,
        accion: 'crear',
        detalles: `Notificación creada: "${titulo}" para usuario ${usuario.nombre}${id_tramite ? ` (Trámite: ${id_tramite})` : ''}`,
      });
    }

    res.status(201).json(notificacion);
  } catch (error: any) {
    console.error('Error al crear notificación:', error);
    res.status(500).json({ error: error.message });
  }
}

// Obtener notificaciones de un usuario
export async function getByUsuario(req: AuthRequest, res: Response) {
  try {
    const { id_usuario } = req.params;
    const { leida, limit, offset } = req.query;

    const where: any = {
      id_usuario: parseInt(id_usuario),
    };

    if (leida !== undefined) {
      where.leida = leida === 'true';
    }

    const take = limit ? parseInt(limit as string) : undefined;
    const skip = offset ? parseInt(offset as string) : undefined;

    const [notificaciones, total] = await Promise.all([
      prisma.notificacion.findMany({
        where,
        include: {
          emisor: {
            select: {
              id_usuario: true,
              nombre: true,
              correo: true,
              rol: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
        take,
        skip,
      }),
      prisma.notificacion.count({ where }),
    ]);

    // Registrar auditoría
    const userId = req.user?.id;
    if (userId) {
      await AuditoriaService.crearDesdeRequest(req, {
        id_usuario: userId,
        tipo_entidad: 'notificacion',
        id_entidad: null,
        accion: 'listar',
        detalles: `Notificaciones del usuario ${id_usuario} consultadas${leida !== undefined ? ` (filtro: leida=${leida})` : ''}`,
      });
    }

    res.json({
      notificaciones,
      total,
      no_leidas: await prisma.notificacion.count({
        where: { ...where, leida: false },
      }),
    });
  } catch (error: any) {
    console.error('Error al obtener notificaciones:', error);
    res.status(500).json({ error: error.message });
  }
}

// Obtener notificaciones del usuario autenticado
export async function getMisNotificaciones(req: AuthRequest, res: Response) {
  try {
    const user = (req as any).user;
    if (!user || !user.id) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const { leida, limit, offset } = req.query;

    const where: any = {
      id_usuario: user.id,
    };

    if (leida !== undefined) {
      where.leida = leida === 'true';
    }

    const take = limit ? parseInt(limit as string) : undefined;
    const skip = offset ? parseInt(offset as string) : undefined;

    const [notificaciones, total] = await Promise.all([
      prisma.notificacion.findMany({
        where,
        include: {
          emisor: {
            select: {
              id_usuario: true,
              nombre: true,
              correo: true,
              rol: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
        take,
        skip,
      }),
      prisma.notificacion.count({ where }),
    ]);

    // Registrar auditoría
    if (user.id) {
      const noLeidas = await prisma.notificacion.count({
        where: { ...where, leida: false },
      });
      await AuditoriaService.crearDesdeRequest(req, {
        id_usuario: user.id,
        tipo_entidad: 'notificacion',
        id_entidad: null,
        accion: 'consultar',
        detalles: `Mis notificaciones consultadas${leida !== undefined ? ` (filtro: leida=${leida})` : ''}. Total: ${total}, No leídas: ${noLeidas}`,
      });
    }

    res.json({
      notificaciones,
      total,
      no_leidas: await prisma.notificacion.count({
        where: { ...where, leida: false },
      }),
    });
  } catch (error: any) {
    console.error('Error al obtener notificaciones:', error);
    res.status(500).json({ error: error.message });
  }
}

// Marcar notificación como leída
export async function marcarLeida(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    if (!user || !user.id) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const notificacion = await prisma.notificacion.findUnique({
      where: { id_notificacion: parseInt(id) },
    });

    if (!notificacion) {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }

    // Verificar que la notificación pertenece al usuario
    if (notificacion.id_usuario !== user.id) {
      return res.status(403).json({ error: 'No tienes permiso para esta acción' });
    }

    const notificacionActualizada = await prisma.notificacion.update({
      where: { id_notificacion: parseInt(id) },
      data: { leida: true },
      include: {
        emisor: {
          select: {
            id_usuario: true,
            nombre: true,
            correo: true,
          },
        },
      },
    });

    // Registrar auditoría
    if (user.id) {
      await AuditoriaService.crearDesdeRequest(req, {
        id_usuario: user.id,
        tipo_entidad: 'notificacion',
        id_entidad: notificacionActualizada.id_notificacion,
        accion: 'modificar',
        detalles: `Notificación marcada como leída: "${notificacionActualizada.titulo}"`,
      });
    }

    res.json(notificacionActualizada);
  } catch (error: any) {
    console.error('Error al marcar notificación como leída:', error);
    res.status(500).json({ error: error.message });
  }
}

// Marcar todas las notificaciones como leídas
export async function marcarTodasLeidas(req: AuthRequest, res: Response) {
  try {
    const user = (req as any).user;

    if (!user || !user.id) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const resultado = await prisma.notificacion.updateMany({
      where: {
        id_usuario: user.id,
        leida: false,
      },
      data: {
        leida: true,
      },
    });

    // Registrar auditoría
    if (user.id) {
      await AuditoriaService.crearDesdeRequest(req, {
        id_usuario: user.id,
        tipo_entidad: 'notificacion',
        id_entidad: null,
        accion: 'modificar',
        detalles: `${resultado.count} notificaciones marcadas como leídas`,
      });
    }

    res.json({
      mensaje: `${resultado.count} notificaciones marcadas como leídas`,
      actualizadas: resultado.count,
    });
  } catch (error: any) {
    console.error('Error al marcar todas las notificaciones como leídas:', error);
    res.status(500).json({ error: error.message });
  }
}

// Eliminar notificación
export async function eliminar(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    if (!user || !user.id) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const notificacion = await prisma.notificacion.findUnique({
      where: { id_notificacion: parseInt(id) },
    });

    if (!notificacion) {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }

    // Verificar que la notificación pertenece al usuario
    if (notificacion.id_usuario !== user.id) {
      return res.status(403).json({ error: 'No tienes permiso para esta acción' });
    }

    const tituloNotificacion = notificacion.titulo;

    await prisma.notificacion.delete({
      where: { id_notificacion: parseInt(id) },
    });

    // Registrar auditoría
    if (user.id) {
      await AuditoriaService.crearDesdeRequest(req, {
        id_usuario: user.id,
        tipo_entidad: 'notificacion',
        id_entidad: parseInt(id),
        accion: 'eliminar',
        detalles: `Notificación eliminada: "${tituloNotificacion}"`,
      });
    }

    res.json({ mensaje: 'Notificación eliminada exitosamente' });
  } catch (error: any) {
    console.error('Error al eliminar notificación:', error);
    res.status(500).json({ error: error.message });
  }
}

// Obtener contador de notificaciones no leídas
export async function getContadorNoLeidas(req: AuthRequest, res: Response) {
  try {
    const user = (req as any).user;

    if (!user || !user.id) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const contador = await prisma.notificacion.count({
      where: {
        id_usuario: user.id,
        leida: false,
      },
    });

    // Registrar auditoría (solo si hay notificaciones no leídas para evitar spam)
    if (user.id && contador > 0) {
      await AuditoriaService.crearDesdeRequest(req, {
        id_usuario: user.id,
        tipo_entidad: 'notificacion',
        id_entidad: null,
        accion: 'consultar',
        detalles: `Contador de notificaciones no leídas consultado: ${contador}`,
      });
    }

    res.json({ contador });
  } catch (error: any) {
    console.error('Error al obtener contador de notificaciones:', error);
    res.status(500).json({ error: error.message });
  }
}
