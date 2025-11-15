# 🚀 Despliegue Rápido - Guía Resumida

## Pasos Rápidos para Desplegar en Google Cloud VM

### 1. Conectarse a la VM
```bash
ssh usuario@IP_DE_LA_VM
```

### 2. Ejecutar Script de Despliegue
```bash
# Clonar el repositorio
cd /var/www
sudo git clone https://github.com/TU_USUARIO/TU_REPOSITORIO.git sgst
sudo chown -R $USER:$USER /var/www/sgst
cd /var/www/sgst

# Hacer el script ejecutable
chmod +x deploy.sh

# Ejecutar el script
./deploy.sh
```

### 3. Configurar Variables de Entorno

**Backend** (`/var/www/sgst/backend/.env`):
```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://sgst_user:sgst_password@localhost:5432/sgst_db
JWT_SECRET=GENERA_UN_SECRET_SEGURO_AQUI
REFRESH_SECRET=GENERA_OTRO_SECRET_SEGURO_AQUI
RESEND_API_KEY=re_KYkV3qCv_4NjgbTVBRAARrktSrLfGp6jC
```

**Frontend** (`/var/www/sgst/frontend/.env`):
```env
VITE_API_URL=http://TU_IP_PUBLICA:3001/api
# O si tienes dominio:
# VITE_API_URL=https://tu-dominio.com/api
```

### 4. Recompilar después de cambiar .env

```bash
# Backend
cd /var/www/sgst/backend
npm run build
pm2 restart sgst-backend

# Frontend
cd /var/www/sgst/frontend
npm run build
```

### 5. Configurar Nginx

```bash
# Copiar configuración
sudo cp /var/www/sgst/nginx-sgst.conf /etc/nginx/sites-available/sgst

# Editar si es necesario (cambiar dominio o IP)
sudo nano /etc/nginx/sites-available/sgst

# Habilitar sitio
sudo ln -s /etc/nginx/sites-available/sgst /etc/nginx/sites-enabled/

# Verificar y reiniciar
sudo nginx -t
sudo systemctl restart nginx
```

### 6. Configurar Firewall en Google Cloud

**Opción A: Desde la consola web**
1. Ve a VPC network → Firewall rules
2. Crea regla para puerto 80 (HTTP)
3. Crea regla para puerto 443 (HTTPS, opcional)

**Opción B: Desde línea de comandos**
```bash
gcloud compute firewall-rules create allow-http \
    --allow tcp:80 \
    --source-ranges 0.0.0.0/0 \
    --description "Allow HTTP traffic"
```

### 7. Verificar

```bash
# Verificar backend
pm2 status
curl http://localhost:3001/api

# Verificar frontend
curl http://localhost

# Acceder desde navegador
# http://TU_IP_PUBLICA
```

## Comandos Útiles

```bash
# Ver logs del backend
pm2 logs sgst-backend

# Reiniciar backend
pm2 restart sgst-backend

# Ver logs de Nginx
sudo tail -f /var/log/nginx/error.log

# Actualizar aplicación
cd /var/www/sgst
git pull
cd backend && npm install && npm run build && pm2 restart sgst-backend
cd ../frontend && npm install && npm run build
sudo systemctl reload nginx
```

## Generar Secrets Seguros

```bash
# Generar JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generar REFRESH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Solución de Problemas Rápidos

**Backend no inicia:**
```bash
pm2 logs sgst-backend
cd /var/www/sgst/backend
cat .env  # Verificar variables
```

**Nginx error:**
```bash
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

**Base de datos:**
```bash
sudo systemctl status postgresql
psql -U sgst_user -d sgst_db -h localhost
```

