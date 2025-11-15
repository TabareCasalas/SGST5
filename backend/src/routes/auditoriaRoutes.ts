import express from 'express';
import { auditoriaController } from '../controllers/auditoriaController';
import { authMiddleware } from '../middleware/authMiddleware';
import { adminSistemaMiddleware } from '../middleware/adminSistemaMiddleware';

const router = express.Router();

// Todas las rutas requieren autenticación y ser administrador del sistema (nivel 3)
router.use(authMiddleware);
router.use(adminSistemaMiddleware);

// Ruta: GET /api/auditorias
router.get('/', auditoriaController.getAll);

// Ruta: GET /api/auditorias/stats
router.get('/stats', auditoriaController.getStats);

// Ruta: GET /api/auditorias/:tipo_entidad/:id_entidad
router.get('/:tipo_entidad/:id_entidad', auditoriaController.getByEntidad);

export default router;


