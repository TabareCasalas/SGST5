import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/authMiddleware';
import { AuditoriaService } from '../utils/auditoriaService';
import { NotificacionService } from '../utils/notificacionService';

export const solicitudReactivacionController = {
  /**
   * Solicitar reactivación de cuenta (público, desde login)
   */
  async solicitar(req: Request, res: Response) {
    try {
      const { ci, password, motivo } = req.body;

      if (!ci || !password) {
        return res.status(400).json({ error: 'CI y contraseña son requeridos' });
      }

      // Buscar usuario por CI
      const usuario = await prisma.usuario.findUnique({
        where: { ci },
        include: {
          solicitud_reactivacion: true,
        },
      });

      if (!usuario) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      // Verificar que el usuario esté inactivo
      if (usuario.activo) {
        return res.status(400).json({ error: 'El usuario ya está activo' });
      }

      // Verificar contraseña
      if (!usuario.password) {
        return res.status(401).json({ error: 'Usuario sin contraseña configurada' });
      }

      const passwordMatch = await bcrypt.compare(password, usuario.password);

      if (!passwordMatch) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      // Verificar si ya tiene una solicitud pendiente o aprobada (solo se permite una solicitud pendiente a la vez)
      if (usuario.solicitud_reactivacion) {
        if (usuario.solicitud_reactivacion.estado === 'pendiente') {
          return res.status(400).json({ 
            error: 'Ya existe una solicitud de reactivación pendiente',
            tieneSolicitudPendiente: true,
            solicitud: usuario.solicitud_reactivacion,
          });
        }
        // Si tiene una solicitud aprobada pero el usuario está inactivo, 
        // significa que fue desactivado nuevamente, permitir crear una nueva solicitud
        if (usuario.solicitud_reactivacion.estado === 'aprobada' && usuario.activo) {
          return res.status(400).json({ 
            error: 'Ya existe una solicitud de reactivación aprobada. Contacte al administrador.',
            tieneSolicitudAprobada: true,
          });
        }
        // Si fue rechazada o aprobada pero el usuario está inactivo, 
        // eliminar la solicitud anterior para permitir crear una nueva
        await prisma.solicitudReactivacion.delete({
          where: { id_solicitud: usuario.solicitud_reactivacion.id_solicitud },
        });
      }

      // Crear nueva solicitud
      const solicitud = await prisma.solicitudReactivacion.create({
        data: {
          id_usuario: usuario.id_usuario,
          motivo: motivo || null,
          estado: 'pendiente',
        },
        include: {
          usuario: {
            select: {
              id_usuario: true,
              nombre: true,
              ci: true,
              correo: true,
              rol: true,
            },
          },
        },
      });

      // Notificar a todos los administrativos
      const administrativos = await prisma.usuario.findMany({
        where: {
          rol: 'administrador',
          activo: true,
        },
        select: {
          id_usuario: true,
        },
      });

      for (const admin of administrativos) {
        await NotificacionService.crear({
          id_usuario: admin.id_usuario,
          titulo: 'Nueva solicitud de reactivación',
          mensaje: `El usuario ${usuario.nombre} (CI: ${usuario.ci}) ha solicitado la reactivación de su cuenta.${motivo ? ` Motivo: ${motivo}` : ''}`,
          tipo: 'warning',
          tipo_entidad: 'solicitud_reactivacion',
          id_entidad: solicitud.id_solicitud,
        });
      }

      // Registrar auditoría
      await AuditoriaService.crear({
        id_usuario: usuario.id_usuario,
        tipo_entidad: 'solicitud_reactivacion',
        id_entidad: solicitud.id_solicitud,
        accion: 'solicitar',
        detalles: `Solicitud de reactivación creada por ${usuario.nombre}`,
        ip_address: req.ip || 'unknown',
      });

      res.status(201).json({
        message: 'Solicitud de reactivación enviada exitosamente. Un administrador revisará su solicitud.',
        solicitud: {
          id_solicitud: solicitud.id_solicitud,
          estado: solicitud.estado,
          created_at: solicitud.created_at,
        },
      });
    } catch (error: any) {
      console.error('Error al crear solicitud de reactivación:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Obtener todas las solicitudes (solo administrativos)
   */
  async getAll(req: AuthRequest, res: Response) {
    try {
      const { estado } = req.query;

      const where: any = {};
      if (estado) {
        where.estado = estado;
      }

      const solicitudes = await prisma.solicitudReactivacion.findMany({
        where,
        include: {
          usuario: {
            select: {
              id_usuario: true,
              nombre: true,
              ci: true,
              correo: true,
              rol: true,
              semestre: true,
              fecha_desactivacion_automatica: true,
            },
          },
          administrador: {
            select: {
              id_usuario: true,
              nombre: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
      });

      res.json(solicitudes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Aprobar o rechazar una solicitud (solo administrativos)
   */
  async procesar(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { accion, respuesta } = req.body; // accion: 'aprobar' | 'rechazar'
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      if (!accion || !['aprobar', 'rechazar'].includes(accion)) {
        return res.status(400).json({ error: 'Acción inválida. Debe ser "aprobar" o "rechazar"' });
      }

      const solicitud = await prisma.solicitudReactivacion.findUnique({
        where: { id_solicitud: parseInt(id) },
        include: {
          usuario: {
            select: {
              id_usuario: true,
              nombre: true,
              ci: true,
              correo: true,
              rol: true,
              activo: true,
              fecha_desactivacion_automatica: true,
            },
          },
        },
      });

      if (!solicitud) {
        return res.status(404).json({ error: 'Solicitud no encontrada' });
      }

      if (solicitud.estado !== 'pendiente') {
        return res.status(400).json({ error: `La solicitud ya fue ${solicitud.estado}` });
      }

      const nuevoEstado = accion === 'aprobar' ? 'aprobada' : 'rechazada';

      // Si se aprueba, verificar fecha de desactivación automática
      let nuevaFechaDesactivacion: Date | null = null;
      if (accion === 'aprobar' && solicitud.usuario.rol === 'estudiante') {
        const fechaActual = new Date();
        fechaActual.setHours(0, 0, 0, 0); // Normalizar a inicio del día
        
        const fechaDesactivacionActual = solicitud.usuario.fecha_desactivacion_automatica 
          ? new Date(solicitud.usuario.fecha_desactivacion_automatica)
          : null;
        
        if (fechaDesactivacionActual) {
          fechaDesactivacionActual.setHours(0, 0, 0, 0);
          
          // Si la fecha es posterior a hoy, mantenerla
          if (fechaDesactivacionActual > fechaActual) {
            nuevaFechaDesactivacion = fechaDesactivacionActual;
          } else {
            // Si la fecha es anterior o igual a hoy, usar la fecha proporcionada o calcular 4 meses después
            const { fecha_desactivacion_automatica } = req.body;
            if (fecha_desactivacion_automatica) {
              nuevaFechaDesactivacion = new Date(fecha_desactivacion_automatica);
            } else {
              // Por defecto: 4 meses después de la fecha de reactivación (hoy)
              const fechaDefault = new Date();
              fechaDefault.setMonth(fechaDefault.getMonth() + 4);
              nuevaFechaDesactivacion = fechaDefault;
            }
          }
        } else {
          // Si no tiene fecha, usar la proporcionada o calcular 4 meses después
          const { fecha_desactivacion_automatica } = req.body;
          if (fecha_desactivacion_automatica) {
            nuevaFechaDesactivacion = new Date(fecha_desactivacion_automatica);
          } else {
            const fechaDefault = new Date();
            fechaDefault.setMonth(fechaDefault.getMonth() + 4);
            nuevaFechaDesactivacion = fechaDefault;
          }
        }
      }

      // Actualizar solicitud
      const solicitudActualizada = await prisma.solicitudReactivacion.update({
        where: { id_solicitud: parseInt(id) },
        data: {
          estado: nuevoEstado,
          respuesta: respuesta || null,
          id_administrador: userId,
        },
        include: {
          usuario: {
            select: {
              id_usuario: true,
              nombre: true,
              ci: true,
              correo: true,
            },
          },
          administrador: {
            select: {
              id_usuario: true,
              nombre: true,
            },
          },
        },
      });

      // Si se aprueba, activar el usuario y actualizar fecha de desactivación si es necesario
      if (accion === 'aprobar') {
        const updateData: any = {
          activo: true,
        };
        
        // Si es estudiante y se calculó una nueva fecha, actualizarla
        if (solicitud.usuario.rol === 'estudiante' && nuevaFechaDesactivacion) {
          updateData.fecha_desactivacion_automatica = nuevaFechaDesactivacion;
        }
        
        await prisma.usuario.update({
          where: { id_usuario: solicitud.usuario.id_usuario },
          data: updateData,
        });

        // Notificar al usuario
        await NotificacionService.crear({
          id_usuario: solicitud.usuario.id_usuario,
          id_usuario_emisor: userId,
          titulo: 'Solicitud de reactivación aprobada',
          mensaje: `Su solicitud de reactivación ha sido aprobada. Su cuenta ha sido reactivada y ya puede iniciar sesión.${respuesta ? ` Observación: ${respuesta}` : ''}`,
          tipo: 'success',
          tipo_entidad: 'solicitud_reactivacion',
          id_entidad: solicitud.id_solicitud,
        });
      } else {
        // Notificar al usuario que fue rechazada
        await NotificacionService.crear({
          id_usuario: solicitud.usuario.id_usuario,
          id_usuario_emisor: userId,
          titulo: 'Solicitud de reactivación rechazada',
          mensaje: `Su solicitud de reactivación ha sido rechazada.${respuesta ? ` Motivo: ${respuesta}` : ''}`,
          tipo: 'error',
          tipo_entidad: 'solicitud_reactivacion',
          id_entidad: solicitud.id_solicitud,
        });
      }

      // Registrar auditoría
      await AuditoriaService.crearDesdeRequest(req, {
        id_usuario: userId,
        tipo_entidad: 'solicitud_reactivacion',
        id_entidad: solicitud.id_solicitud,
        accion: accion === 'aprobar' ? 'aprobar' : 'rechazar',
        detalles: `Solicitud de reactivación ${accion === 'aprobar' ? 'aprobada' : 'rechazada'} para usuario ${solicitud.usuario.nombre}`,
      });

      res.json(solicitudActualizada);
    } catch (error: any) {
      console.error('Error al procesar solicitud:', error);
      res.status(500).json({ error: error.message });
    }
  },
};

