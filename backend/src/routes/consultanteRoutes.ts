import express from 'express';
import { consultanteController } from '../controllers/consultanteController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Ruta: GET /api/consultantes
router.get('/', consultanteController.getAll);

// Ruta: GET /api/consultantes/:id
router.get('/:id', consultanteController.getById);

// Ruta: POST /api/consultantes
router.post('/', consultanteController.create);

// Ruta: PATCH /api/consultantes/:id
router.patch('/:id', consultanteController.update);

// Ruta: DELETE /api/consultantes/:id
router.delete('/:id', consultanteController.delete);

export default router;






