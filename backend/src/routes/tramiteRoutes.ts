import express from 'express';
import { tramiteController } from '../controllers/tramiteController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Ruta: GET /api/tramites
router.get('/', tramiteController.getAll);

// Ruta: GET /api/tramites/stats
router.get('/stats', tramiteController.getStats);

// Ruta: GET /api/tramites/:id
router.get('/:id', tramiteController.getById);

// Ruta: POST /api/tramites
router.post('/', tramiteController.create);

// Ruta: PATCH /api/tramites/:id
router.patch('/:id', tramiteController.update);

// Ruta: POST /api/tramites/:id/aprobar
router.post('/:id/aprobar', tramiteController.aprobarTramite);

// Ruta: POST /api/tramites/notificar
router.post('/notificar', tramiteController.notificar);

// Ruta: DELETE /api/tramites/:id
router.delete('/:id', tramiteController.delete);

export default router;





