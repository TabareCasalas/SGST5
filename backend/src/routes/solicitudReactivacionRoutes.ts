import express from 'express';
import { solicitudReactivacionController } from '../controllers/solicitudReactivacionController';
import { authMiddleware } from '../middleware/authMiddleware';
import { adminMiddleware } from '../middleware/adminMiddleware';

const router = express.Router();

// Ruta pública: POST /api/solicitudes-reactivacion/solicitar
router.post('/solicitar', solicitudReactivacionController.solicitar);

// Rutas protegidas (requieren autenticación)
router.use(authMiddleware);

// Ruta: GET /api/solicitudes-reactivacion (Solo Administradores)
router.get('/', adminMiddleware, solicitudReactivacionController.getAll);

// Ruta: POST /api/solicitudes-reactivacion/:id/procesar (Solo Administradores)
router.post('/:id/procesar', adminMiddleware, solicitudReactivacionController.procesar);

export default router;

