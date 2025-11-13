import express from 'express';
import { fichaController } from '../controllers/fichaController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Ruta: GET /api/fichas
router.get('/', fichaController.getAll);

// Ruta: GET /api/fichas/standby
router.get('/standby', fichaController.getStandby);

// Ruta: GET /api/fichas/:id
router.get('/:id', fichaController.getById);

// Ruta: POST /api/fichas
router.post('/', fichaController.create);

// Ruta: POST /api/fichas/:id/asignar-grupo
router.post('/:id/asignar-grupo', fichaController.asignarAGrupo);

// Ruta: POST /api/fichas/:id/aprobar
router.post('/:id/aprobar', fichaController.aprobarFicha);

// Ruta: POST /api/fichas/:id/iniciar-tramite
router.post('/:id/iniciar-tramite', fichaController.iniciarTramite);

// Ruta: PATCH /api/fichas/:id
router.patch('/:id', fichaController.update);

// Ruta: DELETE /api/fichas/:id
router.delete('/:id', fichaController.delete);

export default router;




