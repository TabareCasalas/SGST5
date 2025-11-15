#!/bin/bash

# Script de despliegue automático para SGST en Ubuntu
# Uso: ./deploy.sh

set -e  # Salir si hay algún error

echo "🚀 Iniciando despliegue de SGST..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar que estamos en Ubuntu
if ! grep -q "Ubuntu" /etc/os-release; then
    echo -e "${RED}❌ Este script está diseñado para Ubuntu${NC}"
    exit 1
fi

# Verificar que estamos como usuario (no root)
if [ "$EUID" -eq 0 ]; then 
    echo -e "${RED}❌ No ejecutes este script como root. Úsalo como usuario normal.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Verificando dependencias del sistema...${NC}"

# Actualizar sistema
echo "📦 Actualizando sistema..."
sudo apt update && sudo apt upgrade -y

# Instalar Node.js si no está instalado
if ! command -v node &> /dev/null; then
    echo "📦 Instalando Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
else
    echo -e "${GREEN}✅ Node.js ya está instalado${NC}"
fi

# Instalar PostgreSQL si no está instalado
if ! command -v psql &> /dev/null; then
    echo "📦 Instalando PostgreSQL..."
    sudo apt install -y postgresql postgresql-contrib
else
    echo -e "${GREEN}✅ PostgreSQL ya está instalado${NC}"
fi

# Instalar Nginx si no está instalado
if ! command -v nginx &> /dev/null; then
    echo "📦 Instalando Nginx..."
    sudo apt install -y nginx
else
    echo -e "${GREEN}✅ Nginx ya está instalado${NC}"
fi

# Instalar PM2 si no está instalado
if ! command -v pm2 &> /dev/null; then
    echo "📦 Instalando PM2..."
    sudo npm install -g pm2
else
    echo -e "${GREEN}✅ PM2 ya está instalado${NC}"
fi

# Instalar build-essential
echo "📦 Instalando build-essential..."
sudo apt install -y build-essential

echo -e "${GREEN}✅ Dependencias instaladas${NC}"

# Configurar PostgreSQL
echo "🗄️  Configurando PostgreSQL..."
sudo -u postgres psql << EOF
-- Crear base de datos si no existe
SELECT 'CREATE DATABASE sgst_db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'sgst_db')\gexec

-- Crear usuario si no existe
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'sgst_user') THEN
        CREATE USER sgst_user WITH PASSWORD 'sgst_password';
    END IF;
END
\$\$;

-- Otorgar privilegios
GRANT ALL PRIVILEGES ON DATABASE sgst_db TO sgst_user;
ALTER USER sgst_user CREATEDB;
EOF

echo -e "${GREEN}✅ PostgreSQL configurado${NC}"

# Verificar que estamos en el directorio del proyecto
if [ ! -f "backend/package.json" ]; then
    echo -e "${RED}❌ No se encontró backend/package.json. Asegúrate de estar en el directorio raíz del proyecto.${NC}"
    exit 1
fi

# Instalar dependencias del backend
echo "📦 Instalando dependencias del backend..."
cd backend
npm install
echo -e "${GREEN}✅ Dependencias del backend instaladas${NC}"

# Verificar que existe .env
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  No se encontró backend/.env. Creando desde ejemplo...${NC}"
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${YELLOW}⚠️  IMPORTANTE: Edita backend/.env y configura las variables necesarias${NC}"
    else
        echo -e "${RED}❌ No se encontró .env.example. Crea manualmente backend/.env${NC}"
        exit 1
    fi
fi

# Compilar backend
echo "🔨 Compilando backend..."
npm run build
npx prisma generate
npx prisma migrate deploy
echo -e "${GREEN}✅ Backend compilado${NC}"

# Instalar dependencias del frontend
echo "📦 Instalando dependencias del frontend..."
cd ../frontend
npm install
echo -e "${GREEN}✅ Dependencias del frontend instaladas${NC}"

# Verificar que existe .env
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  No se encontró frontend/.env. Creando desde ejemplo...${NC}"
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${YELLOW}⚠️  IMPORTANTE: Edita frontend/.env y configura VITE_API_URL${NC}"
    else
        echo "VITE_API_URL=http://localhost:3001/api" > .env
        echo -e "${YELLOW}⚠️  IMPORTANTE: Edita frontend/.env y configura VITE_API_URL con tu dominio o IP${NC}"
    fi
fi

# Compilar frontend
echo "🔨 Compilando frontend..."
npm run build
echo -e "${GREEN}✅ Frontend compilado${NC}"

# Iniciar backend con PM2
echo "🚀 Iniciando backend con PM2..."
cd ../backend
pm2 delete sgst-backend 2>/dev/null || true
pm2 start dist/index.js --name sgst-backend
pm2 save
echo -e "${GREEN}✅ Backend iniciado con PM2${NC}"

# Configurar PM2 para iniciar al arrancar
echo "⚙️  Configurando PM2 para iniciar al arrancar..."
pm2 startup | grep -v "PM2" | bash || true
echo -e "${GREEN}✅ PM2 configurado${NC}"

echo -e "${GREEN}✅ Despliegue completado!${NC}"
echo ""
echo "📝 Próximos pasos:"
echo "1. Configura Nginx (ver DEPLOY.md)"
echo "2. Configura el firewall de Google Cloud"
echo "3. Verifica que todo funciona: pm2 status"
echo ""
echo "🔍 Ver logs del backend: pm2 logs sgst-backend"

