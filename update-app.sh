#!/bin/bash

# ============================================
# Script de Actualización Rápida de SGST
# Para actualizar la aplicación después del despliegue inicial
# ============================================

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

APP_NAME="sgst"
APP_DIR="/var/www/$APP_NAME"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"

log() {
    echo -e "$1"
}

section() {
    echo ""
    log "${CYAN}========================================${NC}"
    log "${CYAN}$1${NC}"
    log "${CYAN}========================================${NC}"
}

# Verificar que estamos en el directorio correcto
if [ ! -d "$BACKEND_DIR" ] || [ ! -d "$FRONTEND_DIR" ]; then
    log "${RED}Error: No se encontró el proyecto en $APP_DIR${NC}"
    log "${YELLOW}Ejecuta este script desde la VM donde está desplegada la aplicación${NC}"
    exit 1
fi

section "Actualizando aplicación SGST"

# Actualizar código desde Git (si existe)
cd "$APP_DIR"
if [ -d ".git" ]; then
    log "${BLUE}Actualizando código desde Git...${NC}"
    git pull || log "${YELLOW}Advertencia: No se pudo actualizar desde Git${NC}"
else
    log "${YELLOW}No se detectó repositorio Git. Asegúrate de actualizar los archivos manualmente.${NC}"
fi

# Actualizar Backend
section "Actualizando Backend"

cd "$BACKEND_DIR"
log "${BLUE}Instalando dependencias del backend...${NC}"
npm install --silent

log "${BLUE}Generando Prisma Client...${NC}"
npx prisma generate

log "${BLUE}Compilando backend...${NC}"
npm run build

log "${BLUE}Ejecutando migraciones...${NC}"
npx prisma migrate deploy || {
    log "${YELLOW}Advertencia: Error en migraciones${NC}"
}

log "${BLUE}Reiniciando backend...${NC}"
pm2 restart "$APP_NAME-backend"

log "${GREEN}✓ Backend actualizado${NC}"

# Actualizar Frontend
section "Actualizando Frontend"

cd "$FRONTEND_DIR"
log "${BLUE}Instalando dependencias del frontend...${NC}"
npm install --silent

log "${BLUE}Compilando frontend...${NC}"
npm run build

log "${BLUE}Recargando Nginx...${NC}"
sudo systemctl reload nginx

log "${GREEN}✓ Frontend actualizado${NC}"

# Verificaciones
section "Verificando actualización"

sleep 2

if pm2 list | grep -q "$APP_NAME-backend.*online"; then
    log "${GREEN}✓ Backend está corriendo${NC}"
else
    log "${RED}✗ Backend no está corriendo${NC}"
    log "${YELLOW}Revisa los logs: pm2 logs $APP_NAME-backend${NC}"
fi

if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    log "${GREEN}✓ Backend responde correctamente${NC}"
else
    log "${YELLOW}⚠ Backend no responde (puede estar iniciando)${NC}"
fi

section "Actualización completada"

log "${GREEN}✓✓✓ Aplicación actualizada exitosamente! ✓✓✓${NC}"
log ""
log "${CYAN}Comandos útiles:${NC}"
log "  Ver logs: ${YELLOW}pm2 logs $APP_NAME-backend${NC}"
log "  Ver estado: ${YELLOW}pm2 status${NC}"

