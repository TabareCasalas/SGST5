#!/bin/bash

# Script de despliegue completo para SGST en Ubuntu/Google Cloud
# Este script automatiza TODO el proceso de despliegue
# Uso: ./deploy-complete.sh

set -e  # Salir si hay algún error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables configurables
# Detectar automáticamente el directorio del proyecto
if [ -f "deploy-complete.sh" ]; then
    # Si estamos en el directorio del proyecto
    APP_DIR=$(pwd)
elif [ -d "/var/www/sgst" ]; then
    # Si existe /var/www/sgst
    APP_DIR="/var/www/sgst"
elif [ -d "$HOME/sgst" ]; then
    # Si está en el home del usuario
    APP_DIR="$HOME/sgst"
else
    # Por defecto intentar crear /var/www/sgst
    APP_DIR="/var/www/sgst"
fi

APP_USER=$(whoami)
DOMAIN=""
IP_ADDRESS=""

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Despliegue Completo de SGST         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Verificar que estamos en Ubuntu
if ! grep -q "Ubuntu" /etc/os-release; then
    echo -e "${RED}❌ Este script está diseñado para Ubuntu${NC}"
    exit 1
fi

# Verificar que no somos root
if [ "$EUID" -eq 0 ]; then 
    echo -e "${RED}❌ No ejecutes este script como root. Úsalo como usuario normal.${NC}"
    exit 1
fi

# Solicitar información
echo -e "${YELLOW}📋 Necesito algunos datos para configurar la aplicación:${NC}"
read -p "¿Tienes un dominio? (s/n): " tiene_dominio
if [ "$tiene_dominio" = "s" ] || [ "$tiene_dominio" = "S" ]; then
    read -p "Ingresa tu dominio (ej: ejemplo.com): " DOMAIN
else
    read -p "Ingresa la IP pública de la VM: " IP_ADDRESS
fi

read -p "¿Quieres usar la contraseña por defecto para PostgreSQL? (s/n): " usar_pass_default
if [ "$usar_pass_default" != "s" ] && [ "$usar_pass_default" != "S" ]; then
    read -sp "Ingresa la contraseña para PostgreSQL (sgst_user): " DB_PASSWORD
    echo ""
else
    DB_PASSWORD="sgst_password"
fi

echo ""
echo -e "${GREEN}🚀 Iniciando despliegue...${NC}"
echo ""

# ============================================
# PASO 1: Actualizar sistema e instalar dependencias
# ============================================
echo -e "${BLUE}📦 Paso 1: Instalando dependencias del sistema...${NC}"

sudo apt update -qq
sudo apt upgrade -y -qq

# Instalar Node.js si no está instalado
if ! command -v node &> /dev/null; then
    echo "  → Instalando Node.js 18.x..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - > /dev/null 2>&1
    sudo apt install -y nodejs > /dev/null 2>&1
else
    echo -e "  ${GREEN}✓${NC} Node.js ya está instalado ($(node --version))"
fi

# Instalar PostgreSQL si no está instalado
if ! command -v psql &> /dev/null; then
    echo "  → Instalando PostgreSQL..."
    sudo apt install -y postgresql postgresql-contrib > /dev/null 2>&1
else
    echo -e "  ${GREEN}✓${NC} PostgreSQL ya está instalado"
fi

# Instalar Nginx si no está instalado
if ! command -v nginx &> /dev/null; then
    echo "  → Instalando Nginx..."
    sudo apt install -y nginx > /dev/null 2>&1
else
    echo -e "  ${GREEN}✓${NC} Nginx ya está instalado"
fi

# Instalar PM2 si no está instalado
if ! command -v pm2 &> /dev/null; then
    echo "  → Instalando PM2..."
    sudo npm install -g pm2 > /dev/null 2>&1
else
    echo -e "  ${GREEN}✓${NC} PM2 ya está instalado"
fi

# Instalar build-essential
echo "  → Instalando build-essential..."
sudo apt install -y build-essential > /dev/null 2>&1

echo -e "${GREEN}✅ Dependencias instaladas${NC}"
echo ""

# ============================================
# PASO 2: Configurar PostgreSQL
# ============================================
echo -e "${BLUE}🗄️  Paso 2: Configurando PostgreSQL...${NC}"

# Crear base de datos y usuario
sudo -u postgres psql << EOF > /dev/null 2>&1
-- Crear base de datos si no existe
SELECT 'CREATE DATABASE sgst_db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'sgst_db')\gexec

-- Eliminar usuario si existe y recrearlo
DROP USER IF EXISTS sgst_user;
CREATE USER sgst_user WITH PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE sgst_db TO sgst_user;
ALTER USER sgst_user CREATEDB;
EOF

echo -e "  ${GREEN}✓${NC} Base de datos y usuario creados"
echo -e "${GREEN}✅ PostgreSQL configurado${NC}"
echo ""

# ============================================
# PASO 3: Verificar/Configurar código fuente
# ============================================
echo -e "${BLUE}📥 Paso 3: Configurando código fuente...${NC}"

# Si ya estamos en el directorio del proyecto (tiene backend/package.json)
if [ -f "backend/package.json" ]; then
    APP_DIR=$(pwd)
    echo "  → Usando directorio actual: $APP_DIR"
    cd "$APP_DIR"
elif [ -d "$APP_DIR" ] && [ -f "$APP_DIR/backend/package.json" ]; then
    echo "  → El directorio ya existe, usando: $APP_DIR"
    cd "$APP_DIR"
    # Intentar actualizar
    git pull origin main 2>/dev/null || git pull origin master 2>/dev/null || echo "  ⚠️  No se pudo actualizar, continuando..."
else
    echo -e "${RED}❌ No se encontró el código fuente.${NC}"
    echo -e "${YELLOW}Por favor, ejecuta estos comandos primero:${NC}"
    echo ""
    echo "  sudo mkdir -p /var/www"
    echo "  cd /var/www"
    echo "  sudo git clone https://github.com/TabareCasalas/SGST5.git sgst"
    echo "  sudo chown -R \$USER:\$USER /var/www/sgst"
    echo "  cd /var/www/sgst"
    echo "  ./deploy-complete.sh"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ Código fuente configurado${NC}"
echo ""

# ============================================
# PASO 4: Configurar Backend
# ============================================
echo -e "${BLUE}⚙️  Paso 4: Configurando Backend...${NC}"

cd "$APP_DIR/backend"

# Instalar dependencias
echo "  → Instalando dependencias..."
npm install --silent

# Generar secrets si no existen
if [ ! -f ".env" ]; then
    echo "  → Creando archivo .env..."
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    
    cat > .env << EOF
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://sgst_user:$DB_PASSWORD@localhost:5432/sgst_db
JWT_SECRET=$JWT_SECRET
REFRESH_SECRET=$REFRESH_SECRET
RESEND_API_KEY=re_KYkV3qCv_4NjgbTVBRAARrktSrLfGp6jC
EOF
    echo -e "  ${GREEN}✓${NC} Archivo .env creado con secrets generados"
else
    echo -e "  ${GREEN}✓${NC} Archivo .env ya existe"
    # Actualizar DATABASE_URL si es necesario
    if grep -q "sgst_password" .env && [ "$DB_PASSWORD" != "sgst_password" ]; then
        sed -i "s|sgst_password|$DB_PASSWORD|g" .env
        echo -e "  ${GREEN}✓${NC} DATABASE_URL actualizado"
    fi
fi

# Compilar backend
echo "  → Compilando backend..."
npm run build > /dev/null 2>&1
echo "  → Generando Prisma Client..."
npx prisma generate > /dev/null 2>&1
echo "  → Ejecutando migraciones..."
npx prisma migrate deploy > /dev/null 2>&1

echo -e "${GREEN}✅ Backend configurado${NC}"
echo ""

# ============================================
# PASO 5: Configurar Frontend
# ============================================
echo -e "${BLUE}⚙️  Paso 5: Configurando Frontend...${NC}"

cd "$APP_DIR/frontend"

# Instalar dependencias
echo "  → Instalando dependencias..."
npm install --silent

# Configurar .env
if [ ! -f ".env" ]; then
    echo "  → Creando archivo .env..."
    if [ -n "$DOMAIN" ]; then
        echo "VITE_API_URL=https://$DOMAIN/api" > .env
    else
        echo "VITE_API_URL=http://$IP_ADDRESS:3001/api" > .env
    fi
    echo -e "  ${GREEN}✓${NC} Archivo .env creado"
else
    echo -e "  ${GREEN}✓${NC} Archivo .env ya existe"
    # Actualizar VITE_API_URL si es necesario
    if [ -n "$DOMAIN" ]; then
        sed -i "s|VITE_API_URL=.*|VITE_API_URL=https://$DOMAIN/api|g" .env
    elif [ -n "$IP_ADDRESS" ]; then
        sed -i "s|VITE_API_URL=.*|VITE_API_URL=http://$IP_ADDRESS:3001/api|g" .env
    fi
fi

# Compilar frontend
echo "  → Compilando frontend..."
npm run build > /dev/null 2>&1

echo -e "${GREEN}✅ Frontend configurado${NC}"
echo ""

# ============================================
# PASO 6: Configurar PM2
# ============================================
echo -e "${BLUE}🚀 Paso 6: Configurando PM2...${NC}"

cd "$APP_DIR/backend"

# Detener proceso anterior si existe
pm2 delete sgst-backend 2>/dev/null || true

# Iniciar backend
echo "  → Iniciando backend con PM2..."
pm2 start dist/index.js --name sgst-backend --silent
pm2 save --silent

# Configurar PM2 para iniciar al arrancar
echo "  → Configurando inicio automático..."
STARTUP_CMD=$(pm2 startup | grep -v "PM2" | tail -1)
if [ -n "$STARTUP_CMD" ]; then
    eval $STARTUP_CMD > /dev/null 2>&1 || true
fi

echo -e "${GREEN}✅ PM2 configurado${NC}"
echo ""

# ============================================
# PASO 7: Configurar Nginx
# ============================================
echo -e "${BLUE}🌐 Paso 7: Configurando Nginx...${NC}"

# Crear configuración de Nginx
NGINX_CONFIG="/etc/nginx/sites-available/sgst"

if [ -n "$DOMAIN" ]; then
    SERVER_NAME="$DOMAIN www.$DOMAIN"
else
    SERVER_NAME="_"
fi

sudo tee "$NGINX_CONFIG" > /dev/null << EOF
server {
    listen 80;
    server_name $SERVER_NAME;
    client_max_body_size 50M;

    root $APP_DIR/frontend/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)\$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    access_log /var/log/nginx/sgst-access.log;
    error_log /var/log/nginx/sgst-error.log;
}
EOF

# Habilitar sitio
sudo ln -sf "$NGINX_CONFIG" /etc/nginx/sites-enabled/sgst

# Eliminar sitio por defecto si existe
sudo rm -f /etc/nginx/sites-enabled/default

# Verificar configuración
if sudo nginx -t > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} Configuración de Nginx válida"
    sudo systemctl restart nginx
    sudo systemctl enable nginx > /dev/null 2>&1
    echo -e "  ${GREEN}✓${NC} Nginx reiniciado"
else
    echo -e "  ${RED}✗${NC} Error en configuración de Nginx"
    sudo nginx -t
    exit 1
fi

echo -e "${GREEN}✅ Nginx configurado${NC}"
echo ""

# ============================================
# PASO 8: Verificaciones finales
# ============================================
echo -e "${BLUE}✅ Paso 8: Verificando instalación...${NC}"

# Verificar PM2
if pm2 list | grep -q "sgst-backend.*online"; then
    echo -e "  ${GREEN}✓${NC} Backend corriendo en PM2"
else
    echo -e "  ${RED}✗${NC} Backend no está corriendo"
fi

# Verificar Nginx
if sudo systemctl is-active --quiet nginx; then
    echo -e "  ${GREEN}✓${NC} Nginx está corriendo"
else
    echo -e "  ${RED}✗${NC} Nginx no está corriendo"
fi

# Verificar PostgreSQL
if sudo systemctl is-active --quiet postgresql; then
    echo -e "  ${GREEN}✓${NC} PostgreSQL está corriendo"
else
    echo -e "  ${RED}✗${NC} PostgreSQL no está corriendo"
fi

# Verificar que el backend responde
sleep 2
if curl -s http://localhost:3001/api > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} Backend responde en puerto 3001"
else
    echo -e "  ${YELLOW}⚠${NC}  Backend no responde (puede estar iniciando)"
fi

# Verificar que Nginx sirve el frontend
if curl -s http://localhost > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} Nginx sirve el frontend"
else
    echo -e "  ${YELLOW}⚠${NC}  Nginx no responde"
fi

echo ""

# ============================================
# RESUMEN FINAL
# ============================================
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅ Despliegue Completado            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📋 Información importante:${NC}"
echo ""
echo -e "  ${YELLOW}📍 URL de la aplicación:${NC}"
if [ -n "$DOMAIN" ]; then
    echo -e "     http://$DOMAIN"
else
    echo -e "     http://$IP_ADDRESS"
fi
echo ""
echo -e "  ${YELLOW}🔐 Credenciales de base de datos:${NC}"
echo -e "     Usuario: sgst_user"
echo -e "     Contraseña: $DB_PASSWORD"
echo -e "     Base de datos: sgst_db"
echo ""
echo -e "  ${YELLOW}📁 Ubicación de archivos:${NC}"
echo -e "     Código: $APP_DIR"
echo -e "     Backend .env: $APP_DIR/backend/.env"
echo -e "     Frontend .env: $APP_DIR/frontend/.env"
echo ""
echo -e "  ${YELLOW}🔧 Comandos útiles:${NC}"
echo -e "     Ver logs del backend: ${GREEN}pm2 logs sgst-backend${NC}"
echo -e "     Reiniciar backend: ${GREEN}pm2 restart sgst-backend${NC}"
echo -e "     Ver estado PM2: ${GREEN}pm2 status${NC}"
echo -e "     Ver logs de Nginx: ${GREEN}sudo tail -f /var/log/nginx/error.log${NC}"
echo ""
echo -e "  ${YELLOW}⚠️  Próximos pasos:${NC}"
echo -e "     1. Configura el firewall de Google Cloud para permitir tráfico HTTP (puerto 80)"
echo -e "     2. Si tienes dominio, configura SSL con Let's Encrypt:"
echo -e "        ${GREEN}sudo apt install certbot python3-certbot-nginx${NC}"
echo -e "        ${GREEN}sudo certbot --nginx -d $DOMAIN${NC}"
echo ""
echo -e "${GREEN}🎉 ¡Tu aplicación está lista!${NC}"

