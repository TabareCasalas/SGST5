# SGST - Sistema de Gestión de Trámites

Sistema de gestión de trámites para la Clínica Notarial. Arquitectura clásica con Frontend (React + Vite), Backend (Node.js + Express + Prisma) y Base de Datos (PostgreSQL).

## 🏗️ Arquitectura

- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript + Prisma ORM
- **Base de Datos**: PostgreSQL 15
- **Contenedores**: Docker y Docker Compose

## 📋 Requisitos Previos

- Docker (versión 20.10 o superior)
- Docker Compose (versión 2.0 o superior)
- Git

## 🚀 Despliegue en Ubuntu

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd SGST5
```

### 2. Configurar variables de entorno

Copia el archivo de ejemplo y ajusta las variables según tu entorno:

```bash
cp env.example .env
```

Edita el archivo `.env` y configura:
- Credenciales de la base de datos
- Secretos JWT (¡cambiar en producción!)
- URLs de la aplicación
- Puertos si es necesario

**Importante**: En producción, asegúrate de cambiar los valores por defecto de:
- `JWT_SECRET`
- `REFRESH_SECRET`
- `POSTGRES_PASSWORD`
- `PGADMIN_PASSWORD`

### 3. Construir y levantar los contenedores

```bash
docker-compose up -d --build
```

Este comando:
- Construye las imágenes de Docker
- Crea los contenedores
- Inicia todos los servicios
- Configura la red interna entre servicios

### 4. Verificar que los servicios estén corriendo

```bash
docker-compose ps
```

Deberías ver los siguientes servicios:
- `sgst_postgres` - Base de datos PostgreSQL
- `sgst_backend` - API Backend
- `sgst_frontend` - Frontend React
- `sgst_pgadmin` - PgAdmin (opcional)

### 5. Acceder a la aplicación

- **Frontend**: http://localhost (o el puerto configurado en `FRONTEND_PORT`)
- **Backend API**: http://localhost:3001/api
- **PgAdmin**: http://localhost:8080 (opcional)

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

### Ejecutar migraciones de Prisma

```bash
docker-compose exec backend npx prisma migrate deploy
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

Para desarrollo local sin Docker:

1. Levantar solo la base de datos:
```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

2. En el backend:
```bash
cd backend
npm install
npm run dev
```

3. En el frontend:
```bash
cd frontend
npm install
npm run dev
```

## 📝 Notas

- El campo `process_instance_id` en la tabla `Tramite` se mantiene por compatibilidad pero no se utiliza en esta versión sin Camunda.
- Los archivos subidos se almacenan en `backend/uploads/`
- Las migraciones de Prisma se ejecutan automáticamente al iniciar el backend

## 🐛 Solución de Problemas

### El backend no puede conectarse a la base de datos

Verifica que:
- El servicio de PostgreSQL esté corriendo: `docker-compose ps`
- Las credenciales en `.env` coincidan con las del servicio postgres
- La red de Docker esté configurada correctamente

### El frontend no puede conectarse al backend

Verifica que:
- La variable `VITE_API_URL` en `.env` apunte correctamente al backend
- En Docker, debe ser: `http://backend:3001/api`
- En desarrollo local, debe ser: `http://localhost:3001/api`

### Error al construir las imágenes

```bash
# Limpiar caché de Docker
docker system prune -a

# Reconstruir sin caché
docker-compose build --no-cache
```

## 📞 Soporte

Para problemas o preguntas, contactar al equipo de desarrollo.
