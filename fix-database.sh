#!/bin/bash

# Script para corregir las credenciales de PostgreSQL
# Uso: ./fix-database.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${YELLOW}🔧 Corrigiendo credenciales de PostgreSQL...${NC}"
echo ""

# Detectar directorio del proyecto
if [ -f "backend/package.json" ]; then
    APP_DIR=$(pwd)
elif [ -d "/var/www/sgst" ] && [ -f "/var/www/sgst/backend/package.json" ]; then
    APP_DIR="/var/www/sgst"
elif [ -d "$HOME/sgst" ] && [ -f "$HOME/sgst/backend/package.json" ]; then
    APP_DIR="$HOME/sgst"
else
    echo -e "${RED}❌ No se encontró el proyecto${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Proyecto encontrado en: $APP_DIR"
echo ""

# Solicitar contraseña
read -sp "Ingresa la contraseña que quieres usar para PostgreSQL (sgst_user): " DB_PASSWORD
echo ""
echo ""

if [ -z "$DB_PASSWORD" ]; then
    DB_PASSWORD="sgst_password"
    echo -e "${YELLOW}⚠️  Usando contraseña por defecto: sgst_password${NC}"
fi

echo -e "${BLUE}📝 Configurando PostgreSQL...${NC}"

# Configurar PostgreSQL
sudo -u postgres psql << EOF
-- Eliminar usuario si existe
DROP USER IF EXISTS sgst_user;

-- Crear usuario con la nueva contraseña
CREATE USER sgst_user WITH PASSWORD '$DB_PASSWORD';

-- Otorgar privilegios
GRANT ALL PRIVILEGES ON DATABASE sgst_db TO sgst_user;
ALTER USER sgst_user CREATEDB;
EOF

echo -e "${GREEN}✓${NC} Usuario sgst_user creado/actualizado en PostgreSQL"
echo ""

# Actualizar .env del backend
echo -e "${BLUE}📝 Actualizando backend/.env...${NC}"

cd "$APP_DIR/backend"

if [ -f ".env" ]; then
    # Actualizar DATABASE_URL
    sed -i "s|DATABASE_URL=.*|DATABASE_URL=postgresql://sgst_user:$DB_PASSWORD@localhost:5432/sgst_db|g" .env
    echo -e "${GREEN}✓${NC} DATABASE_URL actualizado en backend/.env"
else
    echo -e "${YELLOW}⚠️  No se encontró backend/.env, creándolo...${NC}"
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" 2>/dev/null || echo "change-this-jwt-secret")
    REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" 2>/dev/null || echo "change-this-refresh-secret")
    
    cat > .env << EOF
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://sgst_user:$DB_PASSWORD@localhost:5432/sgst_db
JWT_SECRET=$JWT_SECRET
REFRESH_SECRET=$REFRESH_SECRET
RESEND_API_KEY=re_KYkV3qCv_4NjgbTVBRAARrktSrLfGp6jC
EOF
    echo -e "${GREEN}✓${NC} backend/.env creado"
fi

echo ""
echo -e "${GREEN}✅ Credenciales actualizadas${NC}"
echo ""
echo -e "${YELLOW}📋 Prueba la conexión:${NC}"
echo "  cd $APP_DIR/backend"
echo "  npx prisma migrate deploy"
echo ""

