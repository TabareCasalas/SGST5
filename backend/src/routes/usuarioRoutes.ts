import express from 'express';
import multer from 'multer';
import { usuarioController } from '../controllers/usuarioController';
import { authMiddleware } from '../middleware/authMiddleware';
import { adminSistemaMiddleware } from '../middleware/adminSistemaMiddleware';
import { adminMiddleware } from '../middleware/adminMiddleware';

const router = express.Router();

// Configurar multer para subir archivos Excel
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB máximo
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos Excel (.xlsx, .xls)'));
    }
  },
});

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Ruta: GET /api/usuarios
router.get('/', usuarioController.getAll);

// Ruta: GET /api/usuarios/auditoria (Solo Administrador Sistema nivel 3)
router.get('/auditoria', adminSistemaMiddleware, usuarioController.getAuditoria);

// Ruta: POST /api/usuarios/importar (Importar desde Excel)
router.post('/importar', upload.single('file'), usuarioController.importarDesdeExcel);

// Ruta: GET /api/usuarios/:id
router.get('/:id', usuarioController.getById);

// Ruta: POST /api/usuarios
router.post('/', usuarioController.create);

// Ruta: PATCH /api/usuarios/:id (Solo Administradores)
router.patch('/:id', adminMiddleware, usuarioController.update);

// Ruta: POST /api/usuarios/:id/activar (Solo Administradores)
router.post('/:id/activar', adminMiddleware, usuarioController.activate);

// Ruta: POST /api/usuarios/:id/desactivar (Solo Administradores)
router.post('/:id/desactivar', adminMiddleware, usuarioController.deactivate);

// Ruta: DELETE /api/usuarios/:id (Solo Administradores)
router.delete('/:id', adminMiddleware, usuarioController.delete);

export default router;






