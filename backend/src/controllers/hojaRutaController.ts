import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { NotificacionService } from '../utils/notificacionService';
import { AuthRequest } from '../middleware/authMiddleware';
import { AuditoriaService } from '../utils/auditoriaService';

export const hojaRutaController = {
  // Obtener todas las actuaciones de un trámite
  async getByTramite(req: AuthRequest, res: Response) {
    try {
      const { id_tramite } = req.params;
      
      const hojaRuta = await prisma.hojaRuta.findMany({
        where: { id_tramite: parseInt(id_tramite) },
        include: {
          usuario: {
            select: {
              id_usuario: true,
              nombre: true,
              ci: true,
            },
          },
        },
        orderBy: {
          fecha_actuacion: 'desc',
        },
      });

      // Registrar auditoría
      const userId = req.user?.id;
      if (userId) {
        await AuditoriaService.crearDesdeRequest(req, {
          id_usuario: userId,
          tipo_entidad: 'hoja_ruta',
          id_entidad: null,
          accion: 'listar',
          detalles: `Hoja de ruta del trámite ${id_tramite} consultada`,
        });
      }

      res.json(hojaRuta);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // Crear una nueva actuación
  async create(req: AuthRequest, res: Response) {
    try {
      const { id_tramite, fecha_actuacion, descripcion } = req.body;
      const id_usuario = req.user?.id; // Del token JWT (el JWT usa 'id' no 'id_usuario')

      if (!id_tramite || !descripcion) {
        return res.status(400).json({ error: 'id_tramite y descripcion son requeridos' });
      }

      if (!id_usuario) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      // Verificar que el trámite existe y obtener el grupo con información del usuario
      const tramite = await prisma.tramite.findUnique({
        where: { id_tramite: parseInt(id_tramite) },
        include: {
          grupo: {
            include: {
              miembros_grupo: {
                include: {
                  usuario: {
                    select: {
                      id_usuario: true,
                      nombre: true,
                    },
                  },
                },
              },
            },
          },
          consultante: {
            include: {
              usuario: {
                select: {
                  id_usuario: true,
                  nombre: true,
                },
              },
            },
          },
        },
      });

      if (!tramite) {
        return res.status(404).json({ error: 'Trámite no encontrado' });
      }

      // Verificar que el usuario es estudiante del grupo del trámite
      const esEstudianteDelGrupo = tramite.grupo.miembros_grupo.some(
        mg => mg.id_usuario === id_usuario && mg.rol_en_grupo === 'estudiante'
      );

      if (!esEstudianteDelGrupo) {
        return res.status(403).json({ error: 'Solo los estudiantes del grupo pueden agregar actuaciones' });
      }

      // Crear la actuación
      const actuacion = await prisma.hojaRuta.create({
        data: {
          id_tramite: parseInt(id_tramite),
          id_usuario,
          fecha_actuacion: fecha_actuacion ? new Date(fecha_actuacion) : new Date(),
          descripcion,
        },
        include: {
          usuario: {
            select: {
              id_usuario: true,
              nombre: true,
              ci: true,
            },
          },
        },
      });

      // Obtener información del usuario que creó la actuación
      const usuarioCreador = await prisma.usuario.findUnique({
        where: { id_usuario },
        select: {
          nombre: true,
        },
      });

      // Preparar descripción corta para auditoría y notificaciones
      const descripcionCorta = descripcion.length > 100 
        ? descripcion.substring(0, 100) + '...' 
        : descripcion;

      // Registrar auditoría
      if (id_usuario) {
        await AuditoriaService.crearDesdeRequest(req, {
          id_usuario: id_usuario,
          tipo_entidad: 'hoja_ruta',
          id_entidad: actuacion.id_hoja_ruta,
          accion: 'crear',
          detalles: `Actuación agregada en hoja de ruta del trámite ${tramite.num_carpeta}. Descripción: ${descripcionCorta}`,
        });
      }

      // Crear notificaciones para todos los miembros del grupo
      try {
        const idGrupo = tramite.id_grupo;
        const nombreEstudiante = usuarioCreador?.nombre || 'Un estudiante';

        await NotificacionService.crearParaGrupo(idGrupo, {
          id_usuario_emisor: id_usuario, // Estudiante que creó la actuación
          titulo: 'Nueva actualización en hoja de ruta',
          mensaje: `${nombreEstudiante} ha agregado una nueva actuación en la hoja de ruta del trámite ${tramite.num_carpeta}. Descripción: ${descripcionCorta}`,
          tipo: 'info',
          tipo_entidad: 'tramite',
          id_entidad: tramite.id_tramite,
          id_tramite: tramite.id_tramite,
        });

        console.log(`✅ Notificaciones creadas para los miembros del grupo sobre la actuación en trámite ${tramite.num_carpeta}`);
      } catch (notifError: any) {
        // No fallar la creación de la actuación si hay error en las notificaciones
        console.error('⚠️ Error al crear notificaciones (actuación creada exitosamente):', notifError);
      }

      res.status(201).json(actuacion);
    } catch (error: any) {
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'Ya existe una actuación con esos datos' });
      }
      res.status(500).json({ error: error.message });
    }
  },

  // Actualizar una actuación
  async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { fecha_actuacion, descripcion } = req.body;
      const id_usuario = req.user?.id; // Del token JWT

      if (!id_usuario) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      // Verificar que la actuación existe y pertenece al usuario
      const actuacion = await prisma.hojaRuta.findUnique({
        where: { id_hoja_ruta: parseInt(id) },
      });

      if (!actuacion) {
        return res.status(404).json({ error: 'Actuación no encontrada' });
      }

      if (actuacion.id_usuario !== id_usuario) {
        return res.status(403).json({ error: 'Solo puedes editar tus propias actuaciones' });
      }

      const updateData: any = {};
      if (fecha_actuacion) updateData.fecha_actuacion = new Date(fecha_actuacion);
      if (descripcion !== undefined) updateData.descripcion = descripcion;

      const actuacionActualizada = await prisma.hojaRuta.update({
        where: { id_hoja_ruta: parseInt(id) },
        data: updateData,
        include: {
          usuario: {
            select: {
              id_usuario: true,
              nombre: true,
              ci: true,
            },
          },
          tramite: {
            select: {
              num_carpeta: true,
            },
          },
        },
      });

      // Registrar auditoría
      if (id_usuario) {
        const cambios: string[] = [];
        if (fecha_actuacion) cambios.push('fecha de actuación');
        if (descripcion !== undefined) cambios.push('descripción');

        await AuditoriaService.crearDesdeRequest(req, {
          id_usuario: id_usuario,
          tipo_entidad: 'hoja_ruta',
          id_entidad: actuacionActualizada.id_hoja_ruta,
          accion: 'modificar',
          detalles: cambios.length > 0 
            ? `Actuación modificada en hoja de ruta del trámite ${actuacionActualizada.tramite?.num_carpeta || 'N/A'}. Campos: ${cambios.join(', ')}` 
            : `Actuación actualizada en hoja de ruta`,
        });
      }

      res.json(actuacionActualizada);
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Actuación no encontrada' });
      }
      res.status(500).json({ error: error.message });
    }
  },

  // Eliminar una actuación
  async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const id_usuario = req.user?.id; // Del token JWT

      if (!id_usuario) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      // Verificar que la actuación existe y pertenece al usuario
      const actuacion = await prisma.hojaRuta.findUnique({
        where: { id_hoja_ruta: parseInt(id) },
        include: {
          tramite: {
            select: {
              num_carpeta: true,
            },
          },
        },
      });

      if (!actuacion) {
        return res.status(404).json({ error: 'Actuación no encontrada' });
      }

      if (actuacion.id_usuario !== id_usuario) {
        return res.status(403).json({ error: 'Solo puedes eliminar tus propias actuaciones' });
      }

      await prisma.hojaRuta.delete({
        where: { id_hoja_ruta: parseInt(id) },
      });

      // Registrar auditoría
      if (id_usuario) {
        await AuditoriaService.crearDesdeRequest(req, {
          id_usuario: id_usuario,
          tipo_entidad: 'hoja_ruta',
          id_entidad: parseInt(id),
          accion: 'eliminar',
          detalles: `Actuación eliminada de la hoja de ruta del trámite ${actuacion.tramite?.num_carpeta || 'N/A'}`,
        });
      }

      res.json({ message: 'Actuación eliminada exitosamente' });
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Actuación no encontrada' });
      }
      res.status(500).json({ error: error.message });
    }
  },
};

