import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { normalizeText } from '../utils/normalizeText';
import { AuthRequest } from '../middleware/authMiddleware';
import { NotificacionService } from '../utils/notificacionService';
import { AuditoriaService } from '../utils/auditoriaService';
import { formatDate } from '../utils/dateFormatter';

/**
 * Genera el número de consulta en formato F001/25
 * donde F es el prefijo, 001 es un número secuencial de 3 dígitos y 25 es el año actual (2 dígitos)
 */
async function generarNumeroConsulta(): Promise<string> {
  const añoActual = new Date().getFullYear();
  const añoActual2Digitos = añoActual.toString().slice(-2); // Últimos 2 dígitos del año
  
  // Buscar todas las fichas del año actual que empiecen con F
  const fichasDelAño = await prisma.ficha.findMany({
    where: {
      numero_consulta: {
        contains: `/${añoActual2Digitos}`,
      },
    },
    select: {
      numero_consulta: true,
    },
  });
  
  // Filtrar solo las que empiezan con F
  const fichasConPrefijoF = fichasDelAño.filter(f => f.numero_consulta.startsWith('F'));

  let siguienteNumero = 1;
  
  if (fichasConPrefijoF.length > 0) {
    // Extraer todos los números y encontrar el máximo
    const numeros = fichasConPrefijoF
      .map(f => {
        // Formato esperado: F001/25
        const match = f.numero_consulta.match(/^F(\d+)\/(\d+)$/);
        if (match && match[2] === añoActual2Digitos) {
          return parseInt(match[1], 10);
        }
        return 0;
      })
      .filter(n => !isNaN(n) && n > 0);
    
    if (numeros.length > 0) {
      siguienteNumero = Math.max(...numeros) + 1;
    }
  }

  // Formatear con ceros a la izquierda (3 dígitos)
  const numeroFormateado = siguienteNumero.toString().padStart(3, '0');
  
  return `F${numeroFormateado}/${añoActual2Digitos}`;
}

/**
 * Genera el número de carpeta en formato T001/25
 * donde T es el prefijo, 001 es un número secuencial de 3 dígitos y 25 es el año actual (2 dígitos)
 * Ejemplo: T001/25, T010/25, T100/25
 * Este formato se usa para los trámites iniciados desde fichas
 */
async function generarNumeroCarpeta(): Promise<string> {
  const añoActual = new Date().getFullYear();
  const añoActual2Digitos = añoActual.toString().slice(-2); // Últimos 2 dígitos del año
  
  // Buscar todos los trámites del año actual que empiecen con T
  const tramitesDelAño = await prisma.tramite.findMany({
    where: {
      num_carpeta: {
        contains: `/${añoActual2Digitos}`,
        mode: 'insensitive',
      },
    },
    select: {
      num_carpeta: true,
    },
  });
  
  // Filtrar solo los que empiezan con T
  const tramitesConPrefijoT = tramitesDelAño.filter(t => t.num_carpeta.toUpperCase().startsWith('T'));

  let siguienteNumero = 1;
  
  if (tramitesConPrefijoT.length > 0) {
    // Extraer todos los números y encontrar el máximo
    const numeros = tramitesConPrefijoT
      .map(t => {
        // Formato esperado: T001/25
        const match = t.num_carpeta.match(/^T(\d+)\/(\d+)$/i);
        if (match && match[2] === añoActual2Digitos) {
          return parseInt(match[1], 10);
        }
        return 0;
      })
      .filter(n => !isNaN(n) && n > 0);
    
    if (numeros.length > 0) {
      siguienteNumero = Math.max(...numeros) + 1;
    }
  }

  // Formatear con ceros a la izquierda (3 dígitos)
  const numeroFormateado = siguienteNumero.toString().padStart(3, '0');
  
  return `T${numeroFormateado}/${añoActual2Digitos}`;
}

export const fichaController = {
  // Obtener todas las fichas
  async getAll(req: AuthRequest, res: Response) {
    try {
      const { estado, id_docente, id_consultante, search } = req.query;

      const where: any = {};
      if (estado) where.estado = estado;
      if (id_docente) where.id_docente = parseInt(id_docente as string);
      if (id_consultante) where.id_consultante = parseInt(id_consultante as string);

      // Búsqueda por texto en múltiples campos
      if (search && typeof search === 'string' && search.trim() !== '') {
        const searchTerm = search.trim();
        const normalizedSearch = normalizeText(searchTerm);
        
        where.OR = [
          // Buscar en número de consulta
          { numero_consulta: { contains: searchTerm, mode: 'insensitive' } },
          // Buscar en tema de consulta (con y sin tildes)
          { tema_consulta: { contains: searchTerm, mode: 'insensitive' } },
          { tema_consulta: { contains: normalizedSearch, mode: 'insensitive' } },
          // Buscar en observaciones (con y sin tildes)
          { observaciones: { contains: searchTerm, mode: 'insensitive' } },
          { observaciones: { contains: normalizedSearch, mode: 'insensitive' } },
          // Buscar en hora de cita
          { hora_cita: { contains: searchTerm, mode: 'insensitive' } },
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
          // Buscar en nombre del docente (con y sin tildes)
          {
            docente: {
              nombre: { contains: searchTerm, mode: 'insensitive' }
            }
          },
          {
            docente: {
              nombre: { contains: normalizedSearch, mode: 'insensitive' }
            }
          },
          // Buscar en CI del docente
          {
            docente: {
              ci: { contains: searchTerm, mode: 'insensitive' }
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

      const fichas = await prisma.ficha.findMany({
        where,
        include: {
          consultante: {
            include: {
              usuario: true,
            },
          },
          docente: {
            select: {
              id_usuario: true,
              nombre: true,
              ci: true,
              correo: true,
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
                      ci: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      // Registrar auditoría
      const userId = req.user?.id;
      if (userId) {
        const filtros: string[] = [];
        if (estado) filtros.push(`estado: ${estado}`);
        if (id_docente) filtros.push(`docente: ${id_docente}`);
        if (id_consultante) filtros.push(`consultante: ${id_consultante}`);
        if (search) filtros.push(`búsqueda: ${search}`);
        
        await AuditoriaService.crearDesdeRequest(req, {
          id_usuario: userId,
          tipo_entidad: 'ficha',
          id_entidad: null,
          accion: 'listar',
          detalles: `Listado de fichas consultado${filtros.length > 0 ? `. Filtros: ${filtros.join(', ')}` : ''}`,
        });
      }

      res.json(fichas);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // Obtener fichas en standby (disponibles para asignar)
  async getStandby(req: Request, res: Response) {
    try {
      const fichas = await prisma.ficha.findMany({
        where: {
          estado: 'standby',
        },
        include: {
          consultante: {
            include: {
              usuario: true,
            },
          },
          docente: {
            select: {
              id_usuario: true,
              nombre: true,
              ci: true,
              correo: true,
            },
          },
        },
        orderBy: {
          fecha_cita: 'asc',
        },
      });

      res.json(fichas);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // Obtener una ficha por ID
  async getById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const ficha = await prisma.ficha.findUnique({
        where: { id_ficha: parseInt(id) },
        include: {
          consultante: {
            include: {
              usuario: true,
            },
          },
          docente: {
            select: {
              id_usuario: true,
              nombre: true,
              ci: true,
              correo: true,
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
                      ci: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!ficha) {
        return res.status(404).json({ error: 'Ficha no encontrada' });
      }

      // Registrar auditoría
      const userId = req.user?.id;
      if (userId) {
        await AuditoriaService.crearDesdeRequest(req, {
          id_usuario: userId,
          tipo_entidad: 'ficha',
          id_entidad: ficha.id_ficha,
          accion: 'consultar',
          detalles: `Ficha consultada: ${ficha.numero_consulta} (Estado: ${ficha.estado}, Consultante: ${ficha.consultante.usuario.nombre})`,
        });
      }

      res.json(ficha);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // Crear una nueva ficha (por administrativo)
  async create(req: AuthRequest, res: Response) {
    try {
      // Validar que el usuario es administrativo (rol === 'administrador' y nivel_acceso === 1)
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const usuario = await prisma.usuario.findUnique({
        where: { id_usuario: userId },
        select: { rol: true, nivel_acceso: true },
      });

      if (!usuario) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      if (usuario.rol !== 'administrador' || usuario.nivel_acceso !== 1) {
        return res.status(403).json({
          error: 'Solo los administrativos pueden crear fichas',
        });
      }

      const { id_consultante, fecha_cita, hora_cita, tema_consulta, id_docente, observaciones, estado } = req.body;

      // Determinar el estado: si se proporciona "pendiente", usar ese; si se proporciona "aprobado", usar "standby" (aprobado para docentes)
      // Si no se proporciona, usar "standby" por defecto (comportamiento anterior)
      let estadoFicha = 'standby';
      if (estado === 'pendiente') {
        estadoFicha = 'pendiente';
      } else if (estado === 'aprobado') {
        estadoFicha = 'standby'; // "standby" es el estado aprobado que los docentes pueden ver
      }

      // Normalizar valores: convertir cadenas vacías a undefined/null
      const fechaCitaNormalizada = (fecha_cita && fecha_cita.trim() !== '') ? fecha_cita : undefined;
      const horaCitaNormalizada = (hora_cita && hora_cita.trim() !== '') ? hora_cita : undefined;
      const observacionesNormalizadas = (observaciones && observaciones.trim() !== '') ? observaciones : undefined;

      // Validar datos requeridos
      // Si es ficha pendiente, fecha_cita no es requerida
      if (!id_consultante || !tema_consulta || !id_docente) {
        return res.status(400).json({
          error: 'id_consultante, tema_consulta e id_docente son requeridos',
        });
      }

      // Si no es ficha pendiente, fecha_cita y hora_cita son requeridas
      if (estadoFicha !== 'pendiente' && !fechaCitaNormalizada) {
        return res.status(400).json({
          error: 'fecha_cita es requerida para fichas aprobadas',
        });
      }

      if (estadoFicha !== 'pendiente' && !horaCitaNormalizada) {
        return res.status(400).json({
          error: 'hora_cita es requerida para fichas aprobadas',
        });
      }

      // Verificar que el consultante existe y obtener su información
      const consultante = await prisma.consultante.findUnique({
        where: { id_consultante },
        include: {
          usuario: {
            select: {
              id_usuario: true,
              nombre: true,
            },
          },
        },
      });

      if (!consultante) {
        return res.status(404).json({ error: 'Consultante no encontrado' });
      }

      // Verificar que el docente existe y tiene rol docente
      const docente = await prisma.usuario.findUnique({
        where: { id_usuario: id_docente },
      });

      if (!docente) {
        return res.status(404).json({ error: 'Docente no encontrado' });
      }

      if (docente.rol !== 'docente') {
        return res.status(400).json({ error: 'El usuario especificado no es un docente' });
      }

      // Generar número de consulta
      const numero_consulta = await generarNumeroConsulta();

      // Crear la ficha
      // Si es ficha pendiente y no hay fecha_cita, usar una fecha por defecto (fecha actual)
      // Si hay fecha_cita, convertirla a Date
      let fechaCitaFinal: Date;
      if (fechaCitaNormalizada) {
        fechaCitaFinal = new Date(fechaCitaNormalizada);
        // Validar que la fecha sea válida
        if (isNaN(fechaCitaFinal.getTime())) {
          return res.status(400).json({ error: 'Fecha de cita inválida' });
        }
      } else {
        // Para fichas pendientes sin fecha, usar fecha actual
        fechaCitaFinal = new Date();
      }
      
      const ficha = await prisma.ficha.create({
        data: {
          id_consultante,
          fecha_cita: fechaCitaFinal,
          hora_cita: horaCitaNormalizada || null,
          tema_consulta,
          id_docente,
          numero_consulta,
          estado: estadoFicha,
          observaciones: observacionesNormalizadas || null,
        },
        include: {
          consultante: {
            include: {
              usuario: true,
            },
          },
          docente: {
            select: {
              id_usuario: true,
              nombre: true,
              ci: true,
              correo: true,
            },
          },
        },
      });

      console.log(`✅ Ficha creada: ${ficha.numero_consulta} - Estado: ${ficha.estado}`);

      // Registrar auditoría
      if (userId) {
        await AuditoriaService.crearDesdeRequest(req, {
          id_usuario: userId,
          tipo_entidad: 'ficha',
          id_entidad: ficha.id_ficha,
          accion: 'crear',
          detalles: `Ficha creada: ${ficha.numero_consulta}, estado: ${ficha.estado}, docente: ${ficha.docente.nombre}`,
        });
      }

      // Crear notificaciones para el docente y el consultante
      try {
        const idUsuarioCreador = userId; // Usuario que crea la ficha (administrativo)
        const idUsuarioConsultante = consultante.usuario.id_usuario; // Usuario del consultante

        // Notificación para el docente asignado
        await NotificacionService.crear({
          id_usuario: id_docente,
          id_usuario_emisor: idUsuarioCreador,
          titulo: 'Nueva ficha asignada',
          mensaje: `Se te ha asignado una nueva ficha de consulta: ${ficha.numero_consulta}. Consultante: ${ficha.consultante.usuario.nombre}. Tema: ${tema_consulta}`,
          tipo: 'info',
          tipo_entidad: 'ficha',
          id_entidad: ficha.id_ficha,
        });

        // Notificación para el consultante
        await NotificacionService.crear({
          id_usuario: idUsuarioConsultante,
          id_usuario_emisor: idUsuarioCreador,
          titulo: 'Ficha de consulta creada',
          mensaje: `Se ha creado tu ficha de consulta: ${ficha.numero_consulta}. ${estadoFicha === 'pendiente' ? 'La ficha está pendiente de aprobación.' : `Fecha de cita: ${fechaCitaNormalizada ? formatDate(fechaCitaNormalizada) : 'Por definir'}${horaCitaNormalizada ? ` ${horaCitaNormalizada}` : ''}.`}`,
          tipo: estadoFicha === 'pendiente' ? 'warning' : 'success',
          tipo_entidad: 'ficha',
          id_entidad: ficha.id_ficha,
        });

        console.log(`✅ Notificaciones creadas para ficha ${ficha.numero_consulta}`);
      } catch (notifError: any) {
        // No fallar la creación de la ficha si hay error en las notificaciones
        console.error('⚠️ Error al crear notificaciones (ficha creada exitosamente):', notifError);
      }

      res.status(201).json(ficha);
    } catch (error: any) {
      console.error('❌ Error al crear ficha:', error);
      console.error('Error completo:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'Ya existe una ficha con ese número de consulta' });
      }
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Registro relacionado no encontrado' });
      }
      // Si es un error de modelo no encontrado (tabla no existe)
      if (error.message && error.message.includes('model') && error.message.includes('not found')) {
        return res.status(500).json({ 
          error: 'Modelo Ficha no encontrado. Por favor ejecute la migración de Prisma: npx prisma migrate dev' 
        });
      }
      
      // Error más detallado para debugging
      const errorMessage = error.message || 'Error interno del servidor';
      const errorResponse: any = { 
        error: errorMessage
      };
      
      if (process.env.NODE_ENV === 'development') {
        errorResponse.details = {
          message: error.message,
          stack: error.stack,
          code: error.code,
          meta: error.meta,
          name: error.name
        };
      }
      
      res.status(500).json(errorResponse);
    }
  },

  // Aprobar ficha pendiente (solo para administradores)
  async aprobarFicha(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { fecha_cita, hora_cita } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      // Verificar que el usuario es administrador
      const usuario = await prisma.usuario.findUnique({
        where: { id_usuario: userId },
        select: { rol: true, nivel_acceso: true },
      });

      if (!usuario) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      if (usuario.rol !== 'administrador') {
        return res.status(403).json({ error: 'Solo los administradores pueden aprobar fichas' });
      }

      // Validar que se proporcionen fecha y hora
      if (!fecha_cita || !hora_cita) {
        return res.status(400).json({ 
          error: 'fecha_cita y hora_cita son requeridas para aprobar una ficha' 
        });
      }

      // Validar formato de fecha
      const fechaCitaDate = new Date(fecha_cita);
      if (isNaN(fechaCitaDate.getTime())) {
        return res.status(400).json({ error: 'Fecha de cita inválida' });
      }

      // Validar formato de hora (HH:mm)
      const horaRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
      if (!horaRegex.test(hora_cita)) {
        return res.status(400).json({ error: 'Formato de hora inválido. Use formato HH:mm (24 horas)' });
      }

      // Obtener la ficha
      const ficha = await prisma.ficha.findUnique({
        where: { id_ficha: parseInt(id) },
        include: {
          consultante: { include: { usuario: true } },
          docente: {
            select: {
              id_usuario: true,
              nombre: true,
              ci: true,
              correo: true,
            },
          },
        },
      });

      if (!ficha) {
        return res.status(404).json({ error: 'Ficha no encontrada' });
      }

      // Verificar que la ficha está en estado pendiente
      if (ficha.estado !== 'pendiente') {
        return res.status(400).json({ 
          error: `Solo se pueden aprobar fichas pendientes. Estado actual: ${ficha.estado}` 
        });
      }

      // Actualizar el estado a "standby" (aprobado, visible para docentes) y asignar fecha/hora
      const fichaActualizada = await prisma.ficha.update({
        where: { id_ficha: parseInt(id) },
        data: {
          estado: 'standby',
          fecha_cita: fechaCitaDate,
          hora_cita: hora_cita,
        },
        include: {
          consultante: { include: { usuario: true } },
          docente: {
            select: {
              id_usuario: true,
              nombre: true,
              ci: true,
              correo: true,
            },
          },
        },
      });

      console.log(`✅ Ficha ${id} aprobada por administrador con fecha ${fecha_cita} y hora ${hora_cita}`);

      // Registrar auditoría
      if (userId) {
        await AuditoriaService.crearDesdeRequest(req, {
          id_usuario: userId,
          tipo_entidad: 'ficha',
          id_entidad: fichaActualizada.id_ficha,
          accion: 'aprobar',
          detalles: `Ficha ${fichaActualizada.numero_consulta} aprobada. Fecha: ${fecha_cita}, Hora: ${hora_cita}`,
        });
      }

      res.json({
        success: true,
        message: 'Ficha aprobada exitosamente',
        ficha: fichaActualizada,
      });
    } catch (error: any) {
      console.error('❌ Error al aprobar ficha:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Asignar ficha a un grupo (por docente)
  async asignarAGrupo(req: AuthRequest, res: Response) {
    try {
      // Validar que el usuario es docente
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const usuario = await prisma.usuario.findUnique({
        where: { id_usuario: userId },
        select: { rol: true },
      });

      if (!usuario) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      if (usuario.rol !== 'docente') {
        return res.status(403).json({
          error: 'Solo los docentes pueden asignar fichas a grupos',
        });
      }

      const { id } = req.params;
      const { id_grupo } = req.body;

      if (!id_grupo) {
        return res.status(400).json({ error: 'id_grupo es requerido' });
      }

      // Verificar que la ficha existe
      const ficha = await prisma.ficha.findUnique({
        where: { id_ficha: parseInt(id) },
      });

      if (!ficha) {
        return res.status(404).json({ error: 'Ficha no encontrada' });
      }

      // Verificar que la ficha está en estado standby
      if (ficha.estado !== 'standby') {
        return res.status(400).json({
          error: `No se puede asignar una ficha en estado "${ficha.estado}". Solo se pueden asignar fichas en estado "standby".`,
        });
      }

      // Verificar que el grupo existe
      const grupo = await prisma.grupo.findUnique({
        where: { id_grupo },
      });

      if (!grupo) {
        return res.status(404).json({ error: 'Grupo no encontrado' });
      }

      if (!grupo.activo) {
        return res.status(400).json({ error: 'El grupo no está activo' });
      }

      // Actualizar la ficha
      const fichaActualizada = await prisma.ficha.update({
        where: { id_ficha: parseInt(id) },
        data: {
          id_grupo,
          estado: 'asignada',
        },
        include: {
          consultante: {
            include: {
              usuario: true,
            },
          },
          docente: {
            select: {
              id_usuario: true,
              nombre: true,
              ci: true,
              correo: true,
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
                      ci: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      console.log(`✅ Ficha ${fichaActualizada.numero_consulta} asignada al grupo ${grupo.nombre}`);

      // Registrar auditoría
      if (userId) {
        await AuditoriaService.crearDesdeRequest(req, {
          id_usuario: userId,
          tipo_entidad: 'ficha',
          id_entidad: fichaActualizada.id_ficha,
          accion: 'asignar',
          detalles: `Ficha ${fichaActualizada.numero_consulta} asignada al grupo ${grupo.nombre}`,
        });
      }

      // Crear notificaciones para todos los miembros del grupo
      try {
        await NotificacionService.crearParaGrupo(id_grupo, {
          id_usuario_emisor: userId, // Docente que asigna la ficha
          titulo: 'Nueva ficha asignada a tu grupo',
          mensaje: `Se ha asignado la ficha de consulta ${fichaActualizada.numero_consulta} a tu grupo "${grupo.nombre}". Consultante: ${fichaActualizada.consultante.usuario.nombre}. Tema: ${fichaActualizada.tema_consulta}. ${fichaActualizada.fecha_cita ? `Fecha de cita: ${formatDate(fichaActualizada.fecha_cita)}${fichaActualizada.hora_cita ? ` ${fichaActualizada.hora_cita}` : ''}.` : ''}`,
          tipo: 'info',
          tipo_entidad: 'ficha',
          id_entidad: fichaActualizada.id_ficha,
        });

        console.log(`✅ Notificaciones creadas para los miembros del grupo ${grupo.nombre}`);
      } catch (notifError: any) {
        // No fallar la asignación si hay error en las notificaciones
        console.error('⚠️ Error al crear notificaciones (ficha asignada exitosamente):', notifError);
      }

      res.json(fichaActualizada);
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Ficha no encontrada' });
      }
      res.status(500).json({ error: error.message });
    }
  },

  // Iniciar trámite desde ficha (por grupo de estudiantes)
  async iniciarTramite(req: AuthRequest, res: Response) {
    try {
      // Validar que el usuario es estudiante del grupo asignado
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const { id } = req.params;
      const { observaciones } = req.body;

      // Verificar que la ficha existe
      const ficha = await prisma.ficha.findUnique({
        where: { id_ficha: parseInt(id) },
        include: {
          consultante: true,
          grupo: true,
        },
      });

      if (!ficha) {
        return res.status(404).json({ error: 'Ficha no encontrada' });
      }

      // Verificar que la ficha está asignada a un grupo
      if (ficha.estado !== 'asignada' || !ficha.id_grupo) {
        return res.status(400).json({
          error: 'La ficha debe estar asignada a un grupo antes de iniciar el trámite',
        });
      }

      // Verificar que el usuario es estudiante del grupo asignado
      const grupo = await prisma.grupo.findUnique({
        where: { id_grupo: ficha.id_grupo },
        include: {
          miembros_grupo: {
            where: {
              id_usuario: userId,
              rol_en_grupo: 'estudiante',
            },
          },
        },
      });

      if (!grupo || grupo.miembros_grupo.length === 0) {
        return res.status(403).json({
          error: 'Solo los estudiantes del grupo asignado pueden iniciar el trámite desde la ficha',
        });
      }

      // Generar número de carpeta secuencial automáticamente
      let num_carpeta: string;
      let intentos = 0;
      const maxIntentos = 10;

      do {
        num_carpeta = await generarNumeroCarpeta();
        
        // Verificar que no existe un trámite con ese número de carpeta
        const tramiteExistente = await prisma.tramite.findUnique({
          where: { num_carpeta },
        });

        if (!tramiteExistente) {
          break; // El número está disponible
        }

        intentos++;
        if (intentos >= maxIntentos) {
          return res.status(500).json({ 
            error: 'No se pudo generar un número de carpeta único después de varios intentos' 
          });
        }

        // Esperar un poco antes de intentar de nuevo (para evitar condiciones de carrera)
        await new Promise(resolve => setTimeout(resolve, 100));
      } while (intentos < maxIntentos);

      // Crear el trámite
      const tramite = await prisma.tramite.create({
        data: {
          id_consultante: ficha.id_consultante,
          id_grupo: ficha.id_grupo,
          num_carpeta,
          observaciones: observaciones || ficha.observaciones,
          estado: 'en_tramite',
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

      // Actualizar el estado de la ficha a "iniciada"
      await prisma.ficha.update({
        where: { id_ficha: parseInt(id) },
        data: {
          estado: 'iniciada',
        },
      });

      console.log(`✅ Trámite iniciado desde ficha ${ficha.numero_consulta}: ${tramite.id_tramite}`);

      // Registrar auditoría
      if (userId) {
        await AuditoriaService.crearDesdeRequest(req, {
          id_usuario: userId,
          tipo_entidad: 'tramite',
          id_entidad: tramite.id_tramite,
          accion: 'crear',
          detalles: `Trámite iniciado desde ficha ${ficha.numero_consulta}. Número de carpeta: ${tramite.num_carpeta}`,
        });
      }

      // Crear notificación para el consultante
      try {
        const idUsuarioConsultante = tramite.consultante.usuario.id_usuario;
        const nombreGrupo = ficha.grupo?.nombre || 'grupo asignado';

        await NotificacionService.crear({
          id_usuario: idUsuarioConsultante,
          id_usuario_emisor: userId, // Estudiante que inició el trámite
          titulo: 'Trámite iniciado desde tu ficha',
          mensaje: `Se ha iniciado un trámite desde tu ficha de consulta ${ficha.numero_consulta}. Número de carpeta: ${tramite.num_carpeta}. Grupo responsable: ${nombreGrupo}. El trámite está ahora en proceso.`,
          tipo: 'success',
          tipo_entidad: 'tramite',
          id_entidad: tramite.id_tramite,
          id_tramite: tramite.id_tramite,
        });

        console.log(`✅ Notificación creada para el consultante sobre el trámite iniciado`);
      } catch (notifError: any) {
        // No fallar la creación del trámite si hay error en las notificaciones
        console.error('⚠️ Error al crear notificación para consultante (trámite iniciado exitosamente):', notifError);
      }

      // Obtener el trámite actualizado
      const tramiteActualizado = await prisma.tramite.findUnique({
        where: { id_tramite: tramite.id_tramite },
        include: {
          consultante: { include: { usuario: true } },
          grupo: true,
        },
      });

      res.status(201).json({
        tramite: tramiteActualizado,
        ficha: await prisma.ficha.findUnique({
          where: { id_ficha: parseInt(id) },
          include: {
            consultante: { include: { usuario: true } },
            docente: true,
            grupo: true,
          },
        }),
      });
    } catch (error: any) {
      console.error('❌ Error al iniciar trámite desde ficha:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Actualizar una ficha
  async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { fecha_cita, hora_cita, tema_consulta, id_docente, observaciones } = req.body;

      const updateData: any = {};
      if (fecha_cita !== undefined) updateData.fecha_cita = new Date(fecha_cita);
      if (hora_cita !== undefined) updateData.hora_cita = hora_cita || null;
      if (tema_consulta !== undefined) updateData.tema_consulta = tema_consulta;
      if (observaciones !== undefined) updateData.observaciones = observaciones;

      // Si se cambia el docente, verificar que existe y es docente
      if (id_docente !== undefined) {
        const docente = await prisma.usuario.findUnique({
          where: { id_usuario: id_docente },
        });

        if (!docente) {
          return res.status(404).json({ error: 'Docente no encontrado' });
        }

        if (docente.rol !== 'docente') {
          return res.status(400).json({ error: 'El usuario especificado no es un docente' });
        }

        updateData.id_docente = id_docente;
      }

      const ficha = await prisma.ficha.update({
        where: { id_ficha: parseInt(id) },
        data: updateData,
        include: {
          consultante: {
            include: {
              usuario: true,
            },
          },
          docente: {
            select: {
              id_usuario: true,
              nombre: true,
              ci: true,
              correo: true,
            },
          },
          grupo: true,
        },
      });

      // Registrar auditoría
      const userId = req.user?.id;
      if (userId) {
        const cambios: string[] = [];
        if (fecha_cita !== undefined) cambios.push('fecha de cita');
        if (hora_cita !== undefined) cambios.push('hora de cita');
        if (tema_consulta !== undefined) cambios.push('tema de consulta');
        if (id_docente !== undefined) cambios.push('docente asignado');
        if (observaciones !== undefined) cambios.push('observaciones');

        await AuditoriaService.crearDesdeRequest(req, {
          id_usuario: userId,
          tipo_entidad: 'ficha',
          id_entidad: ficha.id_ficha,
          accion: 'modificar',
          detalles: cambios.length > 0 
            ? `Ficha ${ficha.numero_consulta} modificada. Campos: ${cambios.join(', ')}` 
            : `Ficha ${ficha.numero_consulta} actualizada`,
        });
      }

      res.json(ficha);
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Ficha no encontrada' });
      }
      res.status(500).json({ error: error.message });
    }
  },

  // Eliminar una ficha (solo si está en standby)
  async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const ficha = await prisma.ficha.findUnique({
        where: { id_ficha: parseInt(id) },
      });

      if (!ficha) {
        return res.status(404).json({ error: 'Ficha no encontrada' });
      }

      // Solo permitir eliminar fichas en standby
      if (ficha.estado !== 'standby') {
        return res.status(400).json({
          error: `No se puede eliminar una ficha en estado "${ficha.estado}". Solo se pueden eliminar fichas en estado "standby".`,
        });
      }

      await prisma.ficha.delete({
        where: { id_ficha: parseInt(id) },
      });

      res.json({ message: 'Ficha eliminada exitosamente' });
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Ficha no encontrada' });
      }
      res.status(500).json({ error: error.message });
    }
  },
};

