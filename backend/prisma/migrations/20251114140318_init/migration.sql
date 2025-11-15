-- CreateTable
CREATE TABLE "Usuario" (
    "id_usuario" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "ci" TEXT NOT NULL,
    "domicilio" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "password" TEXT,
    "rol" TEXT NOT NULL DEFAULT 'estudiante',
    "nivel_acceso" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "semestre" TEXT,
    "refresh_token" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateTable
CREATE TABLE "Consultante" (
    "id_consultante" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "est_civil" TEXT NOT NULL,
    "nro_padron" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Consultante_pkey" PRIMARY KEY ("id_consultante")
);

-- CreateTable
CREATE TABLE "Grupo" (
    "id_grupo" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Grupo_pkey" PRIMARY KEY ("id_grupo")
);

-- CreateTable
CREATE TABLE "UsuarioGrupo" (
    "id_usuario_grupo" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "id_grupo" INTEGER NOT NULL,
    "rol_en_grupo" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsuarioGrupo_pkey" PRIMARY KEY ("id_usuario_grupo")
);

-- CreateTable
CREATE TABLE "Tramite" (
    "id_tramite" SERIAL NOT NULL,
    "id_consultante" INTEGER NOT NULL,
    "id_grupo" INTEGER NOT NULL,
    "num_carpeta" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'en_tramite',
    "observaciones" TEXT,
    "fecha_inicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_cierre" TIMESTAMP(3),
    "motivo_cierre" TEXT,
    "process_instance_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tramite_pkey" PRIMARY KEY ("id_tramite")
);

-- CreateTable
CREATE TABLE "Notificacion" (
    "id_notificacion" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "id_usuario_emisor" INTEGER,
    "titulo" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'info',
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "tipo_entidad" TEXT,
    "id_entidad" INTEGER,
    "id_tramite" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notificacion_pkey" PRIMARY KEY ("id_notificacion")
);

-- CreateTable
CREATE TABLE "Auditoria" (
    "id_auditoria" SERIAL NOT NULL,
    "id_usuario" INTEGER,
    "tipo_entidad" TEXT NOT NULL,
    "id_entidad" INTEGER,
    "accion" TEXT NOT NULL,
    "detalles" TEXT,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Auditoria_pkey" PRIMARY KEY ("id_auditoria")
);

-- CreateTable
CREATE TABLE "HojaRuta" (
    "id_hoja_ruta" SERIAL NOT NULL,
    "id_tramite" INTEGER NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "fecha_actuacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "descripcion" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HojaRuta_pkey" PRIMARY KEY ("id_hoja_ruta")
);

-- CreateTable
CREATE TABLE "DocumentoAdjunto" (
    "id_documento" SERIAL NOT NULL,
    "id_tramite" INTEGER NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "nombre_archivo" TEXT NOT NULL,
    "nombre_almacenado" TEXT NOT NULL,
    "ruta_archivo" TEXT NOT NULL,
    "tipo_mime" TEXT NOT NULL,
    "tamano" INTEGER NOT NULL,
    "descripcion" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentoAdjunto_pkey" PRIMARY KEY ("id_documento")
);

-- CreateTable
CREATE TABLE "Ficha" (
    "id_ficha" SERIAL NOT NULL,
    "id_consultante" INTEGER NOT NULL,
    "fecha_cita" TIMESTAMP(3) NOT NULL,
    "hora_cita" TEXT,
    "tema_consulta" TEXT NOT NULL,
    "id_docente" INTEGER NOT NULL,
    "numero_consulta" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'standby',
    "id_grupo" INTEGER,
    "observaciones" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ficha_pkey" PRIMARY KEY ("id_ficha")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_ci_key" ON "Usuario"("ci");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_correo_key" ON "Usuario"("correo");

-- CreateIndex
CREATE UNIQUE INDEX "Consultante_id_usuario_key" ON "Consultante"("id_usuario");

-- CreateIndex
CREATE UNIQUE INDEX "Consultante_nro_padron_key" ON "Consultante"("nro_padron");

-- CreateIndex
CREATE INDEX "UsuarioGrupo_id_grupo_idx" ON "UsuarioGrupo"("id_grupo");

-- CreateIndex
CREATE INDEX "UsuarioGrupo_id_usuario_idx" ON "UsuarioGrupo"("id_usuario");

-- CreateIndex
CREATE UNIQUE INDEX "UsuarioGrupo_id_usuario_id_grupo_key" ON "UsuarioGrupo"("id_usuario", "id_grupo");

-- CreateIndex
CREATE UNIQUE INDEX "Tramite_num_carpeta_key" ON "Tramite"("num_carpeta");

-- CreateIndex
CREATE INDEX "Notificacion_id_usuario_idx" ON "Notificacion"("id_usuario");

-- CreateIndex
CREATE INDEX "Notificacion_id_usuario_emisor_idx" ON "Notificacion"("id_usuario_emisor");

-- CreateIndex
CREATE INDEX "Notificacion_leida_idx" ON "Notificacion"("leida");

-- CreateIndex
CREATE INDEX "Notificacion_created_at_idx" ON "Notificacion"("created_at");

-- CreateIndex
CREATE INDEX "Notificacion_tipo_entidad_id_entidad_idx" ON "Notificacion"("tipo_entidad", "id_entidad");

-- CreateIndex
CREATE INDEX "HojaRuta_id_tramite_idx" ON "HojaRuta"("id_tramite");

-- CreateIndex
CREATE INDEX "HojaRuta_id_usuario_idx" ON "HojaRuta"("id_usuario");

-- CreateIndex
CREATE INDEX "DocumentoAdjunto_id_tramite_idx" ON "DocumentoAdjunto"("id_tramite");

-- CreateIndex
CREATE INDEX "DocumentoAdjunto_id_usuario_idx" ON "DocumentoAdjunto"("id_usuario");

-- CreateIndex
CREATE UNIQUE INDEX "Ficha_numero_consulta_key" ON "Ficha"("numero_consulta");

-- CreateIndex
CREATE INDEX "Ficha_id_consultante_idx" ON "Ficha"("id_consultante");

-- CreateIndex
CREATE INDEX "Ficha_id_docente_idx" ON "Ficha"("id_docente");

-- CreateIndex
CREATE INDEX "Ficha_id_grupo_idx" ON "Ficha"("id_grupo");

-- CreateIndex
CREATE INDEX "Ficha_estado_idx" ON "Ficha"("estado");

-- CreateIndex
CREATE INDEX "Ficha_numero_consulta_idx" ON "Ficha"("numero_consulta");

-- AddForeignKey
ALTER TABLE "Consultante" ADD CONSTRAINT "Consultante_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioGrupo" ADD CONSTRAINT "UsuarioGrupo_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioGrupo" ADD CONSTRAINT "UsuarioGrupo_id_grupo_fkey" FOREIGN KEY ("id_grupo") REFERENCES "Grupo"("id_grupo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tramite" ADD CONSTRAINT "Tramite_id_consultante_fkey" FOREIGN KEY ("id_consultante") REFERENCES "Consultante"("id_consultante") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tramite" ADD CONSTRAINT "Tramite_id_grupo_fkey" FOREIGN KEY ("id_grupo") REFERENCES "Grupo"("id_grupo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_id_usuario_emisor_fkey" FOREIGN KEY ("id_usuario_emisor") REFERENCES "Usuario"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_id_tramite_fkey" FOREIGN KEY ("id_tramite") REFERENCES "Tramite"("id_tramite") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auditoria" ADD CONSTRAINT "Auditoria_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HojaRuta" ADD CONSTRAINT "HojaRuta_id_tramite_fkey" FOREIGN KEY ("id_tramite") REFERENCES "Tramite"("id_tramite") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HojaRuta" ADD CONSTRAINT "HojaRuta_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoAdjunto" ADD CONSTRAINT "DocumentoAdjunto_id_tramite_fkey" FOREIGN KEY ("id_tramite") REFERENCES "Tramite"("id_tramite") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoAdjunto" ADD CONSTRAINT "DocumentoAdjunto_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ficha" ADD CONSTRAINT "Ficha_id_consultante_fkey" FOREIGN KEY ("id_consultante") REFERENCES "Consultante"("id_consultante") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ficha" ADD CONSTRAINT "Ficha_id_docente_fkey" FOREIGN KEY ("id_docente") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ficha" ADD CONSTRAINT "Ficha_id_grupo_fkey" FOREIGN KEY ("id_grupo") REFERENCES "Grupo"("id_grupo") ON DELETE SET NULL ON UPDATE CASCADE;
