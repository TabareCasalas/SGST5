# 🚀 Quick Start - Deployment en Google Cloud

## Resumen Rápido

Este proyecto incluye scripts automatizados para desplegar SGST en una VM de Ubuntu en Google Cloud Platform.

## 📁 Archivos Incluidos

- **`deploy-gcp-vm.sh`** - Script principal de deployment (ejecutar una vez)
- **`update-app.sh`** - Script para actualizar la aplicación después del despliegue
- **`INSTRUCCIONES_DEPLOY_GCP.md`** - Instrucciones detalladas completas

## ⚡ Inicio Rápido (3 pasos)

> **⚠️ IMPORTANTE**: Este script **REQUIERE permisos sudo**. 
> - Verifica antes de ejecutar: `sudo whoami` (debe mostrar `root`)
> - Si no tienes sudo, consulta `SOLUCION_PERMISOS_SUDO.md`
> - El script verificará automáticamente los permisos al inicio

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

**Opción A: Usando SSH del navegador (Recomendado)**

1. En [Google Cloud Console](https://console.cloud.google.com/compute/instances), haz clic en **SSH** en tu VM
2. Se abrirá una terminal en el navegador
3. Ejecuta:

```bash
# Instalar Git primero (si no está instalado)
sudo apt-get update
sudo apt-get install -y git

# Clonar el proyecto
git clone https://github.com/TabareCasalas/SGST5
cd SGST5

# Hacer ejecutable el script
chmod +x deploy-gcp-vm.sh

# Ejecutar el script (IMPORTANTE: usa ./ antes del nombre)
./deploy-gcp-vm.sh
```

**Nota**: El script también instalará Git automáticamente si no está instalado, pero puedes instalarlo manualmente antes si prefieres.

**Opción B: El script puede clonar automáticamente**

Si prefieres que el script clone el repositorio automáticamente:

```bash
# Descargar solo el script (o clonar y ejecutar desde otro directorio)
git clone https://github.com/TabareCasalas/SGST5
cd SGST5
chmod +x deploy-gcp-vm.sh
# Ejecutar con ./ (punto y barra antes del nombre)
./deploy-gcp-vm.sh
# Cuando pregunte, presiona Enter para usar el repositorio por defecto
```

El script te pedirá:
- **Contraseña de PostgreSQL** (Enter para usar `sgst_password`)
- **Clonar desde Git** (Enter para usar `https://github.com/TabareCasalas/SGST5`)
- **Dominio o IP pública** (Enter para detectar automáticamente)
- **API Key de Resend** (opcional, Enter para omitir)

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

## ⚠️ Problema con Permisos Sudo?

Si recibes el error `sudo-rs: I'm sorry tabare_casalas. I'm afraid I can't do that`, consulta el archivo **`SOLUCION_PERMISOS_SUDO.md`** para soluciones.

---

**¡Listo! Tu aplicación estará disponible en `http://TU_IP_PUBLICA` o `http://tu-dominio.com`** 🎉

