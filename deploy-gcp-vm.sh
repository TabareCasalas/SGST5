#!/bin/bash

# ============================================
# Script de Deployment Automatizado para SGST
# Google Cloud Platform - Ubuntu VM
# ============================================

set -e  # Salir si hay algún error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Variables globales
APP_NAME="sgst"
APP_DIR="/var/www/$APP_NAME"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"

# Usar directorio de log en home si no se puede escribir en /var/log
LOG_FILE="/var/log/sgst-deploy.log"
if ! touch "$LOG_FILE" 2>/dev/null; then
    LOG_FILE="$HOME/sgst-deploy.log"
    touch "$LOG_FILE" 2>/dev/null || LOG_FILE=""
fi

# Función para logging
log() {
    echo -e "$1"
    if [ -n "$LOG_FILE" ] && [ -w "$(dirname "$LOG_FILE")" ] 2>/dev/null; then
        echo -e "$1" >> "$LOG_FILE" 2>/dev/null || true
    fi
}

# Función para mostrar secciones
section() {
    echo ""
    log "${CYAN}========================================${NC}"
    log "${CYAN}$1${NC}"
    log "${CYAN}========================================${NC}"
}

# Función para verificar si un comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Función para obtener la IP pública
get_public_ip() {
    curl -s ifconfig.me || curl -s icanhazip.com || echo "unknown"
}

# Iniciar logging
log "${GREEN}Iniciando deployment de SGST - $(date)${NC}"
log "${BLUE}Log file: $LOG_FILE${NC}"

# ============================================
# VERIFICACIÓN PREVIA: Permisos sudo
# ============================================
section "Verificando permisos"

log "${BLUE}Verificando permisos sudo...${NC}"
if ! sudo -n true 2>/dev/null; then
    # Intentar con prompt
    if ! sudo -v 2>/dev/null; then
        log "${RED}✗ ERROR: No tienes permisos sudo${NC}"
        log ""
        log "${YELLOW}Este script requiere permisos de administrador (sudo) para:${NC}"
        log "  - Instalar paquetes del sistema (Node.js, PostgreSQL, Nginx, etc.)"
        log "  - Configurar servicios del sistema"
        log "  - Crear directorios en /var/www/"
        log "  - Configurar Nginx y PostgreSQL"
        log ""
        log "${CYAN}Soluciones:${NC}"
        log "  1. Verifica que tu usuario tenga permisos sudo: ${YELLOW}sudo whoami${NC}"
        log "  2. Si no tienes sudo, consulta: ${YELLOW}SOLUCION_PERMISOS_SUDO.md${NC}"
        log "  3. O recrea la VM usando el usuario por defecto de Google Cloud"
        log ""
        log "${RED}El script no puede continuar sin permisos sudo.${NC}"
        exit 1
    fi
fi

log "${GREEN}✓ Permisos sudo verificados${NC}"

# ============================================
# PASO 1: Verificar y actualizar sistema
# ============================================
section "Paso 1: Actualizando sistema"

log "${BLUE}Actualizando paquetes del sistema...${NC}"
sudo apt-get update -qq
sudo apt-get upgrade -y -qq

log "${GREEN}✓ Sistema actualizado${NC}"

# ============================================
# PASO 2: Instalar dependencias del sistema
# ============================================
section "Paso 2: Instalando dependencias del sistema"

# Instalar herramientas básicas
log "${BLUE}Instalando herramientas básicas...${NC}"
sudo apt-get install -y -qq curl wget build-essential software-properties-common

# Instalar Git (si no está instalado)
if ! command_exists git; then
    log "${BLUE}Instalando Git...${NC}"
    sudo apt-get install -y -qq git
    log "${GREEN}✓ Git instalado${NC}"
else
    log "${GREEN}✓ Git ya está instalado: $(git --version)${NC}"
fi

# Instalar Node.js 18.x
if ! command_exists node; then
    log "${BLUE}Instalando Node.js 18.x...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y -qq nodejs
    log "${GREEN}✓ Node.js $(node --version) instalado${NC}"
else
    log "${GREEN}✓ Node.js ya está instalado: $(node --version)${NC}"
fi

# Instalar PostgreSQL
if ! command_exists psql; then
    log "${BLUE}Instalando PostgreSQL...${NC}"
    sudo apt-get install -y -qq postgresql postgresql-contrib
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    log "${GREEN}✓ PostgreSQL instalado${NC}"
else
    log "${GREEN}✓ PostgreSQL ya está instalado${NC}"
    sudo systemctl start postgresql || true
fi

# Instalar Nginx
if ! command_exists nginx; then
    log "${BLUE}Instalando Nginx...${NC}"
    sudo apt-get install -y -qq nginx
    sudo systemctl start nginx
    sudo systemctl enable nginx
    log "${GREEN}✓ Nginx instalado${NC}"
else
    log "${GREEN}✓ Nginx ya está instalado${NC}"
    sudo systemctl start nginx || true
fi

# Instalar PM2 globalmente
if ! command_exists pm2; then
    log "${BLUE}Instalando PM2...${NC}"
    sudo npm install -g pm2
    log "${GREEN}✓ PM2 instalado${NC}"
else
    log "${GREEN}✓ PM2 ya está instalado${NC}"
fi

log "${GREEN}✓ Todas las dependencias instaladas${NC}"

# ============================================
# PASO 3: Configurar PostgreSQL
# ============================================
section "Paso 3: Configurando PostgreSQL"

# Solicitar contraseña de PostgreSQL
if [ -z "$DB_PASSWORD" ]; then
    read -sp "Ingresa la contraseña para PostgreSQL (sgst_user) [Enter para usar 'sgst_password']: " DB_PASSWORD
    echo ""
    if [ -z "$DB_PASSWORD" ]; then
        DB_PASSWORD="sgst_password"
    fi
fi

# Crear base de datos y usuario
log "${BLUE}Configurando base de datos...${NC}"

# Asegurar que PostgreSQL está corriendo
sudo systemctl start postgresql || true
sleep 2

sudo -u postgres psql << EOSQL > /dev/null 2>&1 || true
DROP DATABASE IF EXISTS sgst_db;
DROP USER IF EXISTS sgst_user;
CREATE USER sgst_user WITH PASSWORD '$DB_PASSWORD';
CREATE DATABASE sgst_db OWNER sgst_user;
GRANT ALL PRIVILEGES ON DATABASE sgst_db TO sgst_user;
ALTER USER sgst_user CREATEDB;
EOSQL

# Configurar PostgreSQL para aceptar conexiones locales
# Esperar un momento para que PostgreSQL termine de inicializarse
sleep 2
sudo systemctl start postgresql || true
sudo sed -i "s/#listen_addresses = 'localhost'/listen_addresses = 'localhost'/" /etc/postgresql/*/main/postgresql.conf 2>/dev/null || true

log "${GREEN}✓ PostgreSQL configurado${NC}"

# ============================================
# PASO 4: Preparar directorio de la aplicación
# ============================================
section "Paso 4: Preparando directorio de la aplicación"

# Crear directorio si no existe
sudo mkdir -p "$APP_DIR"
sudo chown -R $USER:$USER "$APP_DIR"

# URL del repositorio por defecto
DEFAULT_REPO_URL="https://github.com/TabareCasalas/SGST5"

# Verificar que Git está instalado antes de continuar
if ! command_exists git; then
    log "${RED}Error: Git no está instalado${NC}"
    log "${BLUE}Instalando Git...${NC}"
    sudo apt-get update -qq
    sudo apt-get install -y -qq git || {
        log "${RED}Error: No se pudo instalar Git${NC}"
        exit 1
    }
    log "${GREEN}✓ Git instalado${NC}"
fi

# Detectar si estamos en un directorio de proyecto Git
CURRENT_DIR=$(pwd)
if [ -d "$CURRENT_DIR/.git" ] && [ -f "$CURRENT_DIR/backend/package.json" ]; then
    log "${GREEN}✓ Proyecto Git detectado en el directorio actual${NC}"
    log "${BLUE}Copiando proyecto a $APP_DIR...${NC}"
    # Copiar el proyecto al directorio de destino
    cp -r "$CURRENT_DIR"/* "$APP_DIR"/ 2>/dev/null || true
    cp -r "$CURRENT_DIR"/.* "$APP_DIR"/ 2>/dev/null || true
    cd "$APP_DIR"
elif [ -d "$APP_DIR/.git" ]; then
    log "${YELLOW}Proyecto existente detectado en $APP_DIR. Actualizando...${NC}"
    cd "$APP_DIR"
    git pull || log "${YELLOW}Advertencia: No se pudo actualizar desde git${NC}"
else
    # Solicitar información sobre el repositorio
    read -p "¿Clonar desde Git? (s/n) [s]: " tiene_repo
    tiene_repo=${tiene_repo:-s}
    
    if [ "$tiene_repo" = "s" ] || [ "$tiene_repo" = "S" ]; then
        read -p "URL del repositorio Git [$DEFAULT_REPO_URL]: " REPO_URL
        REPO_URL=${REPO_URL:-$DEFAULT_REPO_URL}
        log "${BLUE}Clonando repositorio desde $REPO_URL...${NC}"
        git clone "$REPO_URL" "$APP_DIR" || {
            log "${RED}Error: No se pudo clonar el repositorio${NC}"
            log "${YELLOW}Verifica que tengas acceso al repositorio${NC}"
            exit 1
        }
        cd "$APP_DIR"
    else
        log "${YELLOW}No se clonará desde Git. Asegúrate de copiar los archivos a $APP_DIR${NC}"
        log "${YELLOW}Presiona Enter cuando hayas copiado los archivos...${NC}"
        read
        cd "$APP_DIR"
    fi
fi

log "${GREEN}✓ Directorio de aplicación preparado${NC}"

# ============================================
# PASO 5: Configurar variables de entorno
# ============================================
section "Paso 5: Configurando variables de entorno"

# Obtener IP pública o dominio
PUBLIC_IP=$(get_public_ip)
read -p "¿Tienes un dominio configurado? (s/n): " tiene_dominio
if [ "$tiene_dominio" = "s" ] || [ "$tiene_dominio" = "S" ]; then
    read -p "Ingresa tu dominio (ej: ejemplo.com): " DOMAIN
    API_URL="https://$DOMAIN/api"
    FRONTEND_URL="https://$DOMAIN"
else
    read -p "Ingresa la IP pública de la VM [$PUBLIC_IP]: " IP_INPUT
    if [ -n "$IP_INPUT" ]; then
        PUBLIC_IP="$IP_INPUT"
    fi
    API_URL="http://$PUBLIC_IP:3001/api"
    FRONTEND_URL="http://$PUBLIC_IP"
fi

# Generar secrets JWT
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Solicitar API key de Resend
read -p "Ingresa tu RESEND_API_KEY (o Enter para omitir): " RESEND_API_KEY
if [ -z "$RESEND_API_KEY" ]; then
    RESEND_API_KEY=""
    RESEND_FROM_EMAIL="onboarding@resend.dev"
else
    read -p "Ingresa el email de envío de Resend [onboarding@resend.dev]: " RESEND_FROM_EMAIL
    if [ -z "$RESEND_FROM_EMAIL" ]; then
        RESEND_FROM_EMAIL="onboarding@resend.dev"
    fi
fi

# Crear .env para backend
log "${BLUE}Creando backend/.env...${NC}"
# Configurar CORS origin
if [ -n "$DOMAIN" ]; then
    CORS_ORIGIN="https://$DOMAIN,http://$DOMAIN"
else
    CORS_ORIGIN="http://$PUBLIC_IP"
fi

cat > "$BACKEND_DIR/.env" << EOF
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://sgst_user:$DB_PASSWORD@localhost:5432/sgst_db
JWT_SECRET=$JWT_SECRET
REFRESH_SECRET=$REFRESH_SECRET
RESEND_API_KEY=$RESEND_API_KEY
RESEND_FROM_EMAIL=$RESEND_FROM_EMAIL
RESEND_FROM_NAME=SGST Sistema
CORS_ORIGIN=$CORS_ORIGIN
EOF

# Crear .env para frontend
log "${BLUE}Creando frontend/.env...${NC}"
cat > "$FRONTEND_DIR/.env" << EOF
VITE_API_URL=$API_URL
EOF

log "${GREEN}✓ Variables de entorno configuradas${NC}"

# ============================================
# PASO 6: Instalar dependencias y compilar
# ============================================
section "Paso 6: Instalando dependencias y compilando"

# Backend
log "${BLUE}Instalando dependencias del backend...${NC}"
cd "$BACKEND_DIR"
npm install --silent

log "${BLUE}Generando Prisma Client...${NC}"
npx prisma generate

log "${BLUE}Compilando backend...${NC}"
npm run build

log "${BLUE}Ejecutando migraciones de base de datos...${NC}"
npx prisma migrate deploy || {
    log "${YELLOW}Advertencia: Error en migraciones, reintentando...${NC}"
    sleep 3
    npx prisma migrate deploy
}

log "${GREEN}✓ Backend compilado y migraciones ejecutadas${NC}"

# Frontend
log "${BLUE}Instalando dependencias del frontend...${NC}"
cd "$FRONTEND_DIR"
npm install --silent

log "${BLUE}Compilando frontend...${NC}"
npm run build

log "${GREEN}✓ Frontend compilado${NC}"

# ============================================
# PASO 7: Configurar PM2
# ============================================
section "Paso 7: Configurando PM2"

cd "$BACKEND_DIR"

# Detener proceso anterior si existe
pm2 delete "$APP_NAME-backend" 2>/dev/null || true

# Iniciar backend con PM2
log "${BLUE}Iniciando backend con PM2...${NC}"
pm2 start dist/index.js --name "$APP_NAME-backend" --log-date-format="YYYY-MM-DD HH:mm:ss Z"

# Guardar configuración de PM2
pm2 save

# Configurar PM2 para iniciar al arrancar
log "${BLUE}Configurando inicio automático de PM2...${NC}"
STARTUP_CMD=$(pm2 startup | grep -v "PM2" | tail -1)
if [ -n "$STARTUP_CMD" ]; then
    eval $STARTUP_CMD > /dev/null 2>&1 || true
fi

log "${GREEN}✓ PM2 configurado${NC}"

# ============================================
# PASO 8: Configurar Nginx
# ============================================
section "Paso 8: Configurando Nginx"

NGINX_CONFIG="/etc/nginx/sites-available/$APP_NAME"

if [ -n "$DOMAIN" ]; then
    SERVER_NAME="$DOMAIN www.$DOMAIN"
else
    SERVER_NAME="_"
fi

log "${BLUE}Creando configuración de Nginx...${NC}"
sudo tee "$NGINX_CONFIG" > /dev/null << EOFNGINX
server {
    listen 80;
    server_name $SERVER_NAME;
    client_max_body_size 50M;

    root $FRONTEND_DIR/dist;
    index index.html;

    # Logs
    access_log /var/log/nginx/$APP_NAME-access.log;
    error_log /var/log/nginx/$APP_NAME-error.log;

    # Frontend - SPA
    location / {
        try_files \$uri \$uri/ /index.html;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
    }

    # Backend API
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

    # Archivos estáticos con cache
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Compresión gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;
}
EOFNGINX

# Habilitar sitio
sudo ln -sf "$NGINX_CONFIG" /etc/nginx/sites-enabled/$APP_NAME

# Eliminar sitio por defecto si existe
sudo rm -f /etc/nginx/sites-enabled/default

# Verificar y reiniciar Nginx
log "${BLUE}Verificando configuración de Nginx...${NC}"
if sudo nginx -t; then
    sudo systemctl restart nginx
    sudo systemctl enable nginx
    log "${GREEN}✓ Nginx configurado y reiniciado${NC}"
else
    log "${RED}Error: Configuración de Nginx inválida${NC}"
    exit 1
fi

# ============================================
# PASO 9: Configurar firewall de Google Cloud
# ============================================
section "Paso 9: Configurando firewall"

log "${BLUE}Configurando firewall local (ufw)...${NC}"
sudo ufw --force enable || true
sudo ufw allow 22/tcp  # SSH
sudo ufw allow 80/tcp  # HTTP
sudo ufw allow 443/tcp # HTTPS

log "${YELLOW}IMPORTANTE: Configura las reglas de firewall en Google Cloud Console:${NC}"
log "${YELLOW}  - Permitir tráfico HTTP (puerto 80)${NC}"
log "${YELLOW}  - Permitir tráfico HTTPS (puerto 443)${NC}"
log "${YELLOW}  - Permitir tráfico SSH (puerto 22)${NC}"
log ""
log "${YELLOW}O ejecuta estos comandos en tu máquina local (con gcloud CLI):${NC}"
log "${CYAN}  gcloud compute firewall-rules create allow-http --allow tcp:80 --source-ranges 0.0.0.0/0 --description 'Allow HTTP traffic'${NC}"
log "${CYAN}  gcloud compute firewall-rules create allow-https --allow tcp:443 --source-ranges 0.0.0.0/0 --description 'Allow HTTPS traffic'${NC}"

# ============================================
# PASO 10: Verificaciones finales
# ============================================
section "Paso 10: Verificando instalación"

sleep 3  # Esperar a que los servicios inicien

# Verificar PM2
if pm2 list | grep -q "$APP_NAME-backend.*online"; then
    log "${GREEN}✓ Backend corriendo en PM2${NC}"
else
    log "${RED}✗ Backend no está corriendo${NC}"
    pm2 logs "$APP_NAME-backend" --lines 20
fi

# Verificar Nginx
if sudo systemctl is-active --quiet nginx; then
    log "${GREEN}✓ Nginx está corriendo${NC}"
else
    log "${RED}✗ Nginx no está corriendo${NC}"
fi

# Verificar PostgreSQL
if sudo systemctl is-active --quiet postgresql; then
    log "${GREEN}✓ PostgreSQL está corriendo${NC}"
else
    log "${RED}✗ PostgreSQL no está corriendo${NC}"
fi

# Verificar que el backend responde
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    log "${GREEN}✓ Backend responde en puerto 3001${NC}"
else
    log "${YELLOW}⚠ Backend no responde (puede estar iniciando)${NC}"
fi

# Verificar que Nginx sirve el frontend
if curl -s http://localhost > /dev/null 2>&1; then
    log "${GREEN}✓ Nginx sirve el frontend${NC}"
else
    log "${YELLOW}⚠ Nginx no responde${NC}"
fi

# ============================================
# RESUMEN FINAL
# ============================================
section "Despliegue Completado"

log "${GREEN}✓✓✓ Tu aplicación está lista! ✓✓✓${NC}"
echo ""
log "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
log "${CYAN}  INFORMACIÓN IMPORTANTE${NC}"
log "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
log "${YELLOW}URL de la aplicación:${NC}"
if [ -n "$DOMAIN" ]; then
    log "  ${GREEN}http://$DOMAIN${NC}"
else
    log "  ${GREEN}$FRONTEND_URL${NC}"
fi
echo ""
log "${YELLOW}Credenciales de base de datos:${NC}"
log "  Usuario: ${CYAN}sgst_user${NC}"
log "  Contraseña: ${CYAN}$DB_PASSWORD${NC}"
log "  Base de datos: ${CYAN}sgst_db${NC}"
echo ""
log "${YELLOW}Comandos útiles:${NC}"
log "  Ver logs del backend: ${CYAN}pm2 logs $APP_NAME-backend${NC}"
log "  Reiniciar backend: ${CYAN}pm2 restart $APP_NAME-backend${NC}"
log "  Ver estado PM2: ${CYAN}pm2 status${NC}"
log "  Ver logs de Nginx: ${CYAN}sudo tail -f /var/log/nginx/$APP_NAME-error.log${NC}"
log "  Ver logs de acceso: ${CYAN}sudo tail -f /var/log/nginx/$APP_NAME-access.log${NC}"
echo ""

if [ -n "$DOMAIN" ]; then
    log "${YELLOW}Próximos pasos (SSL con Let's Encrypt):${NC}"
    log "  1. Instalar Certbot: ${CYAN}sudo apt install certbot python3-certbot-nginx${NC}"
    log "  2. Obtener certificado: ${CYAN}sudo certbot --nginx -d $DOMAIN${NC}"
    log "  3. El certificado se renovará automáticamente"
    echo ""
fi

log "${YELLOW}Archivo de log completo:${NC} $LOG_FILE"
if [ "$LOG_FILE" != "/var/log/sgst-deploy.log" ]; then
    log "${YELLOW}Nota: El log se guardó en $LOG_FILE (no se pudo escribir en /var/log)${NC}"
fi
echo ""
log "${GREEN}¡Despliegue completado exitosamente!${NC}"

