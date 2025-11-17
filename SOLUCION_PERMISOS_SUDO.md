# 🔐 Solución: Problema de Permisos Sudo

Si recibes el error `sudo-rs: I'm sorry tabare_casalas. I'm afraid I can't do that`, significa que tu usuario no tiene permisos de administrador (sudo).

## ✅ Soluciones

### Opción 1: Agregar tu usuario al grupo sudo (Recomendado)

Si tienes acceso a otro usuario con permisos sudo o root:

```bash
# Conectarse como root o usuario con sudo
# Luego ejecutar:
sudo usermod -aG sudo tabare_casalas

# Cerrar sesión y volver a conectarte para que los cambios surtan efecto
exit
```

Después de reconectarte, verifica:

```bash
sudo whoami
# Debería mostrar: root
```

### Opción 2: Usar el usuario root directamente

Si puedes conectarte como root:

```bash
# Conectarse como root (si está habilitado)
su -

# O si tienes acceso directo a root
```

### Opción 3: Recrear la VM con permisos adecuados

Si estás creando una nueva VM, asegúrate de que el usuario tenga permisos de administrador:

**Desde Google Cloud Console:**
1. Al crear la VM, en "Access scopes", selecciona "Allow full access to all Cloud APIs"
2. O usa el usuario por defecto que Google Cloud crea (que tiene sudo)

**Desde gcloud CLI:**
```bash
gcloud compute instances create sgst-vm \
  --zone=us-central1-a \
  --machine-type=e2-medium \
  --boot-disk-size=30GB \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --tags=sgst-server \
  --metadata=startup-script='#! /bin/bash
apt-get update
apt-get install -y git
usermod -aG sudo $USER'
```

### Opción 4: Usar el usuario por defecto de Google Cloud

Google Cloud crea un usuario automáticamente cuando usas SSH desde la consola. Este usuario debería tener permisos sudo. Intenta:

1. Cerrar la sesión actual
2. Volver a conectarte usando el botón SSH desde Google Cloud Console
3. Verificar permisos: `sudo whoami`

## 🔍 Verificar Permisos Actuales

```bash
# Ver qué grupos pertenece tu usuario
groups

# Ver si puedes usar sudo
sudo -v

# Ver información del usuario
id
```

## 📝 Nota Importante

El script `deploy-gcp-vm.sh` **requiere permisos sudo** para:
- Instalar paquetes del sistema (Node.js, PostgreSQL, Nginx, etc.)
- Configurar servicios del sistema
- Crear directorios en `/var/www/`
- Configurar Nginx
- Configurar PostgreSQL

Sin permisos sudo, el script no podrá completar el deployment.

## 🆘 Si No Puedes Obtener Permisos Sudo

Si no puedes obtener permisos sudo, tendrías que:
1. Contactar al administrador de la VM
2. O recrear la VM con los permisos adecuados
3. O usar un servicio de deployment diferente (como Cloud Run, App Engine, etc.)

---

**Recomendación**: La forma más fácil es recrear la VM desde Google Cloud Console asegurándote de usar el usuario por defecto que Google Cloud crea, que tiene permisos sudo automáticamente.

