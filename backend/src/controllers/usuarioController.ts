import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';
import { AuthRequest } from '../middleware/authMiddleware';
import { AuditoriaService } from '../utils/auditoriaService';
import { EmailService } from '../utils/emailService';
import { generarPasswordAleatoria } from '../utils/passwordGenerator';
import { validateCI, cleanCI } from '../utils/ciValidator';
import * as XLSX from 'xlsx';

const SALT_ROUNDS = 10;

export const usuarioController = {
  async getAll(req: AuthRequest, res: Response) {
    try {
      const { rol, activo, search } = req.query;
      
      const where: any = {};
      
      if (rol) where.rol = rol;
      if (activo !== undefined) where.activo = activo === 'true';
      if (search) {
        where.OR = [
          { nombre: { contains: search as string, mode: 'insensitive' } },
          { ci: { contains: search as string, mode: 'insensitive' } },
          { correo: { contains: search as string, mode: 'insensitive' } },
        ];
      }

      const usuarios = await prisma.usuario.findMany({
        where,
        include: {
          consultantes: {
            include: {
              tramites: {
                take: 5,
                orderBy: { fecha_inicio: 'desc' },
              },
            },
          },
          grupos_participa: {
            include: {
              grupo: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
      });

      // Registrar auditoría
      const userId = req.user?.id;
      if (userId) {
        const filtros: string[] = [];
        if (rol) filtros.push(`rol: ${rol}`);
        if (activo !== undefined) filtros.push(`activo: ${activo}`);
        if (search) filtros.push(`búsqueda: ${search}`);
        
        await AuditoriaService.crearDesdeRequest(req, {
          id_usuario: userId,
          tipo_entidad: 'usuario',
          id_entidad: undefined,
          accion: 'listar',
          detalles: `Listado de usuarios consultado${filtros.length > 0 ? `. Filtros: ${filtros.join(', ')}` : ''}`,
        });
      }

      res.json(usuarios);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async getById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const usuario = await prisma.usuario.findUnique({
        where: { id_usuario: parseInt(id) },
        include: {
          consultantes: {
            include: {
              tramites: {
                include: {
                  grupo: true,
                },
                orderBy: { fecha_inicio: 'desc' },
              },
            },
          },
          grupos_participa: {
            include: {
              grupo: true,
            },
          },
          auditorias: {
            take: 10,
            orderBy: { created_at: 'desc' },
          },
        },
      });

      if (!usuario) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // Registrar auditoría
      const userId = req.user?.id;
      if (userId) {
        await AuditoriaService.crearDesdeRequest(req, {
          id_usuario: userId,
          tipo_entidad: 'usuario',
          id_entidad: usuario.id_usuario,
          accion: 'consultar',
          detalles: `Usuario consultado: ${usuario.nombre} (${usuario.rol})`,
        });
      }

      res.json(usuario);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const { nombre, ci, domicilio, telefono, correo, rol, semestre, id_grupo, nivel_acceso, fecha_desactivacion_automatica } = req.body;

      if (!nombre || !ci || !domicilio || !telefono || !correo) {
        return res.status(400).json({ error: 'Todos los campos básicos son requeridos' });
      }

      // Validar cédula de identidad
      const ciLimpia = cleanCI(ci);
      if (!validateCI(ciLimpia)) {
        return res.status(400).json({ error: 'La cédula de identidad no es válida. El dígito verificador es incorrecto.' });
      }

      // Generar contraseña aleatoria
      const passwordTemporal = generarPasswordAleatoria(12);

      // Validate role - using the new unified roles
      const validRoles = [
        'estudiante', 
        'docente', 
        'consultante', 
        'administrador'
      ];
      if (rol && !validRoles.includes(rol)) {
        return res.status(400).json({ error: 'Rol inválido' });
      }

      // If role is administrador, validate nivel_acceso
      if (rol === 'administrador') {
        if (!nivel_acceso || ![1, 3].includes(parseInt(nivel_acceso))) {
          return res.status(400).json({ error: 'nivel_acceso es requerido para administradores y debe ser 1 (Administrativo) o 3 (Sistema)' });
        }
      }

      // If role is estudiante, validate semester
      if (rol === 'estudiante' && !semestre) {
        return res.status(400).json({ error: 'El semestre es requerido para estudiantes' });
      }

      // Calcular fecha de desactivación automática por defecto (4 meses después) si es estudiante
      let fechaDesactivacion: Date | null = null;
      if (rol === 'estudiante') {
        if (fecha_desactivacion_automatica) {
          fechaDesactivacion = new Date(fecha_desactivacion_automatica);
        } else {
          // Por defecto: 4 meses después
          const fechaDefault = new Date();
          fechaDefault.setMonth(fechaDefault.getMonth() + 4);
          fechaDesactivacion = fechaDefault;
        }
      }

      // Hashear la contraseña temporal
      const hashedPassword = await bcrypt.hash(passwordTemporal, SALT_ROUNDS);

      const usuario = await prisma.usuario.create({
        data: {
          nombre,
          ci,
          domicilio,
          telefono,
          correo,
          password: hashedPassword,
          rol: rol || 'estudiante',
          nivel_acceso: rol === 'administrador' ? parseInt(nivel_acceso) : null,
          semestre: semestre || null,
          fecha_desactivacion_automatica: fechaDesactivacion,
          debe_cambiar_password: true, // El usuario debe cambiar la contraseña en el primer login
          activo: true,
        },
        include: {
          grupos_participa: {
            include: {
              grupo: true,
            },
          },
        },
      });

      // If id_grupo is provided (for estudiantes), add them to the group
      if (id_grupo && rol === 'estudiante') {
        await prisma.usuarioGrupo.create({
          data: {
            id_usuario: usuario.id_usuario,
            id_grupo: parseInt(id_grupo),
            rol_en_grupo: 'estudiante',
          },
        });
      }

      // Enviar correo con credenciales
      try {
        await EmailService.enviarCredenciales(
          correo,
          nombre,
          ci,
          passwordTemporal
        );
      } catch (emailError) {
        console.error('Error al enviar correo (continuando con creación):', emailError);
        // No fallar la creación si el correo falla, las credenciales se loguean en consola
      }

      // Log audit
      const userId = (req as any).user?.id;
      if (userId) {
        await AuditoriaService.crearDesdeRequest(req, {
          id_usuario: userId,
          tipo_entidad: 'usuario',
          id_entidad: usuario.id_usuario,
          accion: 'crear',
          detalles: `Usuario creado: ${usuario.nombre} (${usuario.rol})`,
        });
      }

      // No devolver la contraseña en la respuesta
      const { password: _, ...usuarioSinPassword } = usuario;
      res.status(201).json(usuarioSinPassword);
    } catch (error: any) {
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'Ya existe un usuario con ese CI o correo' });
      }
      res.status(500).json({ error: error.message });
    }
  },

  async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { nombre, ci, domicilio, telefono, correo, correos_adicionales, rol, semestre, nivel_acceso, fecha_desactivacion_automatica } = req.body;

      // Get current user to compare changes
      const currentUser = await prisma.usuario.findUnique({
        where: { id_usuario: parseInt(id) },
      });

      if (!currentUser) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // Validate role - using the new unified roles
      const validRoles = [
        'estudiante', 
        'docente', 
        'consultante', 
        'administrador'
      ];
      if (rol && !validRoles.includes(rol)) {
        return res.status(400).json({ error: 'Rol inválido' });
      }

      // If role is administrador, validate nivel_acceso
      if (rol === 'administrador') {
        if (nivel_acceso !== undefined && nivel_acceso !== null && ![1, 3].includes(parseInt(nivel_acceso))) {
          return res.status(400).json({ error: 'nivel_acceso debe ser 1 (Administrativo) o 3 (Sistema) para administradores' });
        }
      }

      // Validar cédula de identidad si se está actualizando
      let ciLimpia = currentUser.ci;
      if (ci && ci !== currentUser.ci) {
        ciLimpia = cleanCI(ci);
        if (!validateCI(ciLimpia)) {
          return res.status(400).json({ error: 'La cédula de identidad no es válida. El dígito verificador es incorrecto.' });
        }
      }

      // Track changes for audit
      const changes: string[] = [];
      if (nombre && nombre !== currentUser.nombre) changes.push(`nombre: ${currentUser.nombre} → ${nombre}`);
      if (ci && ci !== currentUser.ci) changes.push(`ci: ${currentUser.ci} → ${ciLimpia}`);
      if (domicilio && domicilio !== currentUser.domicilio) changes.push(`domicilio: ${currentUser.domicilio} → ${domicilio}`);
      if (telefono && telefono !== currentUser.telefono) changes.push(`telefono: ${currentUser.telefono} → ${telefono}`);
      if (correo && correo !== currentUser.correo) changes.push(`correo: ${currentUser.correo} → ${correo}`);
      if (rol && rol !== currentUser.rol) changes.push(`rol: ${currentUser.rol} → ${rol}`);
      if (semestre && semestre !== currentUser.semestre) changes.push(`semestre: ${currentUser.semestre} → ${semestre}`);
      if (nivel_acceso !== undefined && nivel_acceso !== null && parseInt(nivel_acceso) !== currentUser.nivel_acceso) {
        changes.push(`nivel_acceso: ${currentUser.nivel_acceso || 'null'} → ${nivel_acceso}`);
      }
      if (fecha_desactivacion_automatica !== undefined) {
        const fechaActual = currentUser.fecha_desactivacion_automatica 
          ? new Date(currentUser.fecha_desactivacion_automatica).toISOString().split('T')[0]
          : null;
        const fechaNueva = fecha_desactivacion_automatica 
          ? (typeof fecha_desactivacion_automatica === 'string' && fecha_desactivacion_automatica.includes('T')
              ? fecha_desactivacion_automatica.split('T')[0]
              : fecha_desactivacion_automatica)
          : null;
        if (fechaActual !== fechaNueva) {
          changes.push(`fecha_desactivacion_automatica: ${fechaActual || 'null'} → ${fechaNueva || 'null'}`);
        }
      }

      const updateData: any = {};
      if (nombre !== undefined) updateData.nombre = nombre;
      if (ci !== undefined) updateData.ci = ciLimpia; // Usar la CI limpia y validada
      if (domicilio !== undefined) updateData.domicilio = domicilio;
      if (telefono !== undefined) updateData.telefono = telefono;
      if (correo !== undefined) updateData.correo = correo;
      if (rol !== undefined) updateData.rol = rol;
      if (semestre !== undefined) updateData.semestre = semestre;
      
      // Manejar nivel_acceso
      if (rol === 'administrador' && nivel_acceso !== undefined && nivel_acceso !== null) {
        updateData.nivel_acceso = parseInt(nivel_acceso);
      } else if (rol === 'administrador' && nivel_acceso === undefined) {
        // Mantener el nivel_acceso actual si no se proporciona
        updateData.nivel_acceso = currentUser.nivel_acceso;
      } else if (rol !== 'administrador') {
        updateData.nivel_acceso = null;
      }
      
      // Manejar fecha_desactivacion_automatica
      if (fecha_desactivacion_automatica !== undefined) {
        if (fecha_desactivacion_automatica === null || fecha_desactivacion_automatica === '') {
          updateData.fecha_desactivacion_automatica = null;
        } else {
          updateData.fecha_desactivacion_automatica = new Date(fecha_desactivacion_automatica);
        }
      }

      const usuario = await prisma.usuario.update({
        where: { id_usuario: parseInt(id) },
        data: updateData,
        include: {
          grupos_participa: {
            include: {
              grupo: true,
            },
          },
        },
      });

      // Log audit
      const userId = req.user?.id;
      if (userId) {
        await AuditoriaService.crearDesdeRequest(req, {
          id_usuario: userId,
          tipo_entidad: 'usuario',
          id_entidad: usuario.id_usuario,
          accion: 'modificar',
          detalles: `Cambios: ${changes.join(', ')}`,
        });
      }

      res.json(usuario);
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'Ya existe un usuario con ese CI o correo' });
      }
      res.status(500).json({ error: error.message });
    }
  },

  async deactivate(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const usuario = await prisma.usuario.findUnique({
        where: { id_usuario: parseInt(id) },
      });

      if (!usuario) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // No permitir que un administrador se desactive a sí mismo
      if (userId && parseInt(id) === userId) {
        return res.status(400).json({
          error: 'No puede desactivar su propia cuenta',
        });
      }

      // Permitir desactivar usuarios incluso si tienen trámites o fichas activas

      // Si el usuario tiene una solicitud de reactivación aprobada, eliminarla
      // para permitir que pueda crear una nueva solicitud si se reactiva nuevamente
      const solicitudAprobada = await prisma.solicitudReactivacion.findUnique({
        where: { id_usuario: parseInt(id) },
      });

      if (solicitudAprobada && solicitudAprobada.estado === 'aprobada') {
        await prisma.solicitudReactivacion.delete({
          where: { id_solicitud: solicitudAprobada.id_solicitud },
        });
      }

      const usuarioDesactivado = await prisma.usuario.update({
        where: { id_usuario: parseInt(id) },
        data: {
          activo: false,
        },
        include: {
          grupos_participa: {
            include: {
              grupo: true,
            },
          },
        },
      });

      // Log audit
      if (userId) {
        await AuditoriaService.crearDesdeRequest(req, {
          id_usuario: userId,
          tipo_entidad: 'usuario',
          id_entidad: usuario.id_usuario,
          accion: 'desactivar',
          detalles: `Usuario desactivado: ${usuario.nombre}`,
        });
      }

      res.json(usuarioDesactivado);
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      res.status(500).json({ error: error.message });
    }
  },

  async activate(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const usuario = await prisma.usuario.update({
        where: { id_usuario: parseInt(id) },
        data: {
          activo: true,
        },
        include: {
          grupos_participa: {
            include: {
              grupo: true,
            },
          },
        },
      });

      // Log audit
      if (userId) {
        await AuditoriaService.crearDesdeRequest(req, {
          id_usuario: userId,
          tipo_entidad: 'usuario',
          id_entidad: usuario.id_usuario,
          accion: 'activar',
          detalles: `Usuario activado: ${usuario.nombre}`,
        });
      }

      res.json(usuario);
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      res.status(500).json({ error: error.message });
    }
  },

  async getAuditoria(req: Request, res: Response) {
    try {
      const { tipo_entidad, id_entidad, accion } = req.query;

      const where: any = {};
      if (tipo_entidad) where.tipo_entidad = tipo_entidad;
      if (id_entidad) where.id_entidad = parseInt(id_entidad as string);
      if (accion) where.accion = accion;

      const auditorias = await prisma.auditoria.findMany({
        where,
        include: {
          usuario: true,
        },
        orderBy: { created_at: 'desc' },
        take: 100,
      });

      res.json(auditorias);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async importarDesdeExcel(req: AuthRequest & { file?: any }, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No se proporcionó ningún archivo' });
      }

      // Leer el archivo Excel
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];

      if (jsonData.length < 2) {
        return res.status(400).json({ error: 'El archivo Excel debe tener al menos una fila de datos (además de los encabezados)' });
      }

      // Obtener encabezados (primera fila)
      const headers = jsonData[0].map((h: any) => String(h).toLowerCase().trim());
      
      // Validar encabezados requeridos
      const requiredHeaders = ['nombre', 'ci', 'domicilio', 'telefono', 'correo', 'rol'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      
      if (missingHeaders.length > 0) {
        return res.status(400).json({ 
          error: `Faltan columnas requeridas: ${missingHeaders.join(', ')}` 
        });
      }

      // Mapear índices de columnas
      const columnIndexes: { [key: string]: number } = {};
      headers.forEach((header, index) => {
        columnIndexes[header] = index;
      });

      const resultados = {
        success: 0,
        errors: [] as Array<{ row: number; error: string }>,
        total: jsonData.length - 1,
      };

      // Procesar cada fila (empezando desde la fila 2, índice 1)
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        const rowNumber = i + 1; // Número de fila en Excel (1-indexed)

        try {
          // Extraer datos de la fila
          const nombre = String(row[columnIndexes['nombre']] || '').trim();
          const ci = String(row[columnIndexes['ci']] || '').trim();
          const domicilio = String(row[columnIndexes['domicilio']] || '').trim();
          const telefono = String(row[columnIndexes['telefono']] || '').trim();
          const correo = String(row[columnIndexes['correo']] || '').trim();
          const rol = String(row[columnIndexes['rol']] || '').trim().toLowerCase();
          const nivel_acceso = row[columnIndexes['nivel_acceso']] 
            ? parseInt(String(row[columnIndexes['nivel_acceso']]).trim()) 
            : null;
          const semestre = row[columnIndexes['semestre']] 
            ? String(row[columnIndexes['semestre']]).trim() 
            : null;
          const id_grupo = row[columnIndexes['id_grupo']] 
            ? parseInt(String(row[columnIndexes['id_grupo']]).trim()) 
            : null;

          // Validaciones
          if (!nombre) {
            resultados.errors.push({ row: rowNumber, error: 'El nombre es obligatorio' });
            continue;
          }
          if (!ci) {
            resultados.errors.push({ row: rowNumber, error: 'El CI es obligatorio' });
            continue;
          }

          // Validar cédula de identidad
          const ciLimpia = cleanCI(ci);
          if (!validateCI(ciLimpia)) {
            resultados.errors.push({ 
              row: rowNumber, 
              error: 'La cédula de identidad no es válida. El dígito verificador es incorrecto.' 
            });
            continue;
          }

          if (!domicilio) {
            resultados.errors.push({ row: rowNumber, error: 'El domicilio es obligatorio' });
            continue;
          }
          if (!telefono) {
            resultados.errors.push({ row: rowNumber, error: 'El teléfono es obligatorio' });
            continue;
          }
          if (!correo) {
            resultados.errors.push({ row: rowNumber, error: 'El correo es obligatorio' });
            continue;
          }
          if (!rol) {
            resultados.errors.push({ row: rowNumber, error: 'El rol es obligatorio' });
            continue;
          }

          // Validar rol
          const validRoles = ['estudiante', 'docente', 'consultante', 'administrador'];
          if (!validRoles.includes(rol)) {
            resultados.errors.push({ 
              row: rowNumber, 
              error: `Rol inválido: ${rol}. Debe ser: ${validRoles.join(', ')}` 
            });
            continue;
          }

          // Validar nivel_acceso para administradores
          if (rol === 'administrador') {
            if (nivel_acceso === null || nivel_acceso === undefined) {
              resultados.errors.push({ 
                row: rowNumber, 
                error: 'El nivel_acceso es obligatorio para administradores (debe ser 1 o 3)' 
              });
              continue;
            }
            if (![1, 3].includes(nivel_acceso)) {
              resultados.errors.push({ 
                row: rowNumber, 
                error: 'El nivel_acceso para administradores debe ser 1 (Administrativo) o 3 (Sistema)' 
              });
              continue;
            }
          }

          // Validar semestre para estudiantes
          if (rol === 'estudiante' && !semestre) {
            resultados.errors.push({ 
              row: rowNumber, 
              error: 'El semestre es obligatorio para estudiantes' 
            });
            continue;
          }

          // Verificar si el usuario ya existe (usar CI limpia)
          const usuarioExistente = await prisma.usuario.findFirst({
            where: {
              OR: [
                { ci: ciLimpia },
                { correo },
              ],
            },
          });

          if (usuarioExistente) {
            resultados.errors.push({ 
              row: rowNumber, 
              error: `Usuario ya existe (CI: ${ciLimpia} o correo: ${correo})` 
            });
            continue;
          }

          // Generar contraseña aleatoria
          const passwordTemporal = generarPasswordAleatoria(12);
          const hashedPassword = await bcrypt.hash(passwordTemporal, SALT_ROUNDS);

          // Crear usuario
          const usuario = await prisma.usuario.create({
            data: {
              nombre,
              ci: ciLimpia, // Usar la CI limpia y validada
              domicilio,
              telefono,
              correo,
              password: hashedPassword,
              rol,
              nivel_acceso: rol === 'administrador' ? nivel_acceso : null,
              semestre: rol === 'estudiante' ? semestre : null,
              debe_cambiar_password: true, // El usuario debe cambiar la contraseña en el primer login
              activo: true,
            },
          });

          // Enviar correo con credenciales
          try {
            await EmailService.enviarCredenciales(
              correo,
              nombre,
              ciLimpia, // Usar la CI limpia en el correo
              passwordTemporal
            );
          } catch (emailError) {
            console.error(`Error al enviar correo para ${correo} (continuando):`, emailError);
            // No fallar la creación si el correo falla
          }

          // Si es estudiante y tiene id_grupo, agregarlo al grupo
          if (rol === 'estudiante' && id_grupo) {
            // Verificar que el grupo existe
            const grupo = await prisma.grupo.findUnique({
              where: { id_grupo },
            });

            if (grupo) {
              await prisma.usuarioGrupo.create({
                data: {
                  id_usuario: usuario.id_usuario,
                  id_grupo,
                  rol_en_grupo: 'estudiante',
                },
              });
            }
          }

          // Registrar auditoría
          const userId = req.user?.id;
          if (userId) {
            await AuditoriaService.crearDesdeRequest(req, {
              id_usuario: userId,
              tipo_entidad: 'usuario',
              id_entidad: usuario.id_usuario,
              accion: 'crear',
              detalles: `Usuario creado desde importación Excel: ${usuario.nombre} (${usuario.rol})`,
            });
          }

          resultados.success++;
        } catch (error: any) {
          resultados.errors.push({ 
            row: rowNumber, 
            error: error.message || 'Error al procesar esta fila' 
          });
        }
      }

      res.json(resultados);
    } catch (error: any) {
      console.error('Error al importar usuarios desde Excel:', error);
      res.status(500).json({ error: error.message || 'Error al procesar el archivo Excel' });
    }
  },

  async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      // Verificar que el usuario existe
      const usuario = await prisma.usuario.findUnique({
        where: { id_usuario: parseInt(id) },
        include: {
          grupos_participa: {
            include: {
              grupo: {
                include: {
                  tramites: true,
                },
              },
            },
          },
          fichas_asignadas: true,
        },
      });

      if (!usuario) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // No permitir auto-eliminación
      if (userId && parseInt(id) === userId) {
        return res.status(400).json({ 
          error: 'No se puede eliminar su propia cuenta' 
        });
      }

      // Verificar si el usuario tiene fichas asignadas
      if (usuario.fichas_asignadas && usuario.fichas_asignadas.length > 0) {
        return res.status(400).json({ 
          error: `No se puede eliminar el usuario. Tiene ${usuario.fichas_asignadas.length} ficha(s) asignada(s).` 
        });
      }

      // Verificar si el usuario es responsable de grupos con trámites
      const gruposConTramites = usuario.grupos_participa?.filter(
        ug => ug.rol_en_grupo === 'responsable' && ug.grupo.tramites && ug.grupo.tramites.length > 0
      ) || [];
      
      if (gruposConTramites.length > 0) {
        return res.status(400).json({ 
          error: `No se puede eliminar el usuario. Es responsable de ${gruposConTramites.length} grupo(s) con trámites asociados.` 
        });
      }

      // Eliminar solicitudes de reactivación asociadas
      await prisma.solicitudReactivacion.deleteMany({
        where: { id_usuario: parseInt(id) },
      });

      // Eliminar relaciones con grupos
      await prisma.usuarioGrupo.deleteMany({
        where: { id_usuario: parseInt(id) },
      });

      // Eliminar el usuario
      await prisma.usuario.delete({
        where: { id_usuario: parseInt(id) },
      });

      // Registrar auditoría
      if (userId) {
        await AuditoriaService.crearDesdeRequest(req, {
          id_usuario: userId,
          tipo_entidad: 'usuario',
          id_entidad: parseInt(id),
          accion: 'eliminar',
          detalles: `Usuario eliminado: ${usuario.nombre} (CI: ${usuario.ci})`,
        });
      }

      res.json({ message: 'Usuario eliminado exitosamente' });
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      // Si hay error de foreign key, significa que hay relaciones que impiden la eliminación
      if (error.code === 'P2003') {
        return res.status(400).json({ 
          error: 'No se puede eliminar el usuario porque tiene relaciones activas (trámites, fichas, grupos, etc.)' 
        });
      }
      res.status(500).json({ error: error.message });
    }
  },
};
