import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { prisma } from './lib/prisma';

// Import routes
import tramiteRoutes from './routes/tramiteRoutes';
import usuarioRoutes from './routes/usuarioRoutes';
import grupoRoutes from './routes/grupoRoutes';
import consultanteRoutes from './routes/consultanteRoutes';
import notificacionRoutes from './routes/notificacionRoutes';
import authRoutes from './routes/authRoutes';
import hojaRutaRoutes from './routes/hojaRutaRoutes';
import documentoRoutes from './routes/documentoRoutes';
import fichaRoutes from './routes/fichaRoutes';
import auditoriaRoutes from './routes/auditoriaRoutes';
import reporteRoutes from './routes/reporteRoutes';
import solicitudReactivacionRoutes from './routes/solicitudReactivacionRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware CORS
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? (process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true) // En producción, usar variable de entorno o permitir todos
    : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'], // En desarrollo, solo localhost
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos de uploads
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Routes
app.use('/api/auth', authRoutes); // Authentication routes (public)
app.use('/api/tramites', tramiteRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/grupos', grupoRoutes);
app.use('/api/consultantes', consultanteRoutes);
app.use('/api/notificaciones', notificacionRoutes);
app.use('/api/hoja-ruta', hojaRutaRoutes);
app.use('/api/documentos', documentoRoutes);
app.use('/api/fichas', fichaRoutes);
app.use('/api/auditorias', auditoriaRoutes);
app.use('/api/reportes', reporteRoutes);
app.use('/api/solicitudes-reactivacion', solicitudReactivacionRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'backend',
    timestamp: new Date().toISOString(),
    port: PORT,
  });
});

// Error handling para errores de multer
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'El archivo es demasiado grande. Tamaño máximo: 10MB' });
    }
    return res.status(400).json({ error: err.message });
  }
  
  if (err) {
    console.error('Error:', err);
    res.status(err.status || 500).json({
      error: err.message || 'Internal server error',
    });
  } else {
    next();
  }
});

app.listen(PORT, async () => {
  console.log(`🚀 Backend iniciado en puerto ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️  Database: ${process.env.DATABASE_URL?.split('@')[1] || 'not configured'}`);
  
  // Verificar configuración de Resend
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    console.log(`📧 Resend API Key: ${resendApiKey.substring(0, 10)}... (configurada)`);
    console.log(`📧 Resend From Email: ${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}`);
  } else {
    console.log(`⚠️  Resend API Key: NO configurada - Los correos no se enviarán`);
  }
  
  // Verificar conexión a la base de datos
  try {
    await prisma.$connect();
    console.log('✅ Conectado a PostgreSQL');
  } catch (error) {
    console.error('❌ Error al conectar a PostgreSQL:', error);
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM recibido, cerrando servidor...');
  await prisma.$disconnect();
  process.exit(0);
});

export default app;

