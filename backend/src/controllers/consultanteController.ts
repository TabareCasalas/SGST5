import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/authMiddleware';
import { AuditoriaService } from '../utils/auditoriaService';

export const consultanteController = {
  // Obtener todos los consultantes
  async getAll(req: AuthRequest, res: Response) {
    try {
      const { search } = req.query;

      const where: any = {};
      
      if (search) {
        where.usuario = {
          OR: [
            { nombre: { contains: search as string, mode: 'insensitive' } },
            { ci: { contains: search as string, mode: 'insensitive' } },
          ],
        };
      }

      const consultantes = await prisma.consultante.findMany({
        where,
        include: {
          usuario: true,
          tramites: {
            take: 5,
            orderBy: { fecha_inicio: 'desc' },
          },
        },
        orderBy: { created_at: 'desc' },
      });

      // Registrar auditoría
      const userId = req.user?.id;
      if (userId) {
        await AuditoriaService.crearDesdeRequest(req, {
          id_usuario: userId,
          tipo_entidad: 'consultante',
          id_entidad: null,
          accion: 'listar',
          detalles: `Listado de consultantes consultado${search ? ` con filtro: ${search}` : ''}`,
        });
      }

      res.json(consultantes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // Obtener un consultante por ID
  async getById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const consultante = await prisma.consultante.findUnique({
        where: { id_consultante: parseInt(id) },
        include: {
          usuario: true,
          tramites: {
            include: {
              grupo: true,
            },
            orderBy: { fecha_inicio: 'desc' },
          },
        },
      });

      if (!consultante) {
        return res.status(404).json({ error: 'Consultante no encontrado' });
      }

      // Registrar auditoría
      const userId = req.user?.id;
      if (userId) {
        await AuditoriaService.crearDesdeRequest(req, {
          id_usuario: userId,
          tipo_entidad: 'consultante',
          id_entidad: consultante.id_consultante,
          accion: 'consultar',
          detalles: `Consultante consultado: ${consultante.usuario.nombre} (Nro. Padrón: ${consultante.nro_padron})`,
        });
      }

      res.json(consultante);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // Crear un nuevo consultante
  async create(req: AuthRequest, res: Response) {
    try {
      const { id_usuario, est_civil, nro_padron } = req.body;

      if (!id_usuario || !est_civil || !nro_padron) {
        return res.status(400).json({
          error: 'id_usuario, est_civil y nro_padron son requeridos',
        });
      }

      // Verificar que el usuario existe
      const usuario = await prisma.usuario.findUnique({
        where: { id_usuario },
      });

      if (!usuario) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // Verificar que no exista ya un consultante para este usuario
      const consultanteExistente = await prisma.consultante.findUnique({
        where: { id_usuario },
      });

      if (consultanteExistente) {
        return res.status(409).json({ error: 'Este usuario ya es un consultante' });
      }

      // Verificar que no exista otro consultante con ese número de padrón
      const padronExistente = await prisma.consultante.findUnique({
        where: { nro_padron },
      });

      if (padronExistente) {
        return res.status(409).json({ error: 'Ya existe un consultante con ese número de padrón' });
      }

      const consultante = await prisma.consultante.create({
        data: {
          id_usuario,
          est_civil,
          nro_padron,
        },
        include: {
          usuario: true,
        },
      });

      // Registrar auditoría
      const userId = req.user?.id;
      if (userId) {
        await AuditoriaService.crearDesdeRequest(req, {
          id_usuario: userId,
          tipo_entidad: 'consultante',
          id_entidad: consultante.id_consultante,
          accion: 'crear',
          detalles: `Consultante creado: ${consultante.usuario.nombre} (Nro. Padrón: ${consultante.nro_padron}, Estado Civil: ${consultante.est_civil})`,
        });
      }

      res.status(201).json(consultante);
    } catch (error: any) {
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'Ya existe un consultante con ese número de padrón o usuario' });
      }
      res.status(500).json({ error: error.message });
    }
  },

  // Actualizar un consultante
  async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { est_civil, nro_padron } = req.body;

      // Obtener consultante anterior para comparar cambios
      const consultanteAnterior = await prisma.consultante.findUnique({
        where: { id_consultante: parseInt(id) },
        include: { usuario: true },
      });

      if (!consultanteAnterior) {
        return res.status(404).json({ error: 'Consultante no encontrado' });
      }

      const updateData: any = {};
      if (est_civil !== undefined) updateData.est_civil = est_civil;
      if (nro_padron !== undefined) updateData.nro_padron = nro_padron;

      const consultante = await prisma.consultante.update({
        where: { id_consultante: parseInt(id) },
        data: updateData,
        include: {
          usuario: true,
        },
      });

      // Registrar auditoría
      const userId = req.user?.id;
      if (userId) {
        const cambios: string[] = [];
        if (est_civil !== undefined && est_civil !== consultanteAnterior.est_civil) {
          cambios.push(`estado civil: ${consultanteAnterior.est_civil} → ${est_civil}`);
        }
        if (nro_padron !== undefined && nro_padron !== consultanteAnterior.nro_padron) {
          cambios.push(`nro. padrón: ${consultanteAnterior.nro_padron} → ${nro_padron}`);
        }

        await AuditoriaService.crearDesdeRequest(req, {
          id_usuario: userId,
          tipo_entidad: 'consultante',
          id_entidad: consultante.id_consultante,
          accion: 'modificar',
          detalles: cambios.length > 0
            ? `Consultante ${consultante.usuario.nombre} modificado. Cambios: ${cambios.join(', ')}`
            : `Consultante ${consultante.usuario.nombre} actualizado`,
        });
      }

      res.json(consultante);
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Consultante no encontrado' });
      }
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'Ya existe un consultante con ese número de padrón' });
      }
      res.status(500).json({ error: error.message });
    }
  },

  // Eliminar consultante
  async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      // Verificar si tiene trámites activos
      const consultante = await prisma.consultante.findUnique({
        where: { id_consultante: parseInt(id) },
        include: {
          usuario: true,
          tramites: {
            where: {
              estado: {
                notIn: ['finalizado', 'desistido'],
              },
            },
          },
        },
      });

      if (!consultante) {
        return res.status(404).json({ error: 'Consultante no encontrado' });
      }

      if (consultante.tramites.length > 0) {
        return res.status(400).json({
          error: 'No se puede eliminar el consultante porque tiene trámites activos',
          tramitesActivos: consultante.tramites,
        });
      }

      await prisma.consultante.delete({
        where: { id_consultante: parseInt(id) },
      });

      // Registrar auditoría
      const userId = req.user?.id;
      if (userId) {
        await AuditoriaService.crearDesdeRequest(req, {
          id_usuario: userId,
          tipo_entidad: 'consultante',
          id_entidad: parseInt(id),
          accion: 'eliminar',
          detalles: `Consultante eliminado: ${consultante.usuario.nombre} (Nro. Padrón: ${consultante.nro_padron})`,
        });
      }

      res.json({ message: 'Consultante eliminado exitosamente' });
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Consultante no encontrado' });
      }
      res.status(500).json({ error: error.message });
    }
  },
};





