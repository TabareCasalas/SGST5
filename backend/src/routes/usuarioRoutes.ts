import express from 'express';
import { usuarioController } from '../controllers/usuarioController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Ruta: GET /api/usuarios
router.get('/', usuarioController.getAll);

// Ruta: GET /api/usuarios/auditoria
router.get('/auditoria', usuarioController.getAuditoria);

// Ruta: GET /api/usuarios/:id
router.get('/:id', usuarioController.getById);

// Ruta: POST /api/usuarios
router.post('/', usuarioController.create);

// Ruta: PATCH /api/usuarios/:id
router.patch('/:id', usuarioController.update);

// Ruta: POST /api/usuarios/:id/activar
router.post('/:id/activar', usuarioController.activate);

// Ruta: POST /api/usuarios/:id/desactivar
router.post('/:id/desactivar', usuarioController.deactivate);

export default router;






