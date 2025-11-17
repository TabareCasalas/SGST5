# 🚀 Instrucciones de Deployment en Google Cloud Platform

Este documento contiene las instrucciones completas para desplegar el proyecto SGST en una VM de Ubuntu en Google Cloud Platform.

## 📋 Prerrequisitos

1. **Cuenta de Google Cloud Platform** con un proyecto creado
2. **gcloud CLI** instalado en tu máquina local (opcional, pero recomendado)
3. **Repositorio Git** del proyecto (o acceso a los archivos del proyecto)
4. **API Key de Resend** (opcional, para envío de correos)
5. **Permisos sudo** en la VM - **IMPORTANTE**: El script requiere permisos de administrador

> ⚠️ **Si no tienes permisos sudo**, consulta el archivo `SOLUCION_PERMISOS_SUDO.md` antes de continuar.

## 🔧 Paso 1: Crear la VM en Google Cloud

### Opción A: Usando Google Cloud Console (Interfaz Web)

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto
3. Navega a **Compute Engine** > **VM instances**
4. Haz clic en **Create Instance**
5. Configura la instancia:
   - **Name**: `sgst-vm` (o el nombre que prefieras)
   - **Region**: Elige la región más cercana a tus usuarios
   - **Zone**: Cualquier zona disponible
   - **Machine type**: 
     - Mínimo: `e2-small` (2 vCPU, 2 GB RAM) para desarrollo/pruebas
     - Recomendado: `e2-medium` (2 vCPU, 4 GB RAM) para producción
     - Producción: `e2-standard-2` (2 vCPU, 8 GB RAM) o superior
   - **Boot disk**: 
     - **OS**: Ubuntu
     - **Version**: Ubuntu 22.04 LTS o superior
     - **Size**: Mínimo 20 GB (recomendado 30-50 GB)
   - **Firewall**: 
     - ✅ Allow HTTP traffic
     - ✅ Allow HTTPS traffic
   - **Network tags**: `sgst-server` (opcional, útil para reglas de firewall)
6. Haz clic en **Create**

### Opción B: Usando gcloud CLI

```bash
# Configurar el proyecto
gcloud config set project TU_PROJECT_ID

# Crear la VM
gcloud compute instances create sgst-vm \
  --zone=us-central1-a \
  --machine-type=e2-medium \
  --boot-disk-size=30GB \
  --boot-disk-type=pd-standard \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --tags=sgst-server \
  --metadata=startup-script='#! /bin/bash
apt-get update
apt-get install -y git'
```

## 🔐 Paso 2: Conectarse a la VM

### Opción A: SSH desde Google Cloud Console (Recomendado)

1. Ve a [Google Cloud Console](https://console.cloud.google.com/compute/instances)
2. En la lista de VM instances, encuentra tu instancia
3. Haz clic en el botón **SSH** (se abrirá una ventana de terminal en el navegador)
4. Se abrirá una terminal interactiva directamente en tu navegador - ¡listo para usar!

**Nota**: El SSH del navegador funciona exactamente igual que un SSH tradicional. Todos los comandos funcionan normalmente.

### Opción B: SSH desde terminal local

```bash
# Si usas gcloud CLI
gcloud compute ssh sgst-vm --zone=us-central1-a

# O usando SSH tradicional (necesitas configurar las claves primero)
ssh -i ~/.ssh/gcp_key usuario@IP_PUBLICA
```

## 🌐 Paso 3: Configurar Firewall de Google Cloud

Si no habilitaste HTTP/HTTPS al crear la VM, configura las reglas de firewall:

### Opción A: Desde Google Cloud Console

1. Ve a **VPC network** > **Firewall**
2. Haz clic en **Create Firewall Rule**
3. Configura:
   - **Name**: `allow-http`
   - **Direction**: Ingress
   - **Targets**: All instances in the network (o selecciona el tag `sgst-server`)
   - **Source IP ranges**: `0.0.0.0/0`
   - **Protocols and ports**: 
     - ✅ TCP
     - **Port**: `80`
4. Repite para HTTPS (puerto `443`)

### Opción B: Usando gcloud CLI

```bash
# Permitir HTTP
gcloud compute firewall-rules create allow-http \
  --allow tcp:80 \
  --source-ranges 0.0.0.0/0 \
  --description "Allow HTTP traffic" \
  --target-tags sgst-server

# Permitir HTTPS
gcloud compute firewall-rules create allow-https \
  --allow tcp:443 \
  --source-ranges 0.0.0.0/0 \
  --description "Allow HTTPS traffic" \
  --target-tags sgst-server
```

## 📥 Paso 4: Clonar el proyecto

### Clonar desde Git (Recomendado)

El script de deployment puede clonar automáticamente el repositorio, pero si prefieres hacerlo manualmente:

```bash
# En la VM (terminal SSH del navegador)
# Primero, instalar Git si no está instalado
sudo apt-get update
sudo apt-get install -y git

# Clonar el proyecto
cd ~
git clone https://github.com/TabareCasalas/SGST5
cd SGST5
```

**Nota**: 
- El script `deploy-gcp-vm.sh` instalará Git automáticamente si no está instalado
- El script también puede clonar el repositorio automáticamente si no existe en el directorio de destino

### Opción B: Subir archivos manualmente

1. **Desde tu máquina local**, comprime el proyecto:
   ```bash
   tar -czf sgst-project.tar.gz --exclude='node_modules' --exclude='.git' .
   ```

2. **Sube el archivo a la VM**:
   ```bash
   # Usando gcloud
   gcloud compute scp sgst-project.tar.gz sgst-vm:~/ --zone=us-central1-a
   
   # O usando SCP tradicional
   scp -i ~/.ssh/gcp_key sgst-project.tar.gz usuario@IP_PUBLICA:~/
   ```

3. **En la VM**, extrae el archivo:
   ```bash
   tar -xzf sgst-project.tar.gz
   cd SGST5  # o el nombre de tu proyecto
   ```

### Opción C: Usar el script directamente

Si ya tienes el script `deploy-gcp-vm.sh` en tu proyecto:

```bash
# En la VM, después de clonar/subir el proyecto
chmod +x deploy-gcp-vm.sh
```

## 🚀 Paso 5: Ejecutar el script de deployment

```bash
# Si clonaste el repositorio manualmente
cd ~/SGST5

# O si el script lo clonará automáticamente, ve al directorio donde quieres que se instale
cd ~

# Dar permisos de ejecución
chmod +x deploy-gcp-vm.sh

# Ejecutar el script (IMPORTANTE: usa ./ antes del nombre del script)
./deploy-gcp-vm.sh
```

**Nota importante**: En Linux, para ejecutar un script en el directorio actual, debes usar `./` antes del nombre del script. Si solo escribes `deploy-gcp-vm.sh`, el sistema buscará el comando en las rutas del PATH, no en el directorio actual.

**Si ejecutas el script desde el directorio del proyecto clonado**, el script detectará el proyecto y lo moverá a `/var/www/sgst`.

**Si ejecutas el script desde otro directorio**, el script te preguntará si quieres clonar el repositorio (por defecto usará `https://github.com/TabareCasalas/SGST5`).

El script te pedirá:
1. **Contraseña de PostgreSQL**: Ingresa una contraseña segura (o presiona Enter para usar `sgst_password`)
2. **Clonar desde Git**: Presiona Enter para usar el repositorio por defecto, o ingresa otra URL
3. **Dominio o IP**: 
   - Si tienes un dominio, ingrésalo (ej: `sgst.ejemplo.com`)
   - Si no, ingresa la IP pública de la VM (o presiona Enter para detectarla automáticamente)
4. **RESEND_API_KEY**: Tu API key de Resend (opcional, presiona Enter para omitir)

El script automatizará:
- ✅ Instalación de Node.js, PostgreSQL, Nginx, PM2
- ✅ Configuración de la base de datos
- ✅ Configuración de variables de entorno
- ✅ Instalación de dependencias
- ✅ Compilación del backend y frontend
- ✅ Ejecución de migraciones de base de datos
- ✅ Configuración de PM2 para el backend
- ✅ Configuración de Nginx como reverse proxy
- ✅ Verificaciones finales

## 🔒 Paso 6: Configurar SSL (Opcional pero Recomendado)

Si tienes un dominio configurado, instala SSL con Let's Encrypt:

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Obtener certificado SSL
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com

# El certificado se renovará automáticamente
```

**Nota**: Asegúrate de que tu dominio apunte a la IP pública de la VM antes de ejecutar Certbot.

## ✅ Paso 7: Verificar el despliegue

1. **Verifica que el backend está corriendo**:
   ```bash
   pm2 status
   pm2 logs sgst-backend
   ```

2. **Verifica que Nginx está corriendo**:
   ```bash
   sudo systemctl status nginx
   ```

3. **Accede a la aplicación**:
   - Si usas IP: `http://TU_IP_PUBLICA`
   - Si usas dominio: `http://tu-dominio.com` (o `https://` si configuraste SSL)

4. **Verifica el health check del backend**:
   ```bash
   curl http://localhost:3001/health
   ```

## 🔧 Comandos Útiles

### Gestión del Backend (PM2)

```bash
# Ver estado
pm2 status

# Ver logs en tiempo real
pm2 logs sgst-backend

# Ver logs de las últimas 100 líneas
pm2 logs sgst-backend --lines 100

# Reiniciar backend
pm2 restart sgst-backend

# Detener backend
pm2 stop sgst-backend

# Iniciar backend
pm2 start sgst-backend

# Ver información detallada
pm2 info sgst-backend
```

### Gestión de Nginx

```bash
# Ver estado
sudo systemctl status nginx

# Reiniciar
sudo systemctl restart nginx

# Ver logs de error
sudo tail -f /var/log/nginx/sgst-error.log

# Ver logs de acceso
sudo tail -f /var/log/nginx/sgst-access.log

# Verificar configuración
sudo nginx -t

# Recargar configuración (sin downtime)
sudo nginx -s reload
```

### Gestión de PostgreSQL

```bash
# Conectarse a PostgreSQL
sudo -u postgres psql

# Conectarse a la base de datos específica
sudo -u postgres psql -d sgst_db

# Ver bases de datos
sudo -u postgres psql -l

# Backup de la base de datos
sudo -u postgres pg_dump sgst_db > backup_$(date +%Y%m%d).sql

# Restaurar backup
sudo -u postgres psql sgst_db < backup_20240101.sql
```

### Actualizar la aplicación

```bash
# Ir al directorio del proyecto
cd /var/www/sgst

# Si usas Git, actualizar código
git pull

# Reinstalar dependencias del backend (si hay cambios)
cd backend
npm install
npm run build
npx prisma generate
npx prisma migrate deploy

# Reiniciar backend
pm2 restart sgst-backend

# Reinstalar dependencias del frontend (si hay cambios)
cd ../frontend
npm install
npm run build

# Reiniciar Nginx (para servir el nuevo frontend)
sudo systemctl reload nginx
```

## 🐛 Solución de Problemas

### El backend no inicia

```bash
# Ver logs detallados
pm2 logs sgst-backend --lines 50

# Verificar variables de entorno
cat /var/www/sgst/backend/.env

# Verificar conexión a la base de datos
sudo -u postgres psql -d sgst_db -U sgst_user
```

### Nginx no sirve el frontend

```bash
# Verificar configuración
sudo nginx -t

# Ver logs de error
sudo tail -f /var/log/nginx/sgst-error.log

# Verificar que el directorio dist existe
ls -la /var/www/sgst/frontend/dist
```

### Error de permisos

```bash
# Asegurar permisos correctos
sudo chown -R $USER:$USER /var/www/sgst
chmod -R 755 /var/www/sgst
```

### Puerto 3001 no responde

```bash
# Verificar que el backend está corriendo
pm2 status

# Verificar que el puerto está en uso
sudo netstat -tlnp | grep 3001

# Verificar firewall local
sudo ufw status
```

### Problemas con la base de datos

```bash
# Verificar que PostgreSQL está corriendo
sudo systemctl status postgresql

# Verificar conexión
sudo -u postgres psql -d sgst_db -U sgst_user

# Ver logs de PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-*.log
```

## 📊 Monitoreo

### Ver uso de recursos

```bash
# CPU y memoria
htop  # o instalar con: sudo apt install htop

# Espacio en disco
df -h

# Uso de memoria
free -h
```

### Configurar alertas en Google Cloud

1. Ve a **Monitoring** > **Alerting**
2. Crea políticas de alerta para:
   - Uso de CPU > 80%
   - Uso de memoria > 80%
   - Espacio en disco < 20%
   - Instancia no responde

## 🔄 Backup y Recuperación

### Backup automático de base de datos

Crea un script de backup:

```bash
sudo nano /usr/local/bin/backup-sgst-db.sh
```

Contenido:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/sgst"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
sudo -u postgres pg_dump sgst_db | gzip > $BACKUP_DIR/sgst_db_$DATE.sql.gz
# Mantener solo los últimos 7 días
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
```

Hacer ejecutable y programar con cron:

```bash
sudo chmod +x /usr/local/bin/backup-sgst-db.sh
sudo crontab -e
# Agregar: 0 2 * * * /usr/local/bin/backup-sgst-db.sh
```

## 📝 Notas Importantes

1. **Seguridad**:
   - Cambia las contraseñas predeterminadas
   - Mantén el sistema actualizado: `sudo apt update && sudo apt upgrade`
   - Configura SSL/HTTPS para producción
   - Considera usar un firewall más restrictivo
   - El script configura automáticamente CORS para tu dominio/IP

2. **Rendimiento**:
   - Para producción, considera usar un balanceador de carga
   - Configura CDN para archivos estáticos
   - Optimiza las consultas a la base de datos

3. **Escalabilidad**:
   - Para mayor tráfico, considera separar la base de datos en Cloud SQL
   - Usa múltiples instancias con un balanceador de carga
   - Implementa caché (Redis) para mejorar el rendimiento

## 📞 Soporte

Si encuentras problemas:
1. Revisa los logs: `pm2 logs sgst-backend` y `/var/log/nginx/sgst-error.log`
2. Verifica el archivo de log del deployment: `/var/log/sgst-deploy.log`
3. Consulta la documentación del proyecto

---

**¡Despliegue exitoso! 🎉**

