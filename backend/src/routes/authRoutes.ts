import express from 'express';
import { authController } from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

// Ruta: POST /api/auth/login (pública)
router.post('/login', authController.login);

// Ruta: POST /api/auth/logout
router.post('/logout', authController.logout);

// Ruta: POST /api/auth/refresh
router.post('/refresh', authController.refresh);

// Ruta: GET /api/auth/me (requiere autenticación)
router.get('/me', authMiddleware, authController.me);

export default router;






