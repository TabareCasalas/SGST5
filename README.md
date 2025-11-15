# SGST - Sistema de Gestión de Trámites

Sistema de gestión de trámites para la Clínica Notarial. Arquitectura clásica con Frontend (React + Vite), Backend (Node.js + Express + Prisma) y Base de Datos (PostgreSQL).

## 🏗️ Arquitectura

- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript + Prisma ORM
- **Base de Datos**: PostgreSQL 15
- **Contenedores**: Docker y Docker Compose

## 📋 Requisitos Previos

- Docker (versión 20.10 o superior) - Solo para la base de datos
- Docker Compose (versión 2.0 o superior) - Solo para la base de datos
- Node.js (versión 18 o superior) - Para backend y frontend
- npm o yarn - Para instalar dependencias
- Git

## 🚀 Despliegue en Producción (Ubuntu)

Para producción, puedes usar Docker para todo o solo para la base de datos. Esta configuración actual está optimizada para desarrollo local.

### Opción 1: Solo Base de Datos en Docker (Recomendado para desarrollo)

Sigue las instrucciones de "Desarrollo Local" arriba.

### Opción 2: Todo en Docker (Para producción)

Si necesitas desplegar todo en Docker, necesitarás restaurar los servicios de backend y frontend en `docker-compose.yml`. Actualmente está configurado solo para la base de datos.

## 🔧 Comandos Útiles

### Ver logs de los servicios

```bash
# Todos los servicios
docker-compose logs -f

# Servicio específico
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### Detener los servicios

```bash
docker-compose down
```

### Detener y eliminar volúmenes (⚠️ elimina la base de datos)

```bash
docker-compose down -v
```

### Reconstruir un servicio específico

```bash
docker-compose up -d --build backend
```

### Ejecutar migraciones de Prisma (desde el backend local)

```bash
cd backend
npx prisma migrate deploy
# o para desarrollo
npx prisma migrate dev
```

### Acceder a la base de datos

```bash
docker-compose exec postgres psql -U sgst_user -d sgst_db
```

## 📁 Estructura del Proyecto

```
SGST5/
├── backend/              # Backend API
│   ├── src/
│   │   ├── controllers/  # Controladores
│   │   ├── routes/       # Rutas
│   │   ├── services/     # Servicios
│   │   └── utils/        # Utilidades
│   ├── prisma/           # Schema y migraciones de Prisma
│   └── Dockerfile        # Dockerfile del backend
├── frontend/             # Frontend React
│   ├── src/
│   │   ├── components/   # Componentes React
│   │   ├── services/     # Servicios API
│   │   └── contexts/     # Contextos React
│   └── package.json
├── docker-compose.yml    # Configuración de Docker Compose
├── Dockerfile            # Dockerfile del frontend
├── nginx.conf            # Configuración de Nginx
└── .env                  # Variables de entorno (crear desde env.example)
```

## 🔐 Seguridad

- Las contraseñas se almacenan hasheadas con bcrypt
- Autenticación mediante JWT (access token + refresh token)
- Middleware de autenticación en todas las rutas protegidas
- Validación de datos en el backend
- Variables sensibles en archivo `.env` (no commitear)

## 🛠️ Desarrollo Local

Para desarrollo local, Docker solo se usa para la base de datos. El frontend y backend se ejecutan localmente.

### 1. Levantar la base de datos con Docker

```bash
docker-compose up -d
```

Esto iniciará:
- PostgreSQL en el puerto 5432
- PgAdmin (opcional) en el puerto 8080

### 2. Configurar variables de entorno

#### Backend

Crea un archivo `.env` en la carpeta `backend/`:

```bash
cd backend
cp .env.example .env  # Si existe, o créalo manualmente
```

Contenido del archivo `backend/.env`:
```env
NODE_ENV=development
DATABASE_URL=postgresql://sgst_user:sgst_password@localhost:5432/sgst_db
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
REFRESH_SECRET=your-refresh-secret-change-this-in-production
PORT=3001

# Configuración de Resend para envío de correos
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@tudominio.com
RESEND_FROM_NAME=SGST Sistema
```

**Nota sobre Resend:**
- Obtén tu API key en: https://resend.com/api-keys
- Para desarrollo, puedes dejar `RESEND_API_KEY` vacío y las credenciales se mostrarán en la consola
- `RESEND_FROM_EMAIL` debe ser un dominio verificado en Resend (o usar `onboarding@resend.dev` para pruebas sin dominio)
- `RESEND_FROM_NAME` es opcional, por defecto será "SGST Sistema"
- **Sin dominio personalizado**: Puedes usar `onboarding@resend.dev` que es el dominio de prueba de Resend (no requiere verificación)

#### Frontend

Crea un archivo `.env` en la carpeta `frontend/`:

```bash
cd frontend
cp .env.example .env  # Si existe, o créalo manualmente
```

Contenido del archivo `frontend/.env`:
```env
VITE_API_URL=http://localhost:3001/api
```

### 3. Instalar dependencias y ejecutar el Backend

```bash
cd backend
npm install
npm run dev
```

El backend estará disponible en: http://localhost:3001

### 4. Instalar dependencias y ejecutar el Frontend

En una nueva terminal:

```bash
cd frontend
npm install
npm run dev
```

El frontend estará disponible en: http://localhost:5173

### 5. Ejecutar migraciones de Prisma (primera vez)

```bash
cd backend
npx prisma migrate dev
npx prisma generate
```

### Comandos útiles para desarrollo

```bash
# Ver logs de la base de datos
docker-compose logs -f postgres

# Detener la base de datos
docker-compose down

# Acceder a la base de datos directamente
docker-compose exec postgres psql -U sgst_user -d sgst_db

# Abrir Prisma Studio (interfaz visual para la BD)
cd backend
npx prisma studio
```

## 📝 Notas

- El campo `process_instance_id` en la tabla `Tramite` se mantiene por compatibilidad pero no se utiliza en esta versión sin Camunda.
- Los archivos subidos se almacenan en `backend/uploads/`
- Las migraciones de Prisma se ejecutan automáticamente al iniciar el backend

## 🐛 Solución de Problemas

### El backend no puede conectarse a la base de datos

Verifica que:
- El servicio de PostgreSQL esté corriendo: `docker-compose ps`
- Las credenciales en `backend/.env` coincidan con las del servicio postgres
- La URL de la base de datos sea: `postgresql://sgst_user:sgst_password@localhost:5432/sgst_db`
- El puerto 5432 no esté siendo usado por otra aplicación

### El frontend no puede conectarse al backend

Verifica que:
- El backend esté corriendo en el puerto 3001
- La variable `VITE_API_URL` en `frontend/.env` sea: `http://localhost:3001/api`
- No haya errores de CORS (el backend debe permitir `http://localhost:5173`)

### Error al construir las imágenes

```bash
# Limpiar caché de Docker
docker system prune -a

# Reconstruir sin caché
docker-compose build --no-cache
```

## 📞 Soporte

Para problemas o preguntas, contactar al equipo de desarrollo.
