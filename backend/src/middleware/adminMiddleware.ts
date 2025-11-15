import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from './authMiddleware';

/**
 * Middleware que verifica que el usuario sea administrador (nivel_acceso = 1 o 3)
 */
export const adminMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    // Obtener el usuario completo de la base de datos para verificar nivel_acceso
    const usuario = await prisma.usuario.findUnique({
      where: { id_usuario: req.user.id },
      select: {
        id_usuario: true,
        rol: true,
        nivel_acceso: true,
        activo: true,
      },
    });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (!usuario.activo) {
      return res.status(403).json({ error: 'Usuario inactivo' });
    }

    // Verificar que sea administrador
    if (usuario.rol !== 'administrador') {
      return res.status(403).json({ error: 'Acceso denegado: se requiere rol de administrador' });
    }

    // Verificar que tenga nivel_acceso = 1 (Administrativo) o 3 (Sistema)
    if (usuario.nivel_acceso !== 1 && usuario.nivel_acceso !== 3) {
      return res.status(403).json({ 
        error: 'Acceso denegado: se requiere nivel de acceso de administrador (nivel 1 o 3)' 
      });
    }

    // Usuario autorizado, continuar
    next();
  } catch (error: any) {
    console.error('Error en adminMiddleware:', error);
    return res.status(500).json({ error: 'Error al verificar permisos' });
  }
};

