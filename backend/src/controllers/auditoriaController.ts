import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/authMiddleware';

export const auditoriaController = {
  // Obtener todas las auditorías con filtros
  async getAll(req: Request, res: Response) {
    try {
      const { 
        tipo_entidad, 
        id_entidad, 
        accion, 
        id_usuario,
        fecha_desde,
        fecha_hasta,
        limit,
        offset 
      } = req.query;

      const where: any = {};

      if (tipo_entidad) {
        where.tipo_entidad = tipo_entidad;
      }

      if (id_entidad) {
        where.id_entidad = parseInt(id_entidad as string);
      }

      if (accion) {
        where.accion = accion;
      }

      if (id_usuario) {
        where.id_usuario = parseInt(id_usuario as string);
      }

      if (fecha_desde || fecha_hasta) {
        where.created_at = {};
        if (fecha_desde) {
          where.created_at.gte = new Date(fecha_desde as string);
        }
        if (fecha_hasta) {
          where.created_at.lte = new Date(fecha_hasta as string);
        }
      }

      const take = limit ? parseInt(limit as string) : 100;
      const skip = offset ? parseInt(offset as string) : 0;

      const [auditorias, total] = await Promise.all([
        prisma.auditoria.findMany({
          where,
          include: {
            usuario: {
              select: {
                id_usuario: true,
                nombre: true,
                ci: true,
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
        prisma.auditoria.count({ where }),
      ]);

      res.json({
        auditorias,
        total,
        limit: take,
        offset: skip,
      });
    } catch (error: any) {
      console.error('Error al obtener auditorías:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Obtener auditorías de una entidad específica
  async getByEntidad(req: Request, res: Response) {
    try {
      const { tipo_entidad, id_entidad } = req.params;

      const auditorias = await prisma.auditoria.findMany({
        where: {
          tipo_entidad,
          id_entidad: parseInt(id_entidad),
        },
        include: {
          usuario: {
            select: {
              id_usuario: true,
              nombre: true,
              ci: true,
              rol: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      res.json(auditorias);
    } catch (error: any) {
      console.error('Error al obtener auditorías de entidad:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Obtener estadísticas de auditoría
  async getStats(req: Request, res: Response) {
    try {
      const { fecha_desde, fecha_hasta } = req.query;

      const where: any = {};
      if (fecha_desde || fecha_hasta) {
        where.created_at = {};
        if (fecha_desde) {
          where.created_at.gte = new Date(fecha_desde as string);
        }
        if (fecha_hasta) {
          where.created_at.lte = new Date(fecha_hasta as string);
        }
      }

      const [
        total,
        porAccion,
        porTipoEntidad,
        porUsuario,
      ] = await Promise.all([
        prisma.auditoria.count({ where }),
        prisma.auditoria.groupBy({
          by: ['accion'],
          where,
          _count: true,
        }),
        prisma.auditoria.groupBy({
          by: ['tipo_entidad'],
          where,
          _count: true,
        }),
        prisma.auditoria.groupBy({
          by: ['id_usuario'],
          where,
          _count: true,
        }),
      ]);

      res.json({
        total,
        por_accion: porAccion,
        por_tipo_entidad: porTipoEntidad,
        por_usuario: porUsuario,
      });
    } catch (error: any) {
      console.error('Error al obtener estadísticas de auditoría:', error);
      res.status(500).json({ error: error.message });
    }
  },
};


