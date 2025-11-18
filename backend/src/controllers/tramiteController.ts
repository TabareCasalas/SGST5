import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { normalizeText } from '../utils/normalizeText';
import { AuthRequest } from '../middleware/authMiddleware';
import { NotificacionService } from '../utils/notificacionService';
import { AuditoriaService } from '../utils/auditoriaService';

export const tramiteController = {
  // Obtener todos los trámites
  async getAll(req: AuthRequest, res: Response) {
    try {
      const { estado, id_consultante, id_grupo, search } = req.query;

      const where: any = {};
      if (estado) where.estado = estado;
      if (id_consultante) where.id_consultante = parseInt(id_consultante as string);
      if (id_grupo) where.id_grupo = parseInt(id_grupo as string);

      // Búsqueda por texto en múltiples campos
      if (search && typeof search === 'string' && search.trim() !== '') {
        const searchTerm = search.trim();
        const normalizedSearch = normalizeText(searchTerm);
        
        where.OR = [
          // Buscar en número de carpeta (convertir a string para búsqueda)
          { num_carpeta: { contains: searchTerm, mode: 'insensitive' } },
          // Buscar en observaciones (con y sin tildes)
          { observaciones: { contains: searchTerm, mode: 'insensitive' } },
          { observaciones: { contains: normalizedSearch, mode: 'insensitive' } },
          // Buscar en motivo de cierre (con y sin tildes)
          { motivo_cierre: { contains: searchTerm, mode: 'insensitive' } },
          { motivo_cierre: { contains: normalizedSearch, mode: 'insensitive' } },
          // Buscar en estado
          { estado: { contains: searchTerm, mode: 'insensitive' } },
          // Buscar en nombre del consultante (con y sin tildes)
          {
            consultante: {
              usuario: {
                nombre: { contains: searchTerm, mode: 'insensitive' }
              }
            }
          },
          {
            consultante: {
              usuario: {
                nombre: { contains: normalizedSearch, mode: 'insensitive' }
              }
            }
          },
          // Buscar en CI del consultante
          {
            consultante: {
              usuario: {
                ci: { contains: searchTerm, mode: 'insensitive' }
              }
            }
          },
          // Buscar en nombre del grupo (con y sin tildes)
          {
            grupo: {
              nombre: { contains: searchTerm, mode: 'insensitive' }
            }
          },
          {
            grupo: {
              nombre: { contains: normalizedSearch, mode: 'insensitive' }
            }
          }
        ];
      }

      const tramites = await prisma.tramite.findMany({
        where,
        include: {
          consultante: {
            include: {
              usuario: true,
            },
          },
          grupo: true,
          hoja_ruta: {
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
          },
          documentos: {
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
              created_at: 'desc',
            },
          },
        },
        orderBy: {
          fecha_inicio: 'desc',
        },
      });

      // Registrar auditoría
      const userId = req.user?.id;
      if (userId) {
        const filtros: string[] = [];
        if (estado) filtros.push(`estado: ${estado}`);
        if (id_consultante) filtros.push(`consultante: ${id_consultante}`);
        if (id_grupo) filtros.push(`grupo: ${id_grupo}`);
        if (search) filtros.push(`búsqueda: ${search}`);
        
        await AuditoriaService.crearDesdeRequest(req, {
          id_usuario: userId,
          tipo_entidad: 'tramite',
          id_entidad: null,
          accion: 'listar',
          detalles: `Listado de trámites consultado${filtros.length > 0 ? `. Filtros: ${filtros.join(', ')}` : ''}`,
        });
      }

      res.json(tramites);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // Obtener un trámite por ID
  async getById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const tramite = await prisma.tramite.findUnique({
        where: { id_tramite: parseInt(id) },
        include: {
          consultante: {
            include: {
              usuario: true,
            },
          },
          grupo: true,
          notificaciones: {
            orderBy: { created_at: 'desc' },
            take: 10,
          },
          hoja_ruta: {
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
          },
          documentos: {
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
              created_at: 'desc',
            },
          },
        },
      });

      if (!tramite) {
        return res.status(404).json({ error: 'Trámite no encontrado' });
      }

      // Registrar auditoría
      const userId = req.user?.id;
      if (userId) {
        await AuditoriaService.crearDesdeRequest(req, {
          id_usuario: userId,
          tipo_entidad: 'tramite',
          id_entidad: tramite.id_tramite,
          accion: 'consultar',
          detalles: `Trámite consultado: ${tramite.num_carpeta} (Estado: ${tramite.estado}, Consultante: ${tramite.consultante.usuario.nombre})`,
        });
      }

      res.json(tramite);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // Crear un nuevo trámite
  async create(req: Request, res: Response) {
    try {
      const { id_consultante, id_grupo, num_carpeta, observaciones } = req.body;
      const user = (req as any).user; // Usuario autenticado del middleware

      // Validar datos requeridos
      if (!id_consultante || !id_grupo || !num_carpeta) {
        return res.status(400).json({
          error: 'id_consultante, id_grupo y num_carpeta son requeridos',
        });
      }

      // Verificar si el consultante existe
      const consultante = await prisma.consultante.findUnique({
        where: { id_consultante },
      });

      if (!consultante) {
        return res.status(404).json({ error: 'Consultante no encontrado' });
      }

      // Verificar si el grupo existe
      const grupo = await prisma.grupo.findUnique({
        where: { id_grupo },
      });

      if (!grupo) {
        return res.status(404).json({ error: 'Grupo no encontrado' });
      }

      // Verificar si ya existe un trámite con ese número de carpeta
      const tramiteExistente = await prisma.tramite.findUnique({
        where: { num_carpeta },
      });

      if (tramiteExistente) {
        return res.status(409).json({ error: 'Ya existe un trámite con ese número de carpeta' });
      }

      // Si el usuario es administrador, el trámite se crea con estado "pendiente"
      // Si no es admin, se crea con estado "en_tramite" (los alumnos empiezan a trabajar)
      const esAdmin = user?.rol === 'admin' || user?.rol === 'administrador';
      const estadoInicial = esAdmin ? 'pendiente' : 'en_tramite';

      // Crear el trámite en la base de datos
      const tramite = await prisma.tramite.create({
        data: {
          id_consultante,
          id_grupo,
          num_carpeta,
          observaciones,
          estado: estadoInicial,
        },
        include: {
          consultante: {
            include: {
              usuario: true,
            },
          },
          grupo: true,
        },
      });

      console.log(`✅ Trámite creado: ${tramite.id_tramite} con estado: ${estadoInicial}`);

      // Registrar auditoría
      if (user?.id) {
        await AuditoriaService.crearDesdeRequest(req, {
          id_usuario: user.id,
          tipo_entidad: 'tramite',
          id_entidad: tramite.id_tramite,
          accion: 'crear',
          detalles: `Trámite creado con número de carpeta ${tramite.num_carpeta}, estado: ${estadoInicial}`,
        });
      }

      // Obtener el trámite actualizado para devolverlo
      const tramiteActualizado = await prisma.tramite.findUnique({
        where: { id_tramite: tramite.id_tramite },
        include: {
          consultante: { include: { usuario: true } },
          grupo: true,
        },
      });

      res.status(201).json(tramiteActualizado);
    } catch (error: any) {
      console.error('❌ Error al crear trámite:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Actualizar un trámite
  async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { estado, observaciones, fecha_cierre, motivo_cierre } = req.body;

      // Validar estado si se proporciona
      const estadosValidos = ['en_tramite', 'finalizado', 'pendiente', 'desistido'];
      if (estado !== undefined && !estadosValidos.includes(estado)) {
        return res.status(400).json({ 
          error: `Estado inválido. Estados válidos: ${estadosValidos.join(', ')}` 
        });
      }

      // Obtener el trámite actual para validar transiciones
      const tramiteActual = await prisma.tramite.findUnique({
        where: { id_tramite: parseInt(id) },
      });

      if (!tramiteActual) {
        return res.status(404).json({ error: 'Trámite no encontrado' });
      }

      // Normalizar estado "iniciado" a "en_tramite" para validación
      const estadoActualNormalizado = tramiteActual.estado === 'iniciado' ? 'en_tramite' : tramiteActual.estado;

      // Validar transiciones de estado permitidas
      if (estado !== undefined && estado !== estadoActualNormalizado && estado !== tramiteActual.estado) {
        const transicionesPermitidas: { [key: string]: string[] } = {
          'pendiente': ['en_tramite', 'desistido'],
          'en_tramite': ['finalizado', 'pendiente', 'desistido'],
          'finalizado': ['en_tramite', 'desistido'],
          'desistido': ['en_tramite'], // Se puede reactivar un trámite desistido
        };

        const estadosPermitidos = transicionesPermitidas[estadoActualNormalizado] || [];
        if (!estadosPermitidos.includes(estado)) {
          return res.status(400).json({ 
            error: `Transición no permitida. Desde "${tramiteActual.estado}" solo se puede cambiar a: ${estadosPermitidos.join(', ')}` 
          });
        }
      }

      const updateData: any = {};
      if (estado !== undefined) {
        // Si el estado actual es "iniciado" y se está cambiando, normalizar a "en_tramite" primero
        // pero si el nuevo estado es diferente, usar el nuevo estado directamente
        updateData.estado = estado;
      } else if (tramiteActual.estado === 'iniciado') {
        // Si no se está cambiando el estado pero el actual es "iniciado", normalizarlo a "en_tramite"
        updateData.estado = 'en_tramite';
      }
      if (observaciones !== undefined) updateData.observaciones = observaciones;
      if (fecha_cierre !== undefined) updateData.fecha_cierre = new Date(fecha_cierre);
      if (motivo_cierre !== undefined) updateData.motivo_cierre = motivo_cierre;

      // Obtener información del trámite antes de actualizar para las notificaciones
      const tramiteAnterior = await prisma.tramite.findUnique({
        where: { id_tramite: parseInt(id) },
        include: {
          consultante: {
            include: {
              usuario: true,
            },
          },
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
        },
      });

      const tramite = await prisma.tramite.update({
        where: { id_tramite: parseInt(id) },
        data: updateData,
        include: {
          consultante: {
            include: {
              usuario: true,
            },
          },
          grupo: true,
        },
      });

      console.log(`✅ Trámite actualizado: ${tramite.id_tramite}`);

      // Registrar auditoría
      const userId = req.user?.id;
      if (userId) {
        const cambios: string[] = [];
        if (estado !== undefined && estado !== tramiteAnterior?.estado) {
          cambios.push(`estado: ${tramiteAnterior?.estado} → ${estado}`);
        }
        if (observaciones !== undefined) {
          cambios.push('observaciones actualizadas');
        }
        if (fecha_cierre !== undefined) {
          cambios.push('fecha de cierre actualizada');
        }
        if (motivo_cierre !== undefined) {
          cambios.push('motivo de cierre actualizado');
        }

        await AuditoriaService.crearDesdeRequest(req, {
          id_usuario: userId,
          tipo_entidad: 'tramite',
          id_entidad: tramite.id_tramite,
          accion: cambios.length > 0 ? 'modificar' : 'actualizar',
          detalles: cambios.length > 0 
            ? `Cambios: ${cambios.join(', ')}` 
            : 'Trámite actualizado',
        });
      }

      // Enviar notificaciones si el estado cambió
      if (estado !== undefined && estado !== tramiteAnterior?.estado && tramiteAnterior) {
        try {
          const userId = req.user?.id; // Usuario que cambió el estado
          const usuarioCambio = await prisma.usuario.findUnique({
            where: { id_usuario: userId || 0 },
            select: { nombre: true },
          });

          const nombreUsuarioCambio = usuarioCambio?.nombre || 'Un usuario';
          const estadoAnterior = tramiteAnterior.estado;
          const estadoNuevo = estado;

          // Mapeo de estados a etiquetas más legibles
          const etiquetasEstado: { [key: string]: string } = {
            'en_tramite': 'En trámite',
            'finalizado': 'Finalizado',
            'pendiente': 'Pendiente',
            'desistido': 'Desistido',
            'iniciado': 'En trámite',
          };

          const etiquetaAnterior = etiquetasEstado[estadoAnterior] || estadoAnterior;
          const etiquetaNueva = etiquetasEstado[estadoNuevo] || estadoNuevo;

          // Obtener todos los miembros del grupo
          const idUsuariosGrupo = tramiteAnterior.grupo.miembros_grupo
            .map(mg => mg.id_usuario)
            .filter(id => id !== userId); // Excluir al usuario que hizo el cambio

          // Obtener ID del consultante
          const idUsuarioConsultante = tramiteAnterior.consultante.usuario.id_usuario;

          // Crear notificaciones para los miembros del grupo (excepto el que hizo el cambio)
          if (idUsuariosGrupo.length > 0) {
            await NotificacionService.crearMultiple(idUsuariosGrupo, {
              id_usuario_emisor: userId,
              titulo: 'Estado del trámite actualizado',
              mensaje: `${nombreUsuarioCambio} ha cambiado el estado del trámite ${tramite.num_carpeta} de "${etiquetaAnterior}" a "${etiquetaNueva}".${motivo_cierre ? ` Motivo: ${motivo_cierre}` : ''}`,
              tipo: estadoNuevo === 'finalizado' ? 'success' : estadoNuevo === 'desistido' ? 'warning' : 'info',
              tipo_entidad: 'tramite',
              id_entidad: tramite.id_tramite,
              id_tramite: tramite.id_tramite,
            });
          }

          // Crear notificación para el consultante (si no es el que hizo el cambio)
          if (idUsuarioConsultante !== userId) {
            await NotificacionService.crear({
              id_usuario: idUsuarioConsultante,
              id_usuario_emisor: userId,
              titulo: 'Estado de tu trámite actualizado',
              mensaje: `El estado de tu trámite ${tramite.num_carpeta} ha cambiado de "${etiquetaAnterior}" a "${etiquetaNueva}".${motivo_cierre ? ` Motivo: ${motivo_cierre}` : ''}`,
              tipo: estadoNuevo === 'finalizado' ? 'success' : estadoNuevo === 'desistido' ? 'warning' : 'info',
              tipo_entidad: 'tramite',
              id_entidad: tramite.id_tramite,
              id_tramite: tramite.id_tramite,
            });
          }

          console.log(`✅ Notificaciones enviadas por cambio de estado del trámite ${tramite.num_carpeta}`);
        } catch (notifError: any) {
          // No fallar la actualización si hay error en las notificaciones
          console.error('⚠️ Error al crear notificaciones (trámite actualizado exitosamente):', notifError);
        }
      }

      res.json(tramite);
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Trámite no encontrado' });
      }
      res.status(500).json({ error: error.message });
    }
  },


  // Eliminar trámite
  async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      // Obtener información del trámite antes de eliminarlo para la auditoría
      const tramite = await prisma.tramite.findUnique({
        where: { id_tramite: parseInt(id) },
        select: { num_carpeta: true },
      });

      // Por ahora, usamos hard delete
      // En producción, podrías implementar soft delete
      await prisma.tramite.delete({
        where: { id_tramite: parseInt(id) },
      });

      console.log(`🗑️  Trámite eliminado: ${id}`);

      // Registrar auditoría
      const userId = req.user?.id;
      if (userId) {
        await AuditoriaService.crearDesdeRequest(req, {
          id_usuario: userId,
          tipo_entidad: 'tramite',
          id_entidad: parseInt(id),
          accion: 'eliminar',
          detalles: tramite ? `Trámite eliminado: ${tramite.num_carpeta}` : `Trámite eliminado (ID: ${id})`,
        });
      }

      res.json({ message: 'Trámite eliminado exitosamente' });
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Trámite no encontrado' });
      }
      res.status(500).json({ error: error.message });
    }
  },

  // Enviar notificación
  async notificar(req: Request, res: Response) {
    try {
      const { id_tramite, tipo_notificacion, mensaje, id_usuario } = req.body;

      if (!id_tramite || !mensaje) {
        return res.status(400).json({
          error: 'id_tramite y mensaje son requeridos',
        });
      }

      // Verificar que el trámite existe y obtener el consultante
      const tramite = await prisma.tramite.findUnique({
        where: { id_tramite },
        include: {
          consultante: {
            include: {
              usuario: true,
            },
          },
        },
      });

      if (!tramite) {
        return res.status(404).json({ error: 'Trámite no encontrado' });
      }

      // Usar id_usuario del body o del consultante del trámite
      const usuarioDestinatario = id_usuario || tramite.consultante.id_usuario;

      // Crear la notificación en la base de datos
      const notificacion = await prisma.notificacion.create({
        data: {
          id_usuario: usuarioDestinatario,
          id_tramite,
          titulo: `Notificación de trámite ${tramite.num_carpeta}`,
          mensaje,
          tipo: (tipo_notificacion as 'info' | 'success' | 'warning' | 'error') || 'info',
          tipo_entidad: 'tramite',
          id_entidad: id_tramite,
        },
      });

      console.log(`📧 Notificación enviada para trámite ${id_tramite}`);

      res.json(notificacion);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // Aprobar trámite pendiente (solo para administradores)
  async aprobarTramite(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      // Verificar que el usuario es administrador
      if (user?.rol !== 'admin' && user?.rol !== 'administrador') {
        return res.status(403).json({ error: 'Solo los administradores pueden aprobar trámites' });
      }

      // Obtener el trámite
      const tramite = await prisma.tramite.findUnique({
        where: { id_tramite: parseInt(id) },
        include: {
          consultante: { include: { usuario: true } },
          grupo: true,
        },
      });

      if (!tramite) {
        return res.status(404).json({ error: 'Trámite no encontrado' });
      }

      // Verificar que el trámite está en estado pendiente
      if (tramite.estado !== 'pendiente') {
        return res.status(400).json({ 
          error: `Solo se pueden aprobar trámites pendientes. Estado actual: ${tramite.estado}` 
        });
      }

      // Actualizar el estado a "en_tramite" (los alumnos pueden empezar a trabajar)
      const tramiteActualizado = await prisma.tramite.update({
        where: { id_tramite: parseInt(id) },
        data: {
          estado: 'en_tramite',
        },
        include: {
          consultante: { include: { usuario: true } },
          grupo: true,
        },
      });

      console.log(`✅ Trámite ${id} aprobado por administrador`);

      // Registrar auditoría
      const userId = user?.id;
      if (userId) {
        await AuditoriaService.crearDesdeRequest(req, {
          id_usuario: userId,
          tipo_entidad: 'tramite',
          id_entidad: tramiteActualizado.id_tramite,
          accion: 'aprobar',
          detalles: `Trámite ${tramiteActualizado.num_carpeta} aprobado. Estado cambiado de pendiente a en_tramite`,
        });
      }

      res.json({
        success: true,
        message: 'Trámite aprobado exitosamente',
        tramite: tramiteActualizado,
      });
    } catch (error: any) {
      console.error('❌ Error al aprobar trámite:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Obtener estadísticas de trámites
  async getStats(req: Request, res: Response) {
    try {
      const [total, porEstado] = await Promise.all([
        prisma.tramite.count(),
        prisma.tramite.groupBy({
          by: ['estado'],
          _count: true,
        }),
      ]);

      const stats = {
        total,
        porEstado: porEstado.reduce((acc: any, curr: any) => {
          acc[curr.estado] = curr._count;
          return acc;
        }, {}),
      };

      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
};


