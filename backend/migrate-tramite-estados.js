const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Script de migración para actualizar los estados de trámites
 * de los estados antiguos a los nuevos 4 estados:
 * - en_tramite, finalizado, pendiente, desistido
 */
async function migrarEstadosTramites() {
  try {
    console.log('🔄 Iniciando migración de estados de trámites...\n');
    
    // Mapeo de estados antiguos a nuevos
    const mapeoEstados = {
      'pendiente_asignacion': 'pendiente',
      'iniciado': 'en_tramite',
      'en_revision': 'en_tramite',
      'requiere_correccion': 'pendiente',
      'aprobado': 'en_tramite',
      'rechazado': 'desistido',
      'finalizado': 'finalizado',
      'desistido': 'desistido',
      'pendiente': 'pendiente', // Ya está correcto
    };

    // Obtener todos los trámites
    const tramites = await prisma.tramite.findMany({
      select: {
        id_tramite: true,
        estado: true,
        num_carpeta: true,
      },
    });

    console.log(`📊 Total de trámites a migrar: ${tramites.length}\n`);

    // Contar estados actuales
    const estadosActuales = {};
    tramites.forEach(t => {
      estadosActuales[t.estado] = (estadosActuales[t.estado] || 0) + 1;
    });

    console.log('📈 Estados ANTES de la migración:');
    Object.entries(estadosActuales).forEach(([estado, count]) => {
      console.log(`   ${estado}: ${count} trámite(s)`);
    });
    console.log('');

    // Migrar cada trámite
    let migrados = 0;
    let sinCambio = 0;
    let errores = 0;

    for (const tramite of tramites) {
      const nuevoEstado = mapeoEstados[tramite.estado];
      
      if (!nuevoEstado) {
        console.error(`⚠️  Estado desconocido en trámite ${tramite.id_tramite} (carpeta ${tramite.num_carpeta}): ${tramite.estado}`);
        errores++;
        continue;
      }

      if (tramite.estado === nuevoEstado) {
        sinCambio++;
        continue;
      }

      try {
        await prisma.tramite.update({
          where: { id_tramite: tramite.id_tramite },
          data: { estado: nuevoEstado },
        });
        migrados++;
        console.log(`   ✓ Trámite ${tramite.id_tramite} (carpeta ${tramite.num_carpeta}): ${tramite.estado} → ${nuevoEstado}`);
      } catch (error) {
        console.error(`   ❌ Error al migrar trámite ${tramite.id_tramite}:`, error.message);
        errores++;
      }
    }

    console.log('\n📊 Resumen de migración:');
    console.log(`   ✓ Migrados: ${migrados}`);
    console.log(`   - Sin cambio: ${sinCambio}`);
    console.log(`   ❌ Errores: ${errores}`);

    // Verificar estados después de la migración
    const tramitesDespues = await prisma.tramite.findMany({
      select: { estado: true },
    });

    const estadosDespues = {};
    tramitesDespues.forEach(t => {
      estadosDespues[t.estado] = (estadosDespues[t.estado] || 0) + 1;
    });

    console.log('\n📈 Estados DESPUÉS de la migración:');
    Object.entries(estadosDespues).forEach(([estado, count]) => {
      console.log(`   ${estado}: ${count} trámite(s)`);
    });

    console.log('\n✅ Migración completada');
  } catch (error) {
    console.error('❌ Error en la migración:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar migración
migrarEstadosTramites()
  .then(() => {
    console.log('\n🎉 Proceso finalizado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error fatal:', error);
    process.exit(1);
  });


