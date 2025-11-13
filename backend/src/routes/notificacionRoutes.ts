import express from 'express';
import * as notificacionController from '../controllers/notificacionController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Rutas del usuario autenticado
router.get('/mis-notificaciones', notificacionController.getMisNotificaciones);
router.get('/contador', notificacionController.getContadorNoLeidas);
router.put('/:id/leida', notificacionController.marcarLeida);
router.put('/marcar-todas-leidas', notificacionController.marcarTodasLeidas);
router.delete('/:id', notificacionController.eliminar);

// Rutas para crear notificaciones y ver notificaciones de otros usuarios
router.post('/', notificacionController.create);
router.get('/usuario/:id_usuario', notificacionController.getByUsuario);

export default router;
