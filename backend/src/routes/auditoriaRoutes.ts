import express from 'express';
import { auditoriaController } from '../controllers/auditoriaController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Ruta: GET /api/auditorias
router.get('/', auditoriaController.getAll);

// Ruta: GET /api/auditorias/stats
router.get('/stats', auditoriaController.getStats);

// Ruta: GET /api/auditorias/:tipo_entidad/:id_entidad
router.get('/:tipo_entidad/:id_entidad', auditoriaController.getByEntidad);

export default router;


