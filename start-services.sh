#!/bin/bash

# ============================================
# Script para iniciar servicios después de reiniciar la VM
# Uso: ./start-services.sh
# ============================================

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  Iniciando Servicios de SGST${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# Detectar directorio del proyecto
APP_DIR="/var/www/sgst"
if [ ! -d "$APP_DIR" ]; then
    echo -e "${RED}Error: No se encontró el proyecto en $APP_DIR${NC}"
    exit 1
fi

cd "$APP_DIR"

# Preguntar si quiere actualizar el código
echo -e "${YELLOW}¿Quieres actualizar el código desde Git? (s/n) [s]:${NC} "
read -r actualizar_codigo
actualizar_codigo=${actualizar_codigo:-s}

if [ "$actualizar_codigo" = "s" ] || [ "$actualizar_codigo" = "S" ]; then
    echo -e "${BLUE}0. Actualizando código desde Git...${NC}"
    if [ -d ".git" ]; then
        git pull || {
            echo -e "  ${YELLOW}⚠${NC} Error al hacer git pull, continuando con el código actual..."
        }
        echo -e "  ${GREEN}✓${NC} Código actualizado"
        
        # Preguntar si quiere recompilar
        echo -e "${YELLOW}¿Quieres recompilar backend y frontend? (s/n) [s]:${NC} "
        read -r recompilar
        recompilar=${recompilar:-s}
        
        if [ "$recompilar" = "s" ] || [ "$recompilar" = "S" ]; then
            echo -e "${BLUE}  → Recompilando backend...${NC}"
            cd "$APP_DIR/backend"
            npm install --silent
            npm run build
            npx prisma generate
            npx prisma migrate deploy || true
            echo -e "  ${GREEN}✓${NC} Backend recompilado"
            
            echo -e "${BLUE}  → Recompilando frontend...${NC}"
            cd "$APP_DIR/frontend"
            npm install --silent
            npm run build
            echo -e "  ${GREEN}✓${NC} Frontend recompilado"
        fi
    else
        echo -e "  ${YELLOW}⚠${NC} No se encontró repositorio Git en $APP_DIR"
    fi
    echo ""
fi

# 1. Iniciar PostgreSQL
echo -e "${BLUE}1. Iniciando PostgreSQL...${NC}"
if sudo systemctl is-active --quiet postgresql; then
    echo -e "  ${GREEN}✓${NC} PostgreSQL ya está corriendo"
else
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    echo -e "  ${GREEN}✓${NC} PostgreSQL iniciado"
fi

# 2. Verificar que PM2 está instalado
echo -e "${BLUE}2. Verificando PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    echo -e "  ${YELLOW}⚠${NC} PM2 no está instalado, instalando..."
    sudo npm install -g pm2
fi

# 3. Iniciar backend con PM2
echo -e "${BLUE}3. Iniciando Backend con PM2...${NC}"
cd "$APP_DIR/backend"

# Verificar si el proceso ya existe
if pm2 list | grep -q "sgst-backend"; then
    echo -e "  ${YELLOW}⚠${NC} Proceso sgst-backend ya existe, reiniciando..."
    pm2 restart sgst-backend
else
    # Verificar que el build existe
    if [ ! -f "dist/index.js" ]; then
        echo -e "  ${YELLOW}⚠${NC} No se encontró dist/index.js, compilando..."
        npm run build
        npx prisma generate
    fi
    
    echo -e "  ${BLUE}→${NC} Iniciando backend..."
    pm2 start dist/index.js --name sgst-backend
    pm2 save
fi

# Configurar PM2 para iniciar al arrancar (por si acaso)
echo -e "  ${BLUE}→${NC} Configurando inicio automático de PM2..."
STARTUP_CMD=$(pm2 startup | grep -v "PM2" | tail -1)
if [ -n "$STARTUP_CMD" ]; then
    eval $STARTUP_CMD > /dev/null 2>&1 || true
fi

echo -e "  ${GREEN}✓${NC} Backend iniciado"

# 4. Iniciar Nginx
echo -e "${BLUE}4. Iniciando Nginx...${NC}"
if sudo systemctl is-active --quiet nginx; then
    echo -e "  ${GREEN}✓${NC} Nginx ya está corriendo"
else
    sudo systemctl start nginx
    sudo systemctl enable nginx
    echo -e "  ${GREEN}✓${NC} Nginx iniciado"
fi

# 5. Verificaciones
echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  Verificando Servicios${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# Verificar PostgreSQL
if sudo systemctl is-active --quiet postgresql; then
    echo -e "  ${GREEN}✓${NC} PostgreSQL está corriendo"
else
    echo -e "  ${RED}✗${NC} PostgreSQL NO está corriendo"
fi

# Verificar PM2
if pm2 list | grep -q "sgst-backend.*online"; then
    echo -e "  ${GREEN}✓${NC} Backend está corriendo en PM2"
else
    echo -e "  ${RED}✗${NC} Backend NO está corriendo"
    echo -e "  ${YELLOW}→${NC} Revisa los logs: ${YELLOW}pm2 logs sgst-backend${NC}"
fi

# Verificar Nginx
if sudo systemctl is-active --quiet nginx; then
    echo -e "  ${GREEN}✓${NC} Nginx está corriendo"
else
    echo -e "  ${RED}✗${NC} Nginx NO está corriendo"
fi

# Verificar que el backend responde
sleep 2
if curl -s http://localhost:3001 > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} Backend responde en puerto 3001"
else
    echo -e "  ${YELLOW}⚠${NC} Backend no responde aún (puede estar iniciando)"
fi

# Verificar que Nginx sirve el frontend
if curl -s http://localhost > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} Nginx sirve el frontend"
else
    echo -e "  ${YELLOW}⚠${NC} Nginx no responde"
fi

echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${GREEN}  Servicios Iniciados${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo -e "${BLUE}Comandos útiles:${NC}"
echo "  Ver estado PM2: ${YELLOW}pm2 status${NC}"
echo "  Ver logs backend: ${YELLOW}pm2 logs sgst-backend${NC}"
echo "  Reiniciar backend: ${YELLOW}pm2 restart sgst-backend${NC}"
echo "  Ver estado servicios: ${YELLOW}sudo systemctl status postgresql nginx${NC}"
echo ""
echo -e "${BLUE}URL de la aplicación:${NC}"
echo "  ${YELLOW}http://136.114.51.212${NC}"
echo ""

