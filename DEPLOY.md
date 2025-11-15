# 🚀 Guía de Despliegue en Google Cloud VM (Ubuntu)

Esta guía te ayudará a desplegar la aplicación SGST en una VM de Google Cloud con Ubuntu.

## 📋 Requisitos Previos

- VM de Google Cloud con Ubuntu 20.04 o superior
- Acceso SSH a la VM
- Acceso al repositorio de GitHub: https://github.com/TabareCasalas/SGST5
- Dominio o IP pública (opcional, pero recomendado)

## 🔧 Paso 1: Conectarse a la VM

```bash
# Desde tu máquina local, conéctate a la VM
ssh usuario@IP_DE_LA_VM
# o si usas gcloud CLI:
gcloud compute ssh NOMBRE_DE_LA_VM --zone=ZONA
```

## 📦 Paso 2: Instalar Dependencias del Sistema

```bash
# Actualizar el sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 18.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar instalación
node --version  # Debe ser v18.x o superior
npm --version

# Instalar PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Instalar Nginx
sudo apt install -y nginx

# Instalar PM2 (gestor de procesos para Node.js)
sudo npm install -g pm2

# Instalar Git (si no está instalado)
sudo apt install -y git

# Instalar build-essential (necesario para compilar algunas dependencias)
sudo apt install -y build-essential
```

## 🗄️ Paso 3: Configurar PostgreSQL

```bash
# Cambiar al usuario postgres
sudo -u postgres psql

# Dentro de PostgreSQL, ejecutar:
CREATE DATABASE sgst_db;
CREATE USER sgst_user WITH PASSWORD 'sgst_password';
GRANT ALL PRIVILEGES ON DATABASE sgst_db TO sgst_user;
ALTER USER sgst_user CREATEDB;
\q

# Configurar PostgreSQL para aceptar conexiones locales
sudo nano /etc/postgresql/*/main/postgresql.conf
# Buscar y descomentar/modificar:
# listen_addresses = 'localhost'

# Configurar pg_hba.conf para permitir conexiones locales
sudo nano /etc/postgresql/*/main/pg_hba.conf
# Asegurarse de que hay una línea:
# local   all             all                                     md5

# Reiniciar PostgreSQL
sudo systemctl restart postgresql
sudo systemctl enable postgresql
```

## 📥 Paso 4: Clonar el Repositorio

```bash
# Crear directorio para la aplicación
sudo mkdir -p /var/www
cd /var/www

# Clonar el repositorio
sudo git clone https://github.com/TabareCasalas/SGST5.git sgst
# o si es privado:
# sudo git clone git@github.com:TabareCasalas/SGST5.git sgst

# Cambiar propietario
sudo chown -R $USER:$USER /var/www/sgst
cd /var/www/sgst
```

## ⚙️ Paso 5: Configurar Variables de Entorno

### Backend

```bash
cd /var/www/sgst/backend
sudo nano .env
```

Contenido del archivo `.env`:

```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://sgst_user:sgst_password@localhost:5432/sgst_db
JWT_SECRET=TU_JWT_SECRET_SUPER_SEGURO_AQUI_CAMBIAR_EN_PRODUCCION
REFRESH_SECRET=TU_REFRESH_SECRET_SUPER_SEGURO_AQUI_CAMBIAR_EN_PRODUCCION

# Configuración de Resend para envío de correos
RESEND_API_KEY=re_KYkV3qCv_4NjgbTVBRAARrktSrLfGp6jC
```

**⚠️ IMPORTANTE**: Cambia `JWT_SECRET` y `REFRESH_SECRET` por valores seguros y únicos. Puedes generarlos con:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Frontend

```bash
cd /var/www/sgst/frontend
sudo nano .env
```

Contenido del archivo `.env`:

```env
# Si tienes un dominio:
VITE_API_URL=https://tu-dominio.com/api
# O si usas la IP pública:
VITE_API_URL=http://TU_IP_PUBLICA:3001/api
```

## 📦 Paso 6: Instalar Dependencias y Compilar

### Backend

```bash
cd /var/www/sgst/backend
npm install
npm run build
npx prisma generate
npx prisma migrate deploy
```

### Frontend

```bash
cd /var/www/sgst/frontend
npm install
npm run build
```

Esto generará la carpeta `dist/` con los archivos estáticos del frontend.

## 🚀 Paso 7: Configurar PM2 para el Backend

```bash
cd /var/www/sgst/backend

# Iniciar el backend con PM2
pm2 start dist/index.js --name sgst-backend

# Configurar PM2 para iniciar automáticamente al reiniciar
pm2 startup
# Ejecutar el comando que PM2 te muestre (será algo como):
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp /home/$USER

pm2 save
```

### Comandos útiles de PM2:

```bash
# Ver estado
pm2 status

# Ver logs
pm2 logs sgst-backend

# Reiniciar
pm2 restart sgst-backend

# Detener
pm2 stop sgst-backend
```

## 🌐 Paso 8: Configurar Nginx

```bash
sudo nano /etc/nginx/sites-available/sgst
```

Contenido del archivo:

```nginx
# Redirigir HTTP a HTTPS (opcional, si tienes SSL)
# server {
#     listen 80;
#     server_name tu-dominio.com www.tu-dominio.com;
#     return 301 https://$server_name$request_uri;
# }

server {
    listen 80;
    # Si tienes dominio:
    # server_name tu-dominio.com www.tu-dominio.com;
    # Si usas IP:
    server_name _;

    # Servir el frontend
    root /var/www/sgst/frontend/dist;
    index index.html;

    # Configuración para SPA (Single Page Application)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy para el backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Configuración de archivos estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Habilitar el sitio:

```bash
sudo ln -s /etc/nginx/sites-available/sgst /etc/nginx/sites-enabled/
sudo nginx -t  # Verificar configuración
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## 🔥 Paso 9: Configurar Firewall (Google Cloud)

En la consola de Google Cloud:

1. Ve a **VPC network** → **Firewall rules**
2. Crea una regla para permitir tráfico HTTP (puerto 80):
   - Nombre: `allow-http`
   - Dirección: Ingress
   - Acción: Allow
   - Destinos: All instances in the network
   - Source IP ranges: `0.0.0.0/0`
   - Protocols and ports: TCP: 80

3. (Opcional) Crea una regla para HTTPS (puerto 443):
   - Nombre: `allow-https`
   - Dirección: Ingress
   - Acción: Allow
   - Destinos: All instances in the network
   - Source IP ranges: `0.0.0.0/0`
   - Protocols and ports: TCP: 443

O desde la línea de comandos:

```bash
# Permitir HTTP
gcloud compute firewall-rules create allow-http \
    --allow tcp:80 \
    --source-ranges 0.0.0.0/0 \
    --description "Allow HTTP traffic"

# Permitir HTTPS (opcional)
gcloud compute firewall-rules create allow-https \
    --allow tcp:443 \
    --source-ranges 0.0.0.0/0 \
    --description "Allow HTTPS traffic"
```

## ✅ Paso 10: Verificar el Despliegue

1. **Verificar que el backend está corriendo:**
   ```bash
   pm2 status
   curl http://localhost:3001/api/auth/login
   ```

2. **Verificar que Nginx está sirviendo el frontend:**
   ```bash
   curl http://localhost
   ```

3. **Acceder desde el navegador:**
   - Si tienes dominio: `http://tu-dominio.com`
   - Si usas IP: `http://TU_IP_PUBLICA`

## 🔄 Actualizar la Aplicación

Cuando necesites actualizar la aplicación:

```bash
cd /var/www/sgst

# Obtener los últimos cambios
git pull origin main

# Backend
cd backend
npm install
npm run build
npx prisma generate
npx prisma migrate deploy
pm2 restart sgst-backend

# Frontend
cd ../frontend
npm install
npm run build

# Reiniciar Nginx
sudo systemctl reload nginx
```

## 🔒 Paso 11: Configurar SSL con Let's Encrypt (Opcional pero Recomendado)

Si tienes un dominio configurado:

```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtener certificado SSL
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com

# El certificado se renovará automáticamente
```

## 📊 Monitoreo

### Ver logs del backend:
```bash
pm2 logs sgst-backend
```

### Ver logs de Nginx:
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Ver logs de PostgreSQL:
```bash
sudo tail -f /var/log/postgresql/postgresql-*-main.log
```

## 🐛 Solución de Problemas

### El backend no inicia

```bash
# Ver logs de PM2
pm2 logs sgst-backend

# Verificar que el puerto 3001 no esté en uso
sudo netstat -tulpn | grep 3001

# Verificar variables de entorno
cd /var/www/sgst/backend
cat .env
```

### Nginx no sirve el frontend

```bash
# Verificar configuración
sudo nginx -t

# Ver logs de error
sudo tail -f /var/log/nginx/error.log

# Verificar permisos
ls -la /var/www/sgst/frontend/dist
```

### La base de datos no conecta

```bash
# Verificar que PostgreSQL está corriendo
sudo systemctl status postgresql

# Probar conexión
psql -U sgst_user -d sgst_db -h localhost
```

### Error de permisos

```bash
# Asegurar permisos correctos
sudo chown -R $USER:$USER /var/www/sgst
sudo chmod -R 755 /var/www/sgst
```

## 📝 Notas Importantes

1. **Seguridad**: 
   - Cambia todas las contraseñas por defecto
   - Usa JWT_SECRET y REFRESH_SECRET únicos y seguros
   - Configura SSL/HTTPS en producción

2. **Backups**: Configura backups regulares de la base de datos:
   ```bash
   # Backup manual
   pg_dump -U sgst_user sgst_db > backup_$(date +%Y%m%d).sql
   ```

3. **Rendimiento**: Considera usar un CDN para los archivos estáticos del frontend.

4. **Monitoreo**: Considera configurar herramientas de monitoreo como PM2 Plus o New Relic.

## 🎉 ¡Listo!

Tu aplicación debería estar funcionando. Si encuentras algún problema, revisa los logs y la sección de solución de problemas.

