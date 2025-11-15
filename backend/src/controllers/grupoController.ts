import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { normalizeText } from '../utils/normalizeText';
import { AuthRequest } from '../middleware/authMiddleware';
import { AuditoriaService } from '../utils/auditoriaService';

export const grupoController = {
  async getAll(req: AuthRequest, res: Response) {
    try {
      const { search } = req.query;

      const where: any = {};

      // Búsqueda por texto en múltiples campos
      if (search && typeof search === 'string' && search.trim() !== '') {
        const searchTerm = search.trim();
        const normalizedSearch = normalizeText(searchTerm);
        
        where.OR = [
          // Buscar en nombre del grupo (con y sin tildes)
          { nombre: { contains: searchTerm, mode: 'insensitive' } },
          { nombre: { contains: normalizedSearch, mode: 'insensitive' } },
          // Buscar en descripción (con y sin tildes)
          { descripcion: { contains: searchTerm, mode: 'insensitive' } },
          { descripcion: { contains: normalizedSearch, mode: 'insensitive' } },
          // Buscar en nombre de miembros (responsables, asistentes, estudiantes) (con y sin tildes)
          {
            miembros_grupo: {
              some: {
                usuario: {
                  nombre: { contains: searchTerm, mode: 'insensitive' }
                }
              }
            }
          },
          {
            miembros_grupo: {
              some: {
                usuario: {
                  nombre: { contains: normalizedSearch, mode: 'insensitive' }
                }
              }
            }
          },
          // Buscar en CI de miembros
          {
            miembros_grupo: {
              some: {
                usuario: {
                  ci: { contains: searchTerm, mode: 'insensitive' }
                }
              }
            }
          }
        ];
      }

      const grupos = await prisma.grupo.findMany({
        where,
        include: {
          tramites: {
            take: 5,
            orderBy: { fecha_inicio: 'desc' },
          },
          miembros_grupo: {
            include: {
              usuario: true,
            },
          },
        },
        orderBy: {
          nombre: 'asc',
        },
      });

      // Registrar auditoría
      const userId = req.user?.id;
      if (userId) {
        await AuditoriaService.crearDesdeRequest(req, {
          id_usuario: userId,
          tipo_entidad: 'grupo',
          id_entidad: null,
          accion: 'listar',
          detalles: `Listado de grupos consultado${search ? ` con filtro: ${search}` : ''}`,
        });
      }

      res.json(grupos);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async getById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const grupo = await prisma.grupo.findUnique({
        where: { id_grupo: parseInt(id) },
        include: {
          tramites: {
            include: {
              consultante: {
                include: {
                  usuario: true,
                },
              },
            },
            orderBy: { fecha_inicio: 'desc' },
          },
          miembros_grupo: {
            include: {
              usuario: true,
            },
          },
        },
      });

      if (!grupo) {
        return res.status(404).json({ error: 'Grupo no encontrado' });
      }

      // Registrar auditoría
      const userId = req.user?.id;
      if (userId) {
        await AuditoriaService.crearDesdeRequest(req, {
          id_usuario: userId,
          tipo_entidad: 'grupo',
          id_entidad: grupo.id_grupo,
          accion: 'consultar',
          detalles: `Grupo consultado: ${grupo.nombre} (Miembros: ${grupo.miembros_grupo.length})`,
        });
      }

      res.json(grupo);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async create(req: AuthRequest, res: Response) {
    try {
      const { nombre, descripcion, activo, responsable_id, asistentes_ids, estudiantes_ids } = req.body;

      if (!nombre) {
        return res.status(400).json({ error: 'El nombre es requerido' });
      }

      // Validar que existe un responsable
      if (!responsable_id) {
        return res.status(400).json({ error: 'Un responsable es requerido' });
      }

      // Los asistentes son opcionales, validar que no esté vacío si se proporciona
      const asistentes = asistentes_ids || [];
      const estudiantes = estudiantes_ids || [];

      // Validar que los estudiantes no estén ya en otro grupo
      if (estudiantes.length > 0) {
        const estudiantesConGrupo = await prisma.usuarioGrupo.findMany({
          where: {
            id_usuario: { in: estudiantes },
            rol_en_grupo: 'estudiante',
          },
          include: {
            usuario: true,
            grupo: true,
          },
        });

        if (estudiantesConGrupo.length > 0) {
          const nombres = estudiantesConGrupo.map(eg => eg.usuario.nombre).join(', ');
          return res.status(400).json({ 
            error: `Los siguientes estudiantes ya pertenecen a un grupo: ${nombres}` 
          });
        }
      }

      // Crear datos de miembros
      const miembrosData = [
        { id_usuario: responsable_id, rol_en_grupo: 'responsable' },
        ...asistentes.map((asistente_id: number) => ({
          id_usuario: asistente_id,
          rol_en_grupo: 'asistente',
        })),
        ...estudiantes.map((estudiante_id: number) => ({
          id_usuario: estudiante_id,
          rol_en_grupo: 'estudiante',
        })),
      ];

      const grupo = await prisma.grupo.create({
        data: {
          nombre,
          descripcion,
          activo: activo !== undefined ? activo : true,
          miembros_grupo: {
            createMany: {
              data: miembrosData,
            },
          },
        },
        include: {
          miembros_grupo: {
            include: {
              usuario: true,
            },
          },
        },
      });

      // Registrar auditoría
      const userId = req.user?.id;
      if (userId) {
        await AuditoriaService.crearDesdeRequest(req, {
          id_usuario: userId,
          tipo_entidad: 'grupo',
          id_entidad: grupo.id_grupo,
          accion: 'crear',
          detalles: `Grupo creado: ${grupo.nombre}. Miembros: ${grupo.miembros_grupo.length}`,
        });
      }

      res.status(201).json(grupo);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { nombre, descripcion, activo } = req.body;

      const grupo = await prisma.grupo.update({
        where: { id_grupo: parseInt(id) },
        data: {
          nombre,
          descripcion,
          activo,
        },
        include: {
          miembros_grupo: {
            include: {
              usuario: true,
            },
          },
        },
      });

      // Registrar auditoría
      const userId = req.user?.id;
      if (userId) {
        const cambios: string[] = [];
        if (nombre !== undefined) cambios.push('nombre');
        if (descripcion !== undefined) cambios.push('descripción');
        if (activo !== undefined) cambios.push(`activo: ${activo}`);

        await AuditoriaService.crearDesdeRequest(req, {
          id_usuario: userId,
          tipo_entidad: 'grupo',
          id_entidad: grupo.id_grupo,
          accion: 'modificar',
          detalles: cambios.length > 0 
            ? `Grupo ${grupo.nombre} modificado. Campos: ${cambios.join(', ')}` 
            : `Grupo ${grupo.nombre} actualizado`,
        });
      }

      res.json(grupo);
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Grupo no encontrado' });
      }
      res.status(500).json({ error: error.message });
    }
  },

  async addMiembro(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { id_usuario, rol_en_grupo } = req.body;

      if (!id_usuario || !rol_en_grupo) {
        return res.status(400).json({ error: 'id_usuario y rol_en_grupo son requeridos' });
      }

      // Validar que el rol sea válido
      const rolesValidos = ['responsable', 'asistente', 'estudiante'];
      if (!rolesValidos.includes(rol_en_grupo)) {
        return res.status(400).json({ error: 'Rol inválido' });
      }

      // Verificar que el usuario existe
      const usuario = await prisma.usuario.findUnique({
        where: { id_usuario },
      });

      if (!usuario) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // Verificar que el grupo existe
      const grupo = await prisma.grupo.findUnique({
        where: { id_grupo: parseInt(id) },
      });

      if (!grupo) {
        return res.status(404).json({ error: 'Grupo no encontrado' });
      }

      // Si es un estudiante, validar que no esté ya en otro grupo
      if (rol_en_grupo === 'estudiante') {
        const estudianteEnGrupo = await prisma.usuarioGrupo.findFirst({
          where: {
            id_usuario,
            rol_en_grupo: 'estudiante',
          },
          include: {
            grupo: true,
          },
        });

        if (estudianteEnGrupo) {
          return res.status(400).json({ 
            error: `El estudiante ya pertenece al grupo: ${estudianteEnGrupo.grupo.nombre}. Los estudiantes solo pueden pertenecer a un grupo.` 
          });
        }
      }

      // Verificar si el usuario ya está en el grupo con otro rol
      const miembroExistente = await prisma.usuarioGrupo.findFirst({
        where: {
          id_grupo: parseInt(id),
          id_usuario,
        },
      });

      let miembro;
      
      if (miembroExistente) {
        // Si ya está en el grupo, actualizar su rol
        if (miembroExistente.rol_en_grupo === rol_en_grupo) {
          return res.status(400).json({ error: 'El usuario ya tiene este rol en el grupo' });
        }
        
        // Si se está cambiando a responsable, asegurar que el responsable actual se convierta en asistente
        if (rol_en_grupo === 'responsable' && miembroExistente.rol_en_grupo !== 'responsable') {
          const responsableActual = await prisma.usuarioGrupo.findFirst({
            where: {
              id_grupo: parseInt(id),
              rol_en_grupo: 'responsable',
            },
          });

          if (responsableActual && responsableActual.id_usuario !== id_usuario) {
            // Convertir el responsable actual en asistente
            await prisma.usuarioGrupo.update({
              where: { id_usuario_grupo: responsableActual.id_usuario_grupo },
              data: { rol_en_grupo: 'asistente' },
            });
          }
        }
        
        // Actualizar el rol del miembro existente
        miembro = await prisma.usuarioGrupo.update({
          where: { id_usuario_grupo: miembroExistente.id_usuario_grupo },
          data: { rol_en_grupo },
          include: {
            usuario: true,
            grupo: true,
          },
        });
      } else {
        // Si es responsable y ya existe uno, convertir el actual en asistente
        if (rol_en_grupo === 'responsable') {
          const responsableActual = await prisma.usuarioGrupo.findFirst({
            where: {
              id_grupo: parseInt(id),
              rol_en_grupo: 'responsable',
            },
          });

          if (responsableActual) {
            // Convertir el responsable actual en asistente
            await prisma.usuarioGrupo.update({
              where: { id_usuario_grupo: responsableActual.id_usuario_grupo },
              data: { rol_en_grupo: 'asistente' },
            });
          }
        }
        
        // Crear nuevo miembro
        miembro = await prisma.usuarioGrupo.create({
          data: {
            id_grupo: parseInt(id),
            id_usuario,
            rol_en_grupo,
          },
          include: {
            usuario: true,
            grupo: true,
          },
        });
      }

      res.status(201).json(miembro);
    } catch (error: any) {
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'El usuario ya pertenece a este grupo' });
      }
      res.status(500).json({ error: error.message });
    }
  },

  async removeMiembro(req: Request, res: Response) {
    try {
      const { id, id_usuario_grupo } = req.params;

      // Verificar que el miembro pertenece al grupo
      const miembro = await prisma.usuarioGrupo.findUnique({
        where: { id_usuario_grupo: parseInt(id_usuario_grupo) },
        include: {
          grupo: true,
        },
      });

      if (!miembro) {
        return res.status(404).json({ error: 'Miembro no encontrado' });
      }

      if (miembro.id_grupo !== parseInt(id)) {
        return res.status(400).json({ error: 'El miembro no pertenece a este grupo' });
      }

      // No permitir eliminar al responsable si es el único responsable
      if (miembro.rol_en_grupo === 'responsable') {
        const responsables = await prisma.usuarioGrupo.findMany({
          where: {
            id_grupo: parseInt(id),
            rol_en_grupo: 'responsable',
          },
        });

        if (responsables.length === 1) {
          return res.status(400).json({ 
            error: 'No se puede eliminar al responsable. El grupo debe tener al menos un responsable.' 
          });
        }
      }

      await prisma.usuarioGrupo.delete({
        where: { id_usuario_grupo: parseInt(id_usuario_grupo) },
      });

      res.json({ message: 'Miembro eliminado exitosamente' });
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Miembro no encontrado' });
      }
      res.status(500).json({ error: error.message });
    }
  },

  async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      // Verificar que el grupo existe
      const grupo = await prisma.grupo.findUnique({
        where: { id_grupo: parseInt(id) },
        include: {
          tramites: true,
          miembros_grupo: true,
        },
      });

      if (!grupo) {
        return res.status(404).json({ error: 'Grupo no encontrado' });
      }

      // Verificar que el grupo no tenga trámites asociados
      if (grupo.tramites && grupo.tramites.length > 0) {
        return res.status(400).json({ 
          error: `No se puede eliminar el grupo. Tiene ${grupo.tramites.length} trámite(s) asociado(s).` 
        });
      }

      // Eliminar el grupo (esto eliminará automáticamente los miembros_grupo por cascade)
      await prisma.grupo.delete({
        where: { id_grupo: parseInt(id) },
      });

      // Registrar auditoría
      if (userId) {
        await AuditoriaService.crearDesdeRequest(req, {
          id_usuario: userId,
          tipo_entidad: 'grupo',
          id_entidad: parseInt(id),
          accion: 'eliminar',
          detalles: `Grupo eliminado: ${grupo.nombre}`,
        });
      }

      res.json({ message: 'Grupo eliminado exitosamente' });
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Grupo no encontrado' });
      }
      // Si hay error de foreign key, significa que hay relaciones que impiden la eliminación
      if (error.code === 'P2003') {
        return res.status(400).json({ 
          error: 'No se puede eliminar el grupo porque tiene relaciones activas (trámites, fichas, etc.)' 
        });
      }
      res.status(500).json({ error: error.message });
    }
  },
};


