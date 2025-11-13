/**
 * Script de migración para unificar niveles de acceso de administradores
 * 
 * Este script actualiza todos los usuarios con nivel_acceso = 2 (Administrador Docente)
 * a nivel_acceso = 1 (Administrativo unificado)
 * 
 * Ejecutar con: node backend/scripts/migrate-nivel-acceso.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateNivelAcceso() {
  try {
    console.log('🔄 Iniciando migración de niveles de acceso...');

    // Buscar todos los usuarios con nivel_acceso = 2
    const usuariosNivel2 = await prisma.usuario.findMany({
      where: {
        rol: 'administrador',
        nivel_acceso: 2,
      },
      select: {
        id_usuario: true,
        nombre: true,
        correo: true,
        nivel_acceso: true,
      },
    });

    console.log(`📊 Encontrados ${usuariosNivel2.length} usuarios con nivel_acceso = 2`);

    if (usuariosNivel2.length === 0) {
      console.log('✅ No hay usuarios que migrar');
      return;
    }

    // Actualizar todos los usuarios con nivel_acceso = 2 a nivel_acceso = 1
    const resultado = await prisma.usuario.updateMany({
      where: {
        rol: 'administrador',
        nivel_acceso: 2,
      },
      data: {
        nivel_acceso: 1,
      },
    });

    console.log(`✅ ${resultado.count} usuarios actualizados de nivel_acceso 2 → 1`);

    // Mostrar detalles de los usuarios migrados
    if (usuariosNivel2.length > 0) {
      console.log('\n📋 Usuarios migrados:');
      usuariosNivel2.forEach((usuario) => {
        console.log(`   - ${usuario.nombre} (${usuario.correo})`);
      });
    }

    console.log('\n✅ Migración completada exitosamente');
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar la migración
migrateNivelAcceso()
  .then(() => {
    console.log('🎉 Proceso finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });

