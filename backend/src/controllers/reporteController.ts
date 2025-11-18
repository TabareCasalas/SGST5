import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/authMiddleware';

interface FiltrosReporte {
  fecha_desde?: string;
  fecha_hasta?: string;
  id_grupo?: number;
  id_docente?: number;
  id_consultante?: number;
  id_estudiante?: number;
  estado?: string;
}

// Helper para calcular diferencia en días
const calcularDias = (fechaInicio: Date, fechaFin: Date | null): number | null => {
  if (!fechaFin) return null;
  const diff = fechaFin.getTime() - fechaInicio.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

// Helper para construir filtros de fecha
const construirFiltrosFecha = (filtros: FiltrosReporte) => {
  const where: any = {};
  if (filtros.fecha_desde || filtros.fecha_hasta) {
    where.created_at = {};
    if (filtros.fecha_desde) {
      where.created_at.gte = new Date(filtros.fecha_desde);
    }
    if (filtros.fecha_hasta) {
      where.created_at.lte = new Date(filtros.fecha_hasta);
    }
  }
  return where;
};

export const reporteController = {
  // ========== REPORTES DE TRÁMITES ==========

  // 1. Distribución de trámites por estado
  async tramitesPorEstado(req: AuthRequest, res: Response) {
    try {
      const filtros: FiltrosReporte = req.query;
      const where: any = {};

      if (filtros.fecha_desde || filtros.fecha_hasta) {
        where.fecha_inicio = {};
        if (filtros.fecha_desde) where.fecha_inicio.gte = new Date(filtros.fecha_desde);
        if (filtros.fecha_hasta) where.fecha_inicio.lte = new Date(filtros.fecha_hasta);
      }
      if (filtros.id_grupo) where.id_grupo = parseInt(filtros.id_grupo.toString());
      if (filtros.id_consultante) where.id_consultante = parseInt(filtros.id_consultante.toString());

      const tramites = await prisma.tramite.findMany({
        where,
        select: { estado: true },
      });

      const distribucion = tramites.reduce((acc: any, t) => {
        acc[t.estado] = (acc[t.estado] || 0) + 1;
        return acc;
      }, {});

      const total = tramites.length;
      const porcentajes: any = {};
      Object.keys(distribucion).forEach(estado => {
        porcentajes[estado] = total > 0 ? ((distribucion[estado] / total) * 100).toFixed(2) : 0;
      });

      res.json({
        distribucion,
        porcentajes,
        total,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // 2. Tiempo promedio de resolución
  async tiempoPromedioResolucion(req: AuthRequest, res: Response) {
    try {
      const filtros: FiltrosReporte = req.query;
      const where: any = {
        fecha_cierre: { not: null },
      };

      if (filtros.fecha_desde || filtros.fecha_hasta) {
        where.fecha_inicio = {};
        if (filtros.fecha_desde) where.fecha_inicio.gte = new Date(filtros.fecha_desde);
        if (filtros.fecha_hasta) where.fecha_inicio.lte = new Date(filtros.fecha_hasta);
      }
      if (filtros.id_grupo) where.id_grupo = parseInt(filtros.id_grupo.toString());
      if (filtros.estado) where.estado = filtros.estado;

      const tramites = await prisma.tramite.findMany({
        where,
        select: {
          fecha_inicio: true,
          fecha_cierre: true,
          estado: true,
        },
      });

      const tiempos = tramites
        .map(t => calcularDias(t.fecha_inicio, t.fecha_cierre))
        .filter((d): d is number => d !== null);

      const promedio = tiempos.length > 0
        ? tiempos.reduce((a, b) => a + b, 0) / tiempos.length
        : 0;

      const porEstado: any = {};
      ['finalizado', 'desistido'].forEach(estado => {
        const tramitesEstado = tramites.filter(t => t.estado === estado);
        const tiemposEstado = tramitesEstado
          .map(t => calcularDias(t.fecha_inicio, t.fecha_cierre))
          .filter((d): d is number => d !== null);
        if (tiemposEstado.length > 0) {
          porEstado[estado] = tiemposEstado.reduce((a, b) => a + b, 0) / tiemposEstado.length;
        }
      });

      res.json({
        promedio: Math.round(promedio * 100) / 100,
        total: tiempos.length,
        porEstado,
        min: tiempos.length > 0 ? Math.min(...tiempos) : 0,
        max: tiempos.length > 0 ? Math.max(...tiempos) : 0,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // 3. Trámites por docente responsable (vía grupo)
  async tramitesPorDocente(req: AuthRequest, res: Response) {
    try {
      const filtros: FiltrosReporte = req.query;
      const where: any = {};

      if (filtros.fecha_desde || filtros.fecha_hasta) {
        where.fecha_inicio = {};
        if (filtros.fecha_desde) where.fecha_inicio.gte = new Date(filtros.fecha_desde);
        if (filtros.fecha_hasta) where.fecha_inicio.lte = new Date(filtros.fecha_hasta);
      }
      if (filtros.id_grupo) where.id_grupo = parseInt(filtros.id_grupo.toString());

      const tramites = await prisma.tramite.findMany({
        where,
        include: {
          grupo: {
            include: {
              miembros_grupo: {
                where: { rol_en_grupo: 'responsable' },
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

      const porDocente: any = {};
      tramites.forEach(t => {
        const responsable = t.grupo.miembros_grupo.find(m => m.rol_en_grupo === 'responsable');
        if (responsable) {
          const docenteId = responsable.usuario.id_usuario;
          if (!porDocente[docenteId]) {
            porDocente[docenteId] = {
              docente: responsable.usuario,
              total: 0,
              porEstado: {},
              finalizados: 0,
              enTramite: 0,
              pendientes: 0,
              desistidos: 0,
            };
          }
          porDocente[docenteId].total++;
          porDocente[docenteId].porEstado[t.estado] = (porDocente[docenteId].porEstado[t.estado] || 0) + 1;
          if (t.estado === 'finalizado') porDocente[docenteId].finalizados++;
          if (t.estado === 'en_tramite') porDocente[docenteId].enTramite++;
          if (t.estado === 'pendiente') porDocente[docenteId].pendientes++;
          if (t.estado === 'desistido') porDocente[docenteId].desistidos++;
        }
      });

      // Calcular tasas de finalización
      Object.keys(porDocente).forEach(docenteId => {
        const datos = porDocente[docenteId];
        datos.tasaFinalizacion = datos.total > 0
          ? ((datos.finalizados / datos.total) * 100).toFixed(2)
          : 0;
      });

      res.json({
        porDocente: Object.values(porDocente),
        total: tramites.length,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // 4. Trámites por grupo
  async tramitesPorGrupo(req: AuthRequest, res: Response) {
    try {
      const filtros: FiltrosReporte = req.query;
      const where: any = {};

      if (filtros.fecha_desde || filtros.fecha_hasta) {
        where.fecha_inicio = {};
        if (filtros.fecha_desde) where.fecha_inicio.gte = new Date(filtros.fecha_desde);
        if (filtros.fecha_hasta) where.fecha_inicio.lte = new Date(filtros.fecha_hasta);
      }
      if (filtros.id_grupo) where.id_grupo = parseInt(filtros.id_grupo.toString());

      const tramites = await prisma.tramite.findMany({
        where,
        include: {
          grupo: {
            select: {
              id_grupo: true,
              nombre: true,
            },
          },
        },
      });

      const porGrupo: any = {};
      tramites.forEach(t => {
        const grupoId = t.grupo.id_grupo;
        if (!porGrupo[grupoId]) {
          porGrupo[grupoId] = {
            grupo: t.grupo,
            total: 0,
            porEstado: {},
            finalizados: 0,
            enTramite: 0,
            pendientes: 0,
            desistidos: 0,
          };
        }
        porGrupo[grupoId].total++;
        porGrupo[grupoId].porEstado[t.estado] = (porGrupo[grupoId].porEstado[t.estado] || 0) + 1;
        if (t.estado === 'finalizado') porGrupo[grupoId].finalizados++;
        if (t.estado === 'en_tramite') porGrupo[grupoId].enTramite++;
        if (t.estado === 'pendiente') porGrupo[grupoId].pendientes++;
        if (t.estado === 'desistido') porGrupo[grupoId].desistidos++;
      });

      // Calcular tasas
      Object.keys(porGrupo).forEach(grupoId => {
        const datos = porGrupo[grupoId];
        datos.tasaFinalizacion = datos.total > 0
          ? ((datos.finalizados / datos.total) * 100).toFixed(2)
          : 0;
      });

      res.json({
        porGrupo: Object.values(porGrupo),
        total: tramites.length,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // 5. Trámites por consultante
  async tramitesPorConsultante(req: AuthRequest, res: Response) {
    try {
      const filtros: FiltrosReporte = req.query;
      const where: any = {};

      if (filtros.fecha_desde || filtros.fecha_hasta) {
        where.fecha_inicio = {};
        if (filtros.fecha_desde) where.fecha_inicio.gte = new Date(filtros.fecha_desde);
        if (filtros.fecha_hasta) where.fecha_inicio.lte = new Date(filtros.fecha_hasta);
      }
      if (filtros.id_consultante) where.id_consultante = parseInt(filtros.id_consultante.toString());

      const tramites = await prisma.tramite.findMany({
        where,
        include: {
          consultante: {
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
      });

      const porConsultante: any = {};
      tramites.forEach(t => {
        const consultanteId = t.consultante.id_consultante;
        if (!porConsultante[consultanteId]) {
          porConsultante[consultanteId] = {
            consultante: t.consultante.usuario,
            total: 0,
            porEstado: {},
            pendientes: 0,
          };
        }
        porConsultante[consultanteId].total++;
        porConsultante[consultanteId].porEstado[t.estado] = (porConsultante[consultanteId].porEstado[t.estado] || 0) + 1;
        if (t.estado === 'pendiente') porConsultante[consultanteId].pendientes++;
      });

      res.json({
        porConsultante: Object.values(porConsultante),
        total: tramites.length,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // 6. Análisis de desistimientos
  async analisisDesistimientos(req: AuthRequest, res: Response) {
    try {
      const filtros: FiltrosReporte = req.query;
      const where: any = {};

      if (filtros.fecha_desde || filtros.fecha_hasta) {
        where.fecha_inicio = {};
        if (filtros.fecha_desde) where.fecha_inicio.gte = new Date(filtros.fecha_desde);
        if (filtros.fecha_hasta) where.fecha_inicio.lte = new Date(filtros.fecha_hasta);
      }

      const [todos, desistidos] = await Promise.all([
        prisma.tramite.findMany({ where, select: { id_tramite: true } }),
        prisma.tramite.findMany({
          where: { ...where, estado: 'desistido' },
          include: {
            consultante: {
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
        }),
      ]);

      const total = todos.length;
      const totalDesistidos = desistidos.length;
      const tasaDesistimiento = total > 0 ? ((totalDesistidos / total) * 100).toFixed(2) : '0';

      // Motivos más frecuentes
      const motivos: any = {};
      desistidos.forEach(t => {
        const motivo = t.motivo_cierre || 'Sin motivo especificado';
        motivos[motivo] = (motivos[motivo] || 0) + 1;
      });

      // Consultantes que desisten frecuentemente
      const porConsultante: any = {};
      desistidos.forEach(t => {
        const consultanteId = t.consultante.id_consultante;
        if (!porConsultante[consultanteId]) {
          porConsultante[consultanteId] = {
            consultante: t.consultante.usuario,
            cantidad: 0,
          };
        }
        porConsultante[consultanteId].cantidad++;
      });

      res.json({
        tasaDesistimiento: parseFloat(tasaDesistimiento),
        total,
        totalDesistidos,
        motivos,
        porConsultante: Object.values(porConsultante).sort((a: any, b: any) => b.cantidad - a.cantidad),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // 7. Trámites más antiguos (pendientes de resolución)
  async tramitesAntiguos(req: AuthRequest, res: Response) {
    try {
      const filtros: FiltrosReporte = req.query;
      const where: any = {
        estado: { in: ['en_tramite', 'pendiente'] },
      };

      if (filtros.id_grupo) where.id_grupo = parseInt(filtros.id_grupo.toString());

      const tramites = await prisma.tramite.findMany({
        where,
        include: {
          grupo: {
            select: {
              id_grupo: true,
              nombre: true,
            },
          },
          consultante: {
            include: {
              usuario: {
                select: {
                  nombre: true,
                  ci: true,
                },
              },
            },
          },
        },
        orderBy: {
          fecha_inicio: 'asc',
        },
        take: 50, // Top 50 más antiguos
      });

      const tramitesConDias = tramites.map(t => {
        const dias = calcularDias(t.fecha_inicio, new Date());
        return {
          ...t,
          diasPendiente: dias,
        };
      });

      res.json({
        tramites: tramitesConDias,
        total: tramites.length,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // ========== REPORTES DE FICHAS ==========

  // 8. Fichas por estado
  async fichasPorEstado(req: AuthRequest, res: Response) {
    try {
      const filtros: FiltrosReporte = req.query;
      const where: any = construirFiltrosFecha(filtros);

      if (filtros.id_docente) where.id_docente = parseInt(filtros.id_docente.toString());
      if (filtros.id_grupo) where.id_grupo = parseInt(filtros.id_grupo.toString());
      if (filtros.estado) where.estado = filtros.estado;

      const fichas = await prisma.ficha.findMany({
        where,
        select: { estado: true },
      });

      const distribucion = fichas.reduce((acc: any, f) => {
        acc[f.estado] = (acc[f.estado] || 0) + 1;
        return acc;
      }, {});

      const total = fichas.length;
      const porcentajes: any = {};
      Object.keys(distribucion).forEach(estado => {
        porcentajes[estado] = total > 0 ? ((distribucion[estado] / total) * 100).toFixed(2) : 0;
      });

      res.json({
        distribucion,
        porcentajes,
        total,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // 9. Tiempos de procesamiento de fichas
  async tiemposProcesamientoFichas(req: AuthRequest, res: Response) {
    try {
      const filtros: FiltrosReporte = req.query;
      const where: any = construirFiltrosFecha(filtros);

      if (filtros.id_docente) where.id_docente = parseInt(filtros.id_docente.toString());

      const fichas = await prisma.ficha.findMany({
        where,
        select: {
          created_at: true,
          updated_at: true,
          estado: true,
          id_grupo: true,
        },
        orderBy: { created_at: 'desc' },
      });

      // Fichas aprobadas (tienen fecha_cita)
      const aprobadas = fichas.filter(f => f.estado !== 'pendiente');
      const tiempoAprobacion = aprobadas.map(f => {
        // Buscar cuando cambió a aprobado (aproximado por updated_at)
        return calcularDias(f.created_at, f.updated_at);
      }).filter((d): d is number => d !== null);

      // Fichas asignadas
      const asignadas = fichas.filter(f => f.estado === 'asignada' || f.estado === 'iniciada');
      const tiempoAsignacion = asignadas.map(f => {
        return calcularDias(f.created_at, f.updated_at);
      }).filter((d): d is number => d !== null);

      // Fichas con trámite iniciado
      const iniciadas = fichas.filter(f => f.estado === 'iniciada');
      const tiempoInicio = iniciadas.map(f => {
        return calcularDias(f.created_at, f.updated_at);
      }).filter((d): d is number => d !== null);

      res.json({
        tiempoPromedioAprobacion: tiempoAprobacion.length > 0
          ? tiempoAprobacion.reduce((a, b) => a + b, 0) / tiempoAprobacion.length
          : 0,
        tiempoPromedioAsignacion: tiempoAsignacion.length > 0
          ? tiempoAsignacion.reduce((a, b) => a + b, 0) / tiempoAsignacion.length
          : 0,
        tiempoPromedioInicio: tiempoInicio.length > 0
          ? tiempoInicio.reduce((a, b) => a + b, 0) / tiempoInicio.length
          : 0,
        totalAprobadas: aprobadas.length,
        totalAsignadas: asignadas.length,
        totalIniciadas: iniciadas.length,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // 10. Fichas por docente
  async fichasPorDocente(req: AuthRequest, res: Response) {
    try {
      const filtros: FiltrosReporte = req.query;
      const where: any = construirFiltrosFecha(filtros);

      if (filtros.id_docente) where.id_docente = parseInt(filtros.id_docente.toString());

      const fichas = await prisma.ficha.findMany({
        where,
        include: {
          docente: {
            select: {
              id_usuario: true,
              nombre: true,
              ci: true,
            },
          },
        },
      });

      const porDocente: any = {};
      fichas.forEach(f => {
        const docenteId = f.docente.id_usuario;
        if (!porDocente[docenteId]) {
          porDocente[docenteId] = {
            docente: f.docente,
            total: 0,
            porEstado: {},
            asignadas: 0,
            iniciadas: 0,
          };
        }
        porDocente[docenteId].total++;
        porDocente[docenteId].porEstado[f.estado] = (porDocente[docenteId].porEstado[f.estado] || 0) + 1;
        if (f.estado === 'asignada' || f.estado === 'iniciada') porDocente[docenteId].asignadas++;
        if (f.estado === 'iniciada') porDocente[docenteId].iniciadas++;
      });

      // Calcular tasa de conversión
      Object.keys(porDocente).forEach(docenteId => {
        const datos = porDocente[docenteId];
        datos.tasaConversion = datos.total > 0
          ? ((datos.iniciadas / datos.total) * 100).toFixed(2)
          : '0';
      });

      res.json({
        porDocente: Object.values(porDocente),
        total: fichas.length,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // ========== REPORTES DE GRUPOS ==========

  // 11. Actividad por grupo
  async actividadPorGrupo(req: AuthRequest, res: Response) {
    try {
      const filtros: FiltrosReporte = req.query;
      const where: any = {};

      if (filtros.fecha_desde || filtros.fecha_hasta) {
        where.fecha_inicio = {};
        if (filtros.fecha_desde) where.fecha_inicio.gte = new Date(filtros.fecha_desde);
        if (filtros.fecha_hasta) where.fecha_inicio.lte = new Date(filtros.fecha_hasta);
      }
      if (filtros.id_grupo) where.id_grupo = parseInt(filtros.id_grupo.toString());

      const [tramites, fichas, grupos] = await Promise.all([
        prisma.tramite.findMany({
          where,
          include: {
            grupo: {
              select: {
                id_grupo: true,
                nombre: true,
              },
            },
          },
        }),
        prisma.ficha.findMany({
          where: filtros.id_grupo ? { id_grupo: parseInt(filtros.id_grupo.toString()) } : {},
          select: {
            id_grupo: true,
            estado: true,
          },
        }),
        prisma.grupo.findMany({
          where: filtros.id_grupo ? { id_grupo: parseInt(filtros.id_grupo.toString()) } : {},
          include: {
            miembros_grupo: {
              include: {
                usuario: {
                  select: {
                    id_usuario: true,
                    nombre: true,
                    rol: true,
                  },
                },
              },
            },
          },
        }),
      ]);

      const porGrupo: any = {};
      grupos.forEach(g => {
        porGrupo[g.id_grupo] = {
          grupo: {
            id_grupo: g.id_grupo,
            nombre: g.nombre,
          },
          miembros: {
            responsables: g.miembros_grupo.filter(m => m.rol_en_grupo === 'responsable').length,
            asistentes: g.miembros_grupo.filter(m => m.rol_en_grupo === 'asistente').length,
            estudiantes: g.miembros_grupo.filter(m => m.rol_en_grupo === 'estudiante').length,
            total: g.miembros_grupo.length,
          },
          tramites: {
            total: 0,
            activos: 0,
            finalizados: 0,
          },
          fichas: {
            total: 0,
            asignadas: 0,
            iniciadas: 0,
          },
        };
      });

      tramites.forEach(t => {
        const grupoId = t.grupo.id_grupo;
        if (porGrupo[grupoId]) {
          porGrupo[grupoId].tramites.total++;
          if (t.estado === 'en_tramite' || t.estado === 'pendiente') porGrupo[grupoId].tramites.activos++;
          if (t.estado === 'finalizado') porGrupo[grupoId].tramites.finalizados++;
        }
      });

      fichas.forEach(f => {
        if (f.id_grupo && porGrupo[f.id_grupo]) {
          porGrupo[f.id_grupo].fichas.total++;
          if (f.estado === 'asignada') porGrupo[f.id_grupo].fichas.asignadas++;
          if (f.estado === 'iniciada') porGrupo[f.id_grupo].fichas.iniciadas++;
        }
      });

      res.json({
        porGrupo: Object.values(porGrupo),
        total: grupos.length,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // ========== REPORTES DE ESTUDIANTES ==========

  // 12. Estudiantes más activos
  async estudiantesActivos(req: AuthRequest, res: Response) {
    try {
      const filtros: FiltrosReporte = req.query;
      const where: any = {};

      if (filtros.fecha_desde || filtros.fecha_hasta) {
        where.fecha_actuacion = {};
        if (filtros.fecha_desde) where.fecha_actuacion.gte = new Date(filtros.fecha_desde);
        if (filtros.fecha_hasta) where.fecha_actuacion.lte = new Date(filtros.fecha_hasta);
      }
      if (filtros.id_estudiante) where.id_usuario = parseInt(filtros.id_estudiante.toString());

      const actuaciones = await prisma.hojaRuta.findMany({
        where,
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

      const porEstudiante: any = {};
      actuaciones.forEach(a => {
        const estudianteId = a.usuario.id_usuario;
        if (!porEstudiante[estudianteId]) {
          porEstudiante[estudianteId] = {
            estudiante: a.usuario,
            actuaciones: 0,
          };
        }
        porEstudiante[estudianteId].actuaciones++;
      });

      const estudiantesOrdenados = Object.values(porEstudiante)
        .sort((a: any, b: any) => b.actuaciones - a.actuaciones)
        .slice(0, 50); // Top 50

      res.json({
        estudiantes: estudiantesOrdenados,
        total: actuaciones.length,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // 13. Documentos por estudiante
  async documentosPorEstudiante(req: AuthRequest, res: Response) {
    try {
      const filtros: FiltrosReporte = req.query;
      const where: any = construirFiltrosFecha(filtros);

      if (filtros.id_estudiante) where.id_usuario = parseInt(filtros.id_estudiante.toString());

      const documentos = await prisma.documentoAdjunto.findMany({
        where,
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

      const porEstudiante: any = {};
      let tamanoTotal = 0;
      const porTipo: any = {};

      documentos.forEach(d => {
        const estudianteId = d.usuario.id_usuario;
        if (!porEstudiante[estudianteId]) {
          porEstudiante[estudianteId] = {
            estudiante: d.usuario,
            documentos: 0,
            tamanoTotal: 0,
          };
        }
        porEstudiante[estudianteId].documentos++;
        porEstudiante[estudianteId].tamanoTotal += d.tamano;
        tamanoTotal += d.tamano;

        const tipo = d.tipo_mime.split('/')[0]; // 'application', 'image', etc.
        porTipo[tipo] = (porTipo[tipo] || 0) + 1;
      });

      res.json({
        porEstudiante: Object.values(porEstudiante),
        totalDocumentos: documentos.length,
        tamanoTotal,
        porTipo,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // ========== MÉTRICAS DE RENDIMIENTO ==========

  // 14. Dashboard de métricas generales
  async dashboardMetricas(req: AuthRequest, res: Response) {
    try {
      const filtros: FiltrosReporte = req.query;
      const fechaWhere: any = {};

      if (filtros.fecha_desde || filtros.fecha_hasta) {
        fechaWhere.fecha_inicio = {};
        if (filtros.fecha_desde) fechaWhere.fecha_inicio.gte = new Date(filtros.fecha_desde);
        if (filtros.fecha_hasta) fechaWhere.fecha_inicio.lte = new Date(filtros.fecha_hasta);
      }

      const [
        tramites,
        tramitesFinalizados,
        tramitesDesistidos,
        fichas,
        fichasIniciadas,
        grupos,
        estudiantes,
        docentes,
      ] = await Promise.all([
        prisma.tramite.count({ where: fechaWhere }),
        prisma.tramite.count({ where: { ...fechaWhere, estado: 'finalizado' } }),
        prisma.tramite.count({ where: { ...fechaWhere, estado: 'desistido' } }),
        prisma.ficha.count({ where: construirFiltrosFecha(filtros) }),
        prisma.ficha.count({ where: { ...construirFiltrosFecha(filtros), estado: 'iniciada' } }),
        prisma.grupo.count({ where: { activo: true } }),
        prisma.usuario.count({ where: { rol: 'estudiante', activo: true } }),
        prisma.usuario.count({ where: { rol: 'docente', activo: true } }),
      ]);

      const tasaExito = (tramitesFinalizados + tramitesDesistidos) > 0
        ? ((tramitesFinalizados / (tramitesFinalizados + tramitesDesistidos)) * 100).toFixed(2)
        : '0';

      const tasaConversion = fichas > 0
        ? ((fichasIniciadas / fichas) * 100).toFixed(2)
        : '0';

      // Tiempo promedio de resolución
      const tramitesConFecha = await prisma.tramite.findMany({
        where: {
          ...fechaWhere,
          fecha_cierre: { not: null },
        },
        select: {
          fecha_inicio: true,
          fecha_cierre: true,
        },
      });

      const tiempos = tramitesConFecha
        .map(t => calcularDias(t.fecha_inicio, t.fecha_cierre))
        .filter((d): d is number => d !== null);

      const tiempoPromedio = tiempos.length > 0
        ? tiempos.reduce((a, b) => a + b, 0) / tiempos.length
        : 0;

      res.json({
        tramites: {
          total: tramites,
          finalizados: tramitesFinalizados,
          desistidos: tramitesDesistidos,
          activos: tramites - tramitesFinalizados - tramitesDesistidos,
        },
        fichas: {
          total: fichas,
          iniciadas: fichasIniciadas,
        },
        recursos: {
          grupos: grupos,
          estudiantes: estudiantes,
          docentes: docentes,
        },
        metricas: {
          tasaExito: parseFloat(tasaExito),
          tasaConversion: parseFloat(tasaConversion),
          tiempoPromedioResolucion: Math.round(tiempoPromedio * 100) / 100,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // 15. Evolución temporal de trámites
  async evolucionTemporal(req: AuthRequest, res: Response) {
    try {
      const filtros: FiltrosReporte = req.query;
      const where: any = {};

      if (filtros.fecha_desde || filtros.fecha_hasta) {
        where.fecha_inicio = {};
        if (filtros.fecha_desde) where.fecha_inicio.gte = new Date(filtros.fecha_desde);
        if (filtros.fecha_hasta) where.fecha_inicio.lte = new Date(filtros.fecha_hasta);
      }

      const tramites = await prisma.tramite.findMany({
        where,
        select: {
          fecha_inicio: true,
          estado: true,
        },
      });

      const porMes: any = {};
      tramites.forEach(t => {
        const fecha = new Date(t.fecha_inicio);
        const mes = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
        if (!porMes[mes]) {
          porMes[mes] = {
            mes,
            total: 0,
            porEstado: {},
          };
        }
        porMes[mes].total++;
        porMes[mes].porEstado[t.estado] = (porMes[mes].porEstado[t.estado] || 0) + 1;
      });

      res.json({
        porMes: Object.values(porMes).sort((a: any, b: any) => a.mes.localeCompare(b.mes)),
        total: tramites.length,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // 16. Actuaciones en hoja de ruta
  async actuacionesHojaRuta(req: AuthRequest, res: Response) {
    try {
      const filtros: FiltrosReporte = req.query;
      const where: any = {};

      if (filtros.fecha_desde || filtros.fecha_hasta) {
        where.fecha_actuacion = {};
        if (filtros.fecha_desde) where.fecha_actuacion.gte = new Date(filtros.fecha_desde);
        if (filtros.fecha_hasta) where.fecha_actuacion.lte = new Date(filtros.fecha_hasta);
      }

      const actuaciones = await prisma.hojaRuta.findMany({
        where,
        include: {
          tramite: {
            select: {
              id_tramite: true,
              num_carpeta: true,
            },
          },
          usuario: {
            select: {
              id_usuario: true,
              nombre: true,
            },
          },
        },
      });

      const porTramite: any = {};
      actuaciones.forEach(a => {
        const tramiteId = a.tramite.id_tramite;
        if (!porTramite[tramiteId]) {
          porTramite[tramiteId] = {
            tramite: a.tramite,
            actuaciones: 0,
          };
        }
        porTramite[tramiteId].actuaciones++;
      });

      res.json({
        total: actuaciones.length,
        porTramite: Object.values(porTramite),
        promedioPorTramite: actuaciones.length > 0
          ? (actuaciones.length / Object.keys(porTramite).length).toFixed(2)
          : 0,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
};

