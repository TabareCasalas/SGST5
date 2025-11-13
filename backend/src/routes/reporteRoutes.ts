import express from 'express';
import { reporteController } from '../controllers/reporteController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// ========== REPORTES DE TRÁMITES ==========
router.get('/tramites/por-estado', reporteController.tramitesPorEstado);
router.get('/tramites/tiempo-promedio', reporteController.tiempoPromedioResolucion);
router.get('/tramites/por-docente', reporteController.tramitesPorDocente);
router.get('/tramites/por-grupo', reporteController.tramitesPorGrupo);
router.get('/tramites/por-consultante', reporteController.tramitesPorConsultante);
router.get('/tramites/desistimientos', reporteController.analisisDesistimientos);
router.get('/tramites/antiguos', reporteController.tramitesAntiguos);

// ========== REPORTES DE FICHAS ==========
router.get('/fichas/por-estado', reporteController.fichasPorEstado);
router.get('/fichas/tiempos-procesamiento', reporteController.tiemposProcesamientoFichas);
router.get('/fichas/por-docente', reporteController.fichasPorDocente);

// ========== REPORTES DE GRUPOS ==========
router.get('/grupos/actividad', reporteController.actividadPorGrupo);

// ========== REPORTES DE ESTUDIANTES ==========
router.get('/estudiantes/activos', reporteController.estudiantesActivos);
router.get('/estudiantes/documentos', reporteController.documentosPorEstudiante);

// ========== MÉTRICAS DE RENDIMIENTO ==========
router.get('/metricas/dashboard', reporteController.dashboardMetricas);
router.get('/metricas/evolucion-temporal', reporteController.evolucionTemporal);
router.get('/metricas/actuaciones', reporteController.actuacionesHojaRuta);

export default router;


