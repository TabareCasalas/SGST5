# Prompt para Diseño de Diagrama BPMN en Camunda - Sistema SGST

## Contexto General

Necesito que diseñes un diagrama BPMN (Business Process Model and Notation) para Camunda que modele los procesos de negocio de un Sistema de Gestión de Servicios de Trabajo Social (SGST). Este sistema gestiona consultas sociales, trámites legales y grupos de trabajo compuestos por estudiantes, docentes y consultantes.

## Arquitectura del Sistema

El sistema tiene los siguientes componentes:
- **Frontend**: React + Vite (puerto 80)
- **Backend API**: Node.js + Express (puerto 3001)
- **Orchestrator**: Servicio intermediario entre Camunda y Backend (puerto 3002)
- **Camunda Engine**: Motor de procesos BPMN (puerto 8081)
- **PostgreSQL**: Base de datos principal

La comunicación sigue el patrón de External Tasks: Camunda crea tareas externas que el Orchestrator consume, ejecuta acciones en el Backend, y completa las tareas en Camunda.

## Roles del Sistema

### 1. Administrador (con 3 niveles de acceso)
- **Nivel 1 - Administrativo**: Puede crear y gestionar fichas, aprobar fichas pendientes
- **Nivel 2 - Docente**: Puede crear trámites y grupos, gestionar grupos
- **Nivel 3 - Sistema**: Puede gestionar usuarios y tiene acceso completo

### 2. Docente
- Puede ver trámites en estado `en_tramite` asignados a sus grupos
- Puede ver fichas asignadas a él (estados: aprobado, standby, asignada, iniciada)
- Puede asignar fichas en estado "standby" a grupos (propios o de otros docentes)
- Puede iniciar trámites desde fichas asignadas a sus grupos (estado inicial: `en_tramite`)
- Puede cambiar el estado de los trámites según las transiciones permitidas
- Puede ver grupos propios, de otros docentes, y todos los grupos

### 3. Estudiante
- Pertenece a grupos de trabajo
- Puede realizar actuaciones en trámites (hojas de ruta)
- Puede subir documentos a trámites
- Puede cambiar el estado de los trámites según las transiciones permitidas

### 4. Consultante
- Persona que solicita servicios sociales
- Tiene fichas de consulta asociadas
- Tiene trámites asociados

## Entidades Principales

### Ficha
Representa una consulta social inicial. Estados posibles:
- **pendiente**: Creada por administrativo, requiere aprobación (sin fecha/hora obligatorias)
- **aprobado**: Aprobada por administrativo, visible para docentes (requiere fecha y hora de cita)
- **standby**: Ficha aprobada disponible para asignación a grupo
- **asignada**: Asignada a un grupo específico
- **iniciada**: Trámite iniciado desde esta ficha

Campos importantes:
- `id_consultante`: Consultante asociado
- `id_docente`: Docente al que se deriva
- `id_grupo`: Grupo asignado (solo cuando estado es asignada/iniciada)
- `fecha_cita`: Fecha de la cita (obligatoria para aprobadas)
- `hora_cita`: Hora de la cita (obligatoria para aprobadas)
- `tema_consulta`: Tema de la consulta
- `numero_consulta`: Formato xx/yyyy (secuencial por año)

### Trámite
Representa un proceso legal/social en curso. Estados posibles (solo 4 estados):
- **en_tramite**: Estado por defecto cuando se inicia desde una ficha. Los alumnos están trabajando activamente en el trámite
- **finalizado**: Se cumplió el objetivo por el cual se comenzó el trámite (ej: realizar una carta poder). Puede volver a "en_tramite" si es necesario (por necesidad del consultante, solución no efectiva, o necesidad de algo más)
- **pendiente**: Falta alguna información, generalmente que tiene que presentar el consultante y no presenta
- **desistido**: El consultante por alguna razón no sigue con el trámite (económica, desaparece, etc.)

**Transiciones permitidas:**
- `pendiente` → `en_tramite`, `desistido`
- `en_tramite` → `finalizado`, `pendiente`, `desistido`
- `finalizado` → `en_tramite`, `desistido` (puede reanudarse)
- `desistido` → `en_tramite` (puede reactivarse)

Campos importantes:
- `id_consultante`: Consultante asociado
- `id_grupo`: Grupo responsable
- `num_carpeta`: Número único de carpeta
- `process_instance_id`: ID de instancia en Camunda
- `fecha_inicio`: Fecha de inicio
- `fecha_cierre`: Fecha de cierre (si aplica)
- `motivo_cierre`: Razón del cierre (requerido para desistido y pendiente)

### Grupo
Grupo de trabajo compuesto por:
- **Responsable**: Docente responsable del grupo
- **Asistentes**: Docentes asistentes
- **Estudiantes**: Estudiantes que participan

Un grupo puede tener múltiples trámites y fichas asignadas.

## Flujos de Proceso Principales

### Flujo 1: Creación y Aprobación de Ficha

1. **Administrativo crea ficha**:
   - Opción A: Crea "Ficha Pendiente" (estado: `pendiente`, sin fecha/hora requeridas)
   - Opción B: Crea "Ficha Aprobada" (estado: `standby`, requiere fecha y hora)

2. **Si es pendiente**:
   - Administrativo debe aprobar la ficha
   - Al aprobar, debe proporcionar fecha y hora de cita
   - Estado cambia a `standby` (aprobado)

3. **Ficha en standby**:
   - Visible para todos los docentes
   - Cualquier docente puede asignarla a cualquier grupo
   - Al asignar, estado cambia a `asignada`

4. **Ficha asignada**:
   - El grupo puede iniciar un trámite desde esta ficha
   - Al iniciar trámite, estado cambia a `iniciada`

### Flujo 2: Creación y Procesamiento de Trámite

1. **Creación de trámite**:
   - **Por Administrador**: Crea trámite con estado `pendiente` (NO inicia proceso Camunda)
   - **Por Docente desde Ficha**: Crea trámite con estado `en_tramite` (SÍ inicia proceso Camunda)
   - Estado por defecto en el schema: `en_tramite`

2. **Aprobación de trámite pendiente** (solo si fue creado por admin):
   - Administrador aprueba el trámite
   - Estado cambia a `en_tramite` (los alumnos pueden empezar a trabajar)
   - Ahora visible para docentes y estudiantes del grupo

3. **Inicio de proceso Camunda** (solo si NO es pendiente):
   - Se inicia proceso `procesoTramiteGrupos` en Camunda
   - Se pasa información: `id_tramite`, `id_consultante`, `id_grupo`, `grupoNombre`, `num_carpeta`, `estado`, `observaciones`
   - El `grupoNombre` se usa como `candidateGroup` para las tareas del proceso
   - El estado del trámite ya es `en_tramite` (no se cambia)
   - Se guarda `process_instance_id` en el trámite

4. **Proceso en Camunda**:
   - El proceso debe gestionar las diferentes etapas del trámite
   - Las tareas deben estar asignadas al grupo correspondiente (`candidateGroup: grupo_{nombre}`)
   - El grupo (estudiantes y docentes) puede realizar actuaciones (hojas de ruta)
   - El grupo puede subir documentos
   - El grupo puede cambiar estados según las transiciones permitidas: `en_tramite`, `finalizado`, `pendiente`, `desistido`
   - **Importante**: Los cambios de estado pueden hacerse desde el frontend sin necesidad de tareas de Camunda, ya que alumnos y docentes tienen permiso para cambiar estados

### Flujo 3: Gestión de Grupos

1. **Creación de grupo**:
   - Solo Administradores nivel 2 o 3 pueden crear grupos
   - Se asigna un responsable (docente)
   - Se pueden agregar asistentes (docentes)
   - Se pueden agregar estudiantes

2. **Asignación de fichas a grupos**:
   - Cualquier docente puede asignar fichas en estado `standby` a cualquier grupo
   - Al asignar, la ficha cambia a estado `asignada`
   - El grupo puede ver la ficha asignada

3. **Inicio de trámite desde ficha**:
   - El grupo (a través de un docente o estudiante) puede iniciar un trámite desde una ficha asignada
   - Se crea el trámite con estado `en_tramite` (estado por defecto)
   - Se inicia proceso en Camunda
   - La ficha cambia a estado `iniciada`

## External Tasks de Camunda

El sistema ya tiene definidos estos topics de external tasks:

1. **`crear-tramite`**: Crea un trámite en el backend
   - Variables: `id_consultante`, `id_grupo`, `num_carpeta`, `observaciones`

2. **`actualizar-estado`**: Actualiza el estado de un trámite
   - Variables: `id_tramite`, `estado`, `observaciones`

3. **`enviar-notificacion`**: Envía notificaciones
   - Variables: `id_tramite`, `tipo_notificacion`, `mensaje`

## Requisitos del Diagrama BPMN

Diseña un diagrama BPMN que modele:

1. **Proceso Principal de Trámite** (`procesoTramiteGrupos`):
   - Debe iniciar cuando se crea un trámite desde una ficha (estado inicial: `en_tramite`)
   - NO inicia si el trámite es creado por administrador con estado `pendiente`
   - Debe manejar los 4 estados del trámite: `en_tramite`, `finalizado`, `pendiente`, `desistido`
   - Debe usar external tasks para comunicarse con el backend
   - Las tareas de usuario deben estar asignadas al grupo correspondiente (`candidateGroup: grupo_{nombre}`)
   - Debe incluir gateways para decisiones basadas en las transiciones permitidas
   - Debe permitir reanudación desde `finalizado` a `en_tramite`
   - Debe permitir reactivación desde `desistido` a `en_tramite`
   - Debe manejar el caso donde falta información (cambio a `pendiente`)

2. **Consideraciones importantes**:
   - Los trámites creados por administradores con estado `pendiente` NO inician proceso Camunda
   - Los trámites iniciados desde fichas SÍ inician proceso Camunda con estado `en_tramite`
   - El proceso debe usar `candidateGroup` basado en el nombre del grupo (`grupo_{nombre}`)
   - El proceso debe poder actualizar estados del trámite en la base de datos según las transiciones permitidas
   - El proceso debe poder enviar notificaciones
   - Los alumnos y docentes pueden cambiar estados directamente desde el frontend, por lo que Camunda debe estar preparado para recibir actualizaciones de estado desde el backend
   - El estado `en_tramite` es el estado activo donde los estudiantes trabajan
   - El estado `finalizado` puede volver a `en_tramite` si es necesario (reanudación)
   - El estado `pendiente` requiere motivo (información faltante del consultante)
   - El estado `desistido` requiere motivo (razón del abandono)

3. **Estados y transiciones** (solo 4 estados válidos):
   - **Estados válidos**: `en_tramite`, `finalizado`, `pendiente`, `desistido`
   - **Transiciones permitidas**:
     - `pendiente` → `en_tramite`, `desistido`
     - `en_tramite` → `finalizado`, `pendiente`, `desistido`
     - `finalizado` → `en_tramite`, `desistido` (puede reanudarse)
     - `desistido` → `en_tramite` (puede reactivarse)
   - **Nota importante**: Los cambios de estado pueden realizarse desde el frontend por alumnos y docentes, no necesariamente requieren tareas de Camunda

4. **Tareas del proceso**:
   - Revisión inicial del trámite
   - Validación de documentos
   - Trabajo activo de los estudiantes (estado `en_tramite`)
   - Cambio a estado `pendiente` si falta información del consultante
   - Cambio a estado `finalizado` cuando se cumple el objetivo
   - Cambio a estado `desistido` si el consultante abandona
   - Reanudación desde `finalizado` a `en_tramite` si es necesario
   - Notificaciones en cada etapa importante
   - **Nota**: Los cambios de estado pueden ser gestionados directamente por el frontend, pero Camunda puede orquestar el flujo de trabajo y notificaciones

## Información Técnica Adicional

- El proceso se inicia con la clave: `procesoTramiteGrupos`
- Las variables del proceso incluyen: `id_tramite`, `id_consultante`, `id_grupo`, `grupoNombre`, `num_carpeta`, `estado`, `observaciones`, `validado`
- El `grupoNombre` tiene formato: `grupo_{nombre_del_grupo}`
- Las tareas deben usar `candidateGroup` para asignación a grupos
- El Orchestrator se suscribe a los topics y ejecuta las acciones en el backend

## Resultado Esperado

Genera un diagrama BPMN completo que:
1. Modele el ciclo de vida completo de un trámite
2. Incluya todos los estados y transiciones posibles
3. Use external tasks para comunicación con el backend
4. Incluya tareas de usuario asignadas a grupos
5. Maneje casos de error y excepciones
6. Incluya notificaciones en puntos clave del proceso
7. Sea ejecutable en Camunda Platform

El diagrama debe ser claro, completo y seguir las mejores prácticas de BPMN 2.0.

