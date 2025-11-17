#!/bin/bash

# Script para completar el despliegue desde el Paso 5 en adelante
# Uso: ./deploy-resto-simple.sh

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "========================================"
echo "  Completando Despliegue de SGST"
echo "========================================"
echo ""

# Detectar directorio del proyecto
if [ -f "backend/package.json" ]; then
    APP_DIR=$(pwd)
elif [ -d "/var/www/sgst" ] && [ -f "/var/www/sgst/backend/package.json" ]; then
    APP_DIR="/var/www/sgst"
    cd "$APP_DIR"
elif [ -d "$HOME/sgst" ] && [ -f "$HOME/sgst/backend/package.json" ]; then
    APP_DIR="$HOME/sgst"
    cd "$APP_DIR"
else
    echo -e "${RED}Error: No se encontro el proyecto${NC}"
    exit 1
fi

echo -e "${GREEN}OK${NC} Usando directorio: $APP_DIR"
echo ""

# Solicitar informacion
echo -e "${YELLOW}Necesito algunos datos:${NC}"
read -p "Tienes un dominio? (s/n): " tiene_dominio
if [ "$tiene_dominio" = "s" ] || [ "$tiene_dominio" = "S" ]; then
    read -p "Ingresa tu dominio (ej: ejemplo.com): " DOMAIN
    API_URL="https://$DOMAIN/api"
else
    read -p "Ingresa la IP publica de la VM [136.114.51.212]: " IP_ADDRESS
    if [ -z "$IP_ADDRESS" ]; then
        IP_ADDRESS="136.114.51.212"
    fi
    API_URL="http://$IP_ADDRESS:3001/api"
fi

read -p "Quieres usar la contrasena por defecto para PostgreSQL? (s/n): " usar_pass_default
if [ "$usar_pass_default" != "s" ] && [ "$usar_pass_default" != "S" ]; then
    read -sp "Ingresa la contrasena para PostgreSQL (sgst_user): " DB_PASSWORD
    echo ""
else
    DB_PASSWORD="sgst_password"
fi

echo ""

# Verificar y corregir credenciales de PostgreSQL
echo -e "${BLUE}Paso 4.5: Verificando credenciales de PostgreSQL...${NC}"

# Verificar que la base de datos existe
if ! sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw sgst_db; then
    echo "  -> Creando base de datos sgst_db..."
    sudo -u postgres psql -c "CREATE DATABASE sgst_db;" > /dev/null 2>&1
fi

# Recrear usuario con la contrasena correcta
echo "  -> Configurando usuario sgst_user..."
sudo -u postgres psql << EOSQL > /dev/null 2>&1
DROP USER IF EXISTS sgst_user;
CREATE USER sgst_user WITH PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE sgst_db TO sgst_user;
ALTER USER sgst_user CREATEDB;
EOSQL

echo -e "  ${GREEN}OK${NC} Credenciales de PostgreSQL configuradas"
echo ""

# Configurar Variables de Entorno
echo -e "${BLUE}Paso 5: Configurando Variables de Entorno...${NC}"

# Backend .env
cd "$APP_DIR/backend"
if [ ! -f ".env" ]; then
    echo "  -> Creando backend/.env..."
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    
    cat > .env << EOFENV
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://sgst_user:$DB_PASSWORD@localhost:5432/sgst_db
JWT_SECRET=$JWT_SECRET
REFRESH_SECRET=$REFRESH_SECRET
RESEND_API_KEY=re_KYkV3qCv_4NjgbTVBRAARrktSrLfGp6jC
EOFENV
    echo -e "  ${GREEN}OK${NC} backend/.env creado"
else
    echo -e "  ${GREEN}OK${NC} backend/.env ya existe"
    # Actualizar DATABASE_URL
    sed -i "s|DATABASE_URL=.*|DATABASE_URL=postgresql://sgst_user:$DB_PASSWORD@localhost:5432/sgst_db|g" .env
    echo -e "  ${GREEN}OK${NC} DATABASE_URL actualizado"
fi

# Frontend .env
cd "$APP_DIR/frontend"
if [ ! -f ".env" ]; then
    echo "  -> Creando frontend/.env..."
    echo "VITE_API_URL=$API_URL" > .env
    echo -e "  ${GREEN}OK${NC} frontend/.env creado"
else
    echo -e "  ${GREEN}OK${NC} frontend/.env ya existe"
    sed -i "s|VITE_API_URL=.*|VITE_API_URL=$API_URL|g" .env
    echo -e "  ${GREEN}OK${NC} VITE_API_URL actualizado"
fi

echo -e "${GREEN}OK${NC} Variables de entorno configuradas"
echo ""

# Instalar Dependencias y Compilar
echo -e "${BLUE}Paso 6: Instalando Dependencias y Compilando...${NC}"

# Backend
echo "  -> Backend: Instalando dependencias..."
cd "$APP_DIR/backend"
npm install --silent

# Asegurar que el .env tiene la contrasena correcta
if [ -f ".env" ]; then
    sed -i "s|DATABASE_URL=.*|DATABASE_URL=postgresql://sgst_user:$DB_PASSWORD@localhost:5432/sgst_db|g" .env
fi

echo "  -> Backend: Compilando..."
npm run build > /dev/null 2>&1
echo "  -> Backend: Generando Prisma Client..."
npx prisma generate > /dev/null 2>&1
echo "  -> Backend: Ejecutando migraciones..."
if ! npx prisma migrate deploy > /dev/null 2>&1; then
    echo -e "  ${YELLOW}Advertencia${NC} Error en migraciones, reintentando..."
    sleep 2
    npx prisma migrate deploy
fi
echo -e "  ${GREEN}OK${NC} Backend listo"

# Frontend
echo "  -> Frontend: Instalando dependencias..."
cd "$APP_DIR/frontend"
npm install --silent
echo "  -> Frontend: Compilando..."
npm run build > /dev/null 2>&1
echo -e "  ${GREEN}OK${NC} Frontend listo"

echo -e "${GREEN}OK${NC} Compilacion completada"
echo ""

# Configurar PM2
echo -e "${BLUE}Paso 7: Configurando PM2...${NC}"

cd "$APP_DIR/backend"

# Verificar si PM2 esta instalado
if ! command -v pm2 &> /dev/null; then
    echo "  -> Instalando PM2..."
    sudo npm install -g pm2 > /dev/null 2>&1
fi

# Detener proceso anterior si existe
pm2 delete sgst-backend 2>/dev/null || true

# Iniciar backend
echo "  -> Iniciando backend con PM2..."
pm2 start dist/index.js --name sgst-backend --silent
pm2 save --silent

# Configurar PM2 para iniciar al arrancar
echo "  -> Configurando inicio automatico..."
STARTUP_CMD=$(pm2 startup | grep -v "PM2" | tail -1)
if [ -n "$STARTUP_CMD" ]; then
    eval $STARTUP_CMD > /dev/null 2>&1 || true
fi

echo -e "${GREEN}OK${NC} PM2 configurado"
echo ""

# Configurar Nginx
echo -e "${BLUE}Paso 8: Configurando Nginx...${NC}"

# Verificar si Nginx esta instalado
if ! command -v nginx &> /dev/null; then
    echo "  -> Instalando Nginx..."
    sudo apt install -y nginx > /dev/null 2>&1
fi

# Crear configuracion de Nginx
NGINX_CONFIG="/etc/nginx/sites-available/sgst"

if [ -n "$DOMAIN" ]; then
    SERVER_NAME="$DOMAIN www.$DOMAIN"
else
    SERVER_NAME="_"
fi

sudo tee "$NGINX_CONFIG" > /dev/null << EOFNGINX
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
EOFNGINX

# Habilitar sitio
sudo ln -sf "$NGINX_CONFIG" /etc/nginx/sites-enabled/sgst

# Eliminar sitio por defecto si existe
sudo rm -f /etc/nginx/sites-enabled/default

# Verificar configuracion
if sudo nginx -t > /dev/null 2>&1; then
    echo -e "  ${GREEN}OK${NC} Configuracion de Nginx valida"
    sudo systemctl restart nginx
    sudo systemctl enable nginx > /dev/null 2>&1
    echo -e "  ${GREEN}OK${NC} Nginx reiniciado"
else
    echo -e "  ${RED}Error${NC} Error en configuracion de Nginx"
    sudo nginx -t
    exit 1
fi

echo -e "${GREEN}OK${NC} Nginx configurado"
echo ""

# Verificaciones finales
echo -e "${BLUE}Verificando instalacion...${NC}"

# Verificar PM2
if pm2 list | grep -q "sgst-backend.*online"; then
    echo -e "  ${GREEN}OK${NC} Backend corriendo en PM2"
else
    echo -e "  ${RED}Error${NC} Backend no esta corriendo"
fi

# Verificar Nginx
if sudo systemctl is-active --quiet nginx; then
    echo -e "  ${GREEN}OK${NC} Nginx esta corriendo"
else
    echo -e "  ${RED}Error${NC} Nginx no esta corriendo"
fi

# Verificar PostgreSQL
if sudo systemctl is-active --quiet postgresql; then
    echo -e "  ${GREEN}OK${NC} PostgreSQL esta corriendo"
else
    echo -e "  ${RED}Error${NC} PostgreSQL no esta corriendo"
fi

# Verificar que el backend responde
sleep 2
if curl -s http://localhost:3001/api > /dev/null 2>&1; then
    echo -e "  ${GREEN}OK${NC} Backend responde en puerto 3001"
else
    echo -e "  ${YELLOW}Advertencia${NC} Backend no responde (puede estar iniciando)"
fi

# Verificar que Nginx sirve el frontend
if curl -s http://localhost > /dev/null 2>&1; then
    echo -e "  ${GREEN}OK${NC} Nginx sirve el frontend"
else
    echo -e "  ${YELLOW}Advertencia${NC} Nginx no responde"
fi

echo ""

# Resumen final
echo "========================================"
echo "  Despliegue Completado"
echo "========================================"
echo ""
echo -e "${BLUE}Informacion importante:${NC}"
echo ""
echo -e "  ${YELLOW}URL de la aplicacion:${NC}"
if [ -n "$DOMAIN" ]; then
    echo "     http://$DOMAIN"
else
    echo "     http://$IP_ADDRESS"
fi
echo ""
echo -e "  ${YELLOW}Credenciales de base de datos:${NC}"
echo "     Usuario: sgst_user"
echo "     Contrasena: $DB_PASSWORD"
echo "     Base de datos: sgst_db"
echo ""
echo -e "  ${YELLOW}Comandos utiles:${NC}"
echo "     Ver logs del backend: pm2 logs sgst-backend"
echo "     Reiniciar backend: pm2 restart sgst-backend"
echo "     Ver estado PM2: pm2 status"
echo "     Ver logs de Nginx: sudo tail -f /var/log/nginx/error.log"
echo ""
echo -e "  ${YELLOW}Proximos pasos:${NC}"
echo "     1. Configura el firewall de Google Cloud para permitir trafico HTTP (puerto 80)"
echo "        gcloud compute firewall-rules create allow-http --allow tcp:80 --source-ranges 0.0.0.0/0"
if [ -n "$DOMAIN" ]; then
    echo "     2. Configura SSL con Let's Encrypt:"
    echo "        sudo apt install certbot python3-certbot-nginx"
    echo "        sudo certbot --nginx -d $DOMAIN"
fi
echo ""
echo -e "${GREEN}Tu aplicacion esta lista!${NC}"


