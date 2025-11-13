import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { AuthRequest } from '../middleware/authMiddleware';
import { AuditoriaService } from '../utils/auditoriaService';

// Configurar almacenamiento de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    // Crear directorio si no existe
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generar nombre único: timestamp_id_tramite_nombre_original
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    const fileName = `${uniqueSuffix}_${nameWithoutExt}${ext}`;
    cb(null, fileName);
  },
});

// Filtro de archivos permitidos
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Tipos MIME permitidos
  const allowedMimes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Solo se permiten: PDF, imágenes (JPG, PNG), Word, Excel'));
  }
};

export const uploadMiddleware = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB máximo
  },
  fileFilter: fileFilter,
});

export const documentoController = {
  // Obtener todos los documentos de un trámite
  async getByTramite(req: AuthRequest, res: Response) {
    try {
      const { id_tramite } = req.params;
      
      const documentos = await prisma.documentoAdjunto.findMany({
        where: { id_tramite: parseInt(id_tramite) },
        include: {
          usuario: {
            select: {
              id_usuario: true,
              nombre: true,
              ci: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      // Registrar auditoría
      const userId = req.user?.id;
      if (userId) {
        await AuditoriaService.crearDesdeRequest(req, {
          id_usuario: userId,
          tipo_entidad: 'documento',
          id_entidad: null,
          accion: 'listar',
          detalles: `Documentos del trámite ${id_tramite} consultados`,
        });
      }

      res.json(documentos);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // Subir un documento
  async upload(req: AuthRequest, res: Response) {
    try {
      const { id_tramite } = req.params;
      const id_usuario = req.user?.id; // Del token JWT
      const { descripcion } = req.body;
      const file = req.file;

      if (!id_usuario) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      if (!file) {
        return res.status(400).json({ error: 'No se proporcionó ningún archivo' });
      }

      // Verificar que el trámite existe
      const tramite = await prisma.tramite.findUnique({
        where: { id_tramite: parseInt(id_tramite) },
        select: {
          num_carpeta: true,
        },
      });

      if (!tramite) {
        // Eliminar archivo subido si el trámite no existe
        fs.unlinkSync(file.path);
        return res.status(404).json({ error: 'Trámite no encontrado' });
      }

      // Crear registro del documento en la base de datos
      const documento = await prisma.documentoAdjunto.create({
        data: {
          id_tramite: parseInt(id_tramite),
          id_usuario,
          nombre_archivo: file.originalname,
          nombre_almacenado: file.filename,
          ruta_archivo: file.path,
          tipo_mime: file.mimetype,
          tamano: file.size,
          descripcion: descripcion || null,
        },
        include: {
          usuario: {
            select: {
              id_usuario: true,
              nombre: true,
              ci: true,
            },
          },
        },
      });

      // Registrar auditoría
      if (id_usuario) {
        const tamanoMB = (file.size / (1024 * 1024)).toFixed(2);
        await AuditoriaService.crearDesdeRequest(req, {
          id_usuario: id_usuario,
          tipo_entidad: 'documento',
          id_entidad: documento.id_documento,
          accion: 'crear',
          detalles: `Documento adjuntado al trámite ${tramite.num_carpeta}. Archivo: ${file.originalname} (${tamanoMB} MB, ${file.mimetype})${descripcion ? `. Descripción: ${descripcion}` : ''}`,
        });
      }

      res.status(201).json(documento);
    } catch (error: any) {
      // Eliminar archivo si hay error
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ error: error.message });
    }
  },

  // Descargar un documento
  async download(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const documento = await prisma.documentoAdjunto.findUnique({
        where: { id_documento: parseInt(id) },
      });

      if (!documento) {
        return res.status(404).json({ error: 'Documento no encontrado' });
      }

      // Verificar que el archivo existe
      if (!fs.existsSync(documento.ruta_archivo)) {
        return res.status(404).json({ error: 'Archivo no encontrado en el servidor' });
      }

      // Registrar auditoría
      const userId = req.user?.id;
      if (userId) {
        await AuditoriaService.crearDesdeRequest(req, {
          id_usuario: userId,
          tipo_entidad: 'documento',
          id_entidad: documento.id_documento,
          accion: 'descargar',
          detalles: `Documento descargado: ${documento.nombre_archivo} del trámite`,
        });
      }

      // Enviar el archivo
      res.download(documento.ruta_archivo, documento.nombre_archivo, (err) => {
        if (err) {
          console.error('Error al descargar archivo:', err);
          res.status(500).json({ error: 'Error al descargar el archivo' });
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // Eliminar un documento
  async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const id_usuario = req.user?.id; // Del token JWT

      if (!id_usuario) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const documento = await prisma.documentoAdjunto.findUnique({
        where: { id_documento: parseInt(id) },
        include: {
          tramite: {
            select: {
              num_carpeta: true,
            },
          },
        },
      });

      if (!documento) {
        return res.status(404).json({ error: 'Documento no encontrado' });
      }

      // Solo el usuario que subió el documento o un admin puede eliminarlo
      const esPropietario = documento.id_usuario === id_usuario;
      // Aquí podrías agregar validación de admin si es necesario

      if (!esPropietario) {
        return res.status(403).json({ error: 'No tienes permisos para eliminar este documento' });
      }

      // Guardar información para auditoría antes de eliminar
      const nombreArchivo = documento.nombre_archivo;
      const numCarpeta = documento.tramite?.num_carpeta || 'N/A';

      // Eliminar archivo del sistema de archivos
      if (fs.existsSync(documento.ruta_archivo)) {
        fs.unlinkSync(documento.ruta_archivo);
      }

      // Eliminar registro de la base de datos
      await prisma.documentoAdjunto.delete({
        where: { id_documento: parseInt(id) },
      });

      // Registrar auditoría
      if (id_usuario) {
        await AuditoriaService.crearDesdeRequest(req, {
          id_usuario: id_usuario,
          tipo_entidad: 'documento',
          id_entidad: parseInt(id),
          accion: 'eliminar',
          detalles: `Documento eliminado del trámite ${numCarpeta}. Archivo: ${nombreArchivo}`,
        });
      }

      res.json({ message: 'Documento eliminado exitosamente' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
};

