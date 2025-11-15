# Tecnologías del Proyecto SGST

Este documento detalla todas las tecnologías, frameworks, librerías y herramientas utilizadas en el Sistema de Gestión de Trámites (SGST).

## 📱 Frontend

### Framework y Librerías Principales
- **React** `^19.1.0` - Biblioteca de JavaScript para construir interfaces de usuario
- **React DOM** `^19.1.0` - Renderizador de React para el navegador
- **TypeScript** `~5.8.3` - Superset de JavaScript con tipado estático
- **Vite** `^7.0.4` - Herramienta de construcción y desarrollo frontend (build tool)

### Librerías de UI y Componentes
- **React Icons** `^5.0.0` - Librería de iconos para React

### Utilidades y Procesamiento
- **jsPDF** `^2.5.1` - Generación de documentos PDF en el cliente
- **XLSX** `^0.18.5` - Procesamiento de archivos Excel (lectura/escritura)
- **Multer** `^2.0.2` - Middleware para manejo de archivos multipart/form-data

### Herramientas de Desarrollo
- **@vitejs/plugin-react** `^4.6.0` - Plugin de Vite para React
- **ESLint** `^9.30.1` - Linter para JavaScript/TypeScript
- **TypeScript ESLint** `^8.35.1` - Linter específico para TypeScript
- **ESLint Plugin React Hooks** `^5.2.0` - Reglas de ESLint para React Hooks
- **ESLint Plugin React Refresh** `^0.4.20` - Soporte para React Fast Refresh

## 🔧 Backend

### Framework y Runtime
- **Node.js** - Entorno de ejecución JavaScript del lado del servidor
- **Express** `^4.18.2` - Framework web minimalista para Node.js
- **TypeScript** `^5.3.3` - Superset de JavaScript con tipado estático

### Base de Datos y ORM
- **Prisma** `^5.7.0` - ORM (Object-Relational Mapping) moderno
- **@prisma/client** `^5.7.0` - Cliente de Prisma para TypeScript
- **PostgreSQL** - Sistema de gestión de bases de datos relacional

### Autenticación y Seguridad
- **bcrypt** `^5.1.1` - Librería para hashing de contraseñas
- **jsonwebtoken** `^9.0.2` - Implementación de JSON Web Tokens (JWT)
- **CORS** `^2.8.5` - Middleware para habilitar Cross-Origin Resource Sharing

### Utilidades y Servicios
- **Nodemailer** `^7.0.10` - Módulo para envío de correos electrónicos
- **Multer** `^2.0.2` - Middleware para manejo de archivos multipart/form-data
- **jsPDF** `^2.5.1` - Generación de documentos PDF
- **XLSX** `^0.18.5` - Procesamiento de archivos Excel
- **Axios** `^1.6.0` - Cliente HTTP basado en promesas
- **dotenv** `^16.3.1` - Carga variables de entorno desde archivo .env

### Herramientas de Desarrollo
- **tsx** `^4.7.0` - Ejecutor de TypeScript para desarrollo
- **ts-node** `^10.9.2` - Ejecución de TypeScript directamente en Node.js
- **Nodemon** `^3.0.2` - Monitor de archivos para reiniciar automáticamente el servidor

## 🗄️ Base de Datos

- **PostgreSQL 15** - Sistema de gestión de bases de datos relacional de código abierto
- **Prisma ORM** - ORM que proporciona una capa de abstracción sobre PostgreSQL

## 🐳 Contenedores y Virtualización

- **Docker** - Plataforma de contenedores para empaquetar aplicaciones
- **Docker Compose** - Herramienta para definir y ejecutar aplicaciones Docker multi-contenedor

## 🛠️ Herramientas de Desarrollo

### Control de Versiones
- **Git** - Sistema de control de versiones distribuido

### Gestión de Paquetes
- **npm** - Gestor de paquetes de Node.js (o yarn como alternativa)

### TypeScript
- **TypeScript** - Lenguaje de programación que extiende JavaScript con tipos estáticos
- Tipos para Node.js, Express, React, y otras librerías

## 📦 Estructura del Proyecto

```
SGST5/
├── frontend/          # Aplicación React + Vite
│   ├── src/
│   │   ├── components/    # Componentes React
│   │   ├── contexts/      # Context API de React
│   │   ├── services/      # Servicios API
│   │   ├── utils/         # Utilidades
│   │   └── ...
│   └── package.json
│
├── backend/           # API Node.js + Express
│   ├── src/
│   │   ├── controllers/   # Controladores
│   │   ├── routes/        # Rutas de la API
│   │   ├── middleware/    # Middlewares
│   │   ├── utils/         # Utilidades
│   │   └── ...
│   ├── prisma/
│   │   └── schema.prisma  # Schema de Prisma
│   └── package.json
│
└── docker-compose.yml # Configuración de Docker
```

## 🔐 Seguridad

- **JWT (JSON Web Tokens)** - Autenticación basada en tokens
- **bcrypt** - Hashing seguro de contraseñas
- **CORS** - Control de acceso entre orígenes
- **Middleware de autenticación** - Protección de rutas

## 📧 Comunicación

- **Nodemailer** - Envío de correos electrónicos (notificaciones, credenciales, etc.)
- **REST API** - Arquitectura de API RESTful
- **Fetch API / Axios** - Cliente HTTP para comunicación frontend-backend

## 📄 Generación de Documentos

- **jsPDF** - Generación de PDFs en cliente y servidor
- **XLSX** - Exportación/importación de archivos Excel

## 🎨 Estilos

- **CSS** - Estilos personalizados (sin frameworks CSS externos)
- **CSS Modules** - Estilos con scope local por componente

## 📊 Gestión de Estado

- **React Context API** - Gestión de estado global (autenticación, notificaciones)
- **React Hooks** - useState, useEffect, useContext, etc.

## 🔄 Características Principales

- **Hot Module Replacement (HMR)** - Recarga automática durante desarrollo (Vite)
- **TypeScript** - Tipado estático en todo el proyecto
- **Prisma Migrations** - Sistema de migraciones de base de datos
- **ESLint** - Linting y formateo de código
- **Modularización** - Arquitectura modular y escalable

## 📝 Notas Adicionales

- El proyecto utiliza **TypeScript** tanto en frontend como backend para mayor seguridad de tipos
- **Prisma** se utiliza como ORM principal, proporcionando type-safety y migraciones automáticas
- **Vite** se utiliza como build tool para desarrollo rápido y builds optimizados
- El sistema implementa autenticación JWT con refresh tokens
- Soporte para múltiples roles de usuario (administrador, docente, estudiante, consultante)
- Sistema de notificaciones en tiempo real
- Auditoría de acciones del sistema
- Generación de reportes en PDF y Excel

## 🔄 Versiones Principales

- **Node.js**: 18+ (recomendado)
- **PostgreSQL**: 15
- **React**: 19.1.0
- **TypeScript**: 5.3.3 - 5.8.3
- **Prisma**: 5.7.0
- **Express**: 4.18.2

---

*Última actualización: Diciembre 2024*

