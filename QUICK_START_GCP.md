# 🚀 Quick Start - Deployment en Google Cloud

## Resumen Rápido

Este proyecto incluye scripts automatizados para desplegar SGST en una VM de Ubuntu en Google Cloud Platform.

## 📁 Archivos Incluidos

- **`deploy-gcp-vm.sh`** - Script principal de deployment (ejecutar una vez)
- **`update-app.sh`** - Script para actualizar la aplicación después del despliegue
- **`INSTRUCCIONES_DEPLOY_GCP.md`** - Instrucciones detalladas completas

## ⚡ Inicio Rápido (3 pasos)

### 1. Crear VM en Google Cloud

```bash
# Opción A: Desde la consola web
# Ve a: https://console.cloud.google.com/compute/instances
# Crea una VM con Ubuntu 22.04 LTS, mínimo e2-small

# Opción B: Desde gcloud CLI
gcloud compute instances create sgst-vm \
  --zone=us-central1-a \
  --machine-type=e2-medium \
  --boot-disk-size=30GB \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --tags=sgst-server
```

### 2. Configurar Firewall

```bash
# Permitir HTTP y HTTPS
gcloud compute firewall-rules create allow-http \
  --allow tcp:80 --source-ranges 0.0.0.0/0

gcloud compute firewall-rules create allow-https \
  --allow tcp:443 --source-ranges 0.0.0.0/0
```

### 3. Ejecutar Script de Deployment

```bash
# Conectarse a la VM
gcloud compute ssh sgst-vm --zone=us-central1-a

# Clonar o subir el proyecto
git clone TU_REPOSITORIO_URL
cd SGST5

# Hacer ejecutable y correr
chmod +x deploy-gcp-vm.sh
./deploy-gcp-vm.sh
```

El script te pedirá:
- Contraseña de PostgreSQL
- URL del repositorio (si no clonaste antes)
- Dominio o IP pública
- API Key de Resend (opcional)

## ✅ Verificar

```bash
# Ver estado
pm2 status
sudo systemctl status nginx

# Ver logs
pm2 logs sgst-backend
```

## 🔄 Actualizar Aplicación

```bash
cd /var/www/sgst
chmod +x update-app.sh
./update-app.sh
```

## 📚 Documentación Completa

Para instrucciones detalladas, ver: **`INSTRUCCIONES_DEPLOY_GCP.md`**

## 🆘 Problemas Comunes

**Backend no inicia:**
```bash
pm2 logs sgst-backend --lines 50
```

**Nginx no sirve el frontend:**
```bash
sudo nginx -t
sudo tail -f /var/log/nginx/sgst-error.log
```

**Verificar servicios:**
```bash
pm2 status
sudo systemctl status nginx
sudo systemctl status postgresql
```

---

**¡Listo! Tu aplicación estará disponible en `http://TU_IP_PUBLICA` o `http://tu-dominio.com`** 🎉

