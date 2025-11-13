# Migración: Agregar campo hora_cita a Ficha

## Problema
El campo `hora_cita` está definido en el schema de Prisma pero no existe en la base de datos, causando el error:
```
Unknown argument `hora_cita`
```

## Solución

### Opción 1: Usar Prisma DB Push (Recomendado)

1. **Detener el servidor backend** si está corriendo (Ctrl+C)

2. **Ejecutar los siguientes comandos:**
```powershell
cd backend
npx prisma db push
npx prisma generate
```

3. **Reiniciar el servidor:**
```powershell
npm run dev
```

### Opción 2: Ejecutar SQL Manualmente

Si `prisma db push` no funciona, ejecuta este SQL directamente en la base de datos:

```sql
ALTER TABLE "Ficha" ADD COLUMN IF NOT EXISTS "hora_cita" TEXT;
```

**Usando PgAdmin:**
1. Abre PgAdmin: http://localhost:8080
2. Conéctate a la base de datos `sgst_db`
3. Abre Query Tool
4. Ejecuta el SQL anterior

**Usando Docker:**
```powershell
docker exec -i sgst_postgres psql -U sgst_user -d sgst_db -c 'ALTER TABLE "Ficha" ADD COLUMN IF NOT EXISTS "hora_cita" TEXT;'
```

5. **Después de ejecutar el SQL, regenera el cliente de Prisma:**
```powershell
cd backend
npx prisma generate
```

### Verificación

Para verificar que la columna se agregó correctamente:
```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'Ficha' AND column_name = 'hora_cita';
```

Deberías ver:
- column_name: hora_cita
- data_type: text
- is_nullable: YES


