// En producción, usar ruta relativa para que Nginx haga el proxy
// En desarrollo, usar la URL completa
const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3001/api');

export class ApiService {
  // Helper para obtener headers con token
  private static getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('accessToken');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  // ============== AUTENTICACIÓN ==============

  static async login(ci: string, password: string) {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ ci, password }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al iniciar sesión');
    }
    
    return response.json();
  }

  static async logout() {
    const response = await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al cerrar sesión');
    }
    
    return response.json();
  }

  static async getCurrentUser() {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: this.getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Error al obtener usuario actual');
    }
    
    return response.json();
  }

  static async refreshToken(refreshToken: string) {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ refreshToken }),
    });
    
    if (!response.ok) {
      throw new Error('Error al renovar token');
    }
    
    return response.json();
  }

  static async cambiarPassword(passwordActual: string, passwordNueva: string) {
    const response = await fetch(`${API_URL}/auth/cambiar-password`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ passwordActual, passwordNueva }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      // Si hay detalles, incluir el objeto completo
      if (error.detalles) {
        const errorObj = new Error(error.error || 'Error al cambiar contraseña');
        (errorObj as any).detalles = error.detalles;
        throw errorObj;
      }
      throw new Error(error.error || 'Error al cambiar contraseña');
    }
    
    return response.json();
  }

  // ============== SOLICITUDES DE REACTIVACIÓN ==============

  static async solicitarReactivacion(ci: string, password: string, motivo?: string) {
    const response = await fetch(`${API_URL}/solicitudes-reactivacion/solicitar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ci, password, motivo }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al solicitar reactivación');
    }
    
    return response.json();
  }

  static async getSolicitudesReactivacion(estado?: string) {
    const params = new URLSearchParams();
    if (estado) params.append('estado', estado);
    
    const url = `${API_URL}/solicitudes-reactivacion${params.toString() ? '?' + params : ''}`;
    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al obtener solicitudes');
    }
    
    return response.json();
  }

  static async procesarSolicitudReactivacion(id: number, accion: 'aprobar' | 'rechazar', respuesta?: string, fecha_desactivacion_automatica?: string) {
    const body: any = { accion, respuesta };
    if (fecha_desactivacion_automatica) {
      body.fecha_desactivacion_automatica = fecha_desactivacion_automatica;
    }
    
    const response = await fetch(`${API_URL}/solicitudes-reactivacion/${id}/procesar`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al procesar solicitud');
    }
    
    return response.json();
  }

  // ============== TRÁMITES ==============
  
  static async getTramites(filters?: { estado?: string; id_consultante?: number; id_grupo?: number; search?: string }) {
    const params = new URLSearchParams();
    if (filters?.estado) params.append('estado', filters.estado);
    if (filters?.id_consultante) params.append('id_consultante', filters.id_consultante.toString());
    if (filters?.id_grupo) params.append('id_grupo', filters.id_grupo.toString());
    if (filters?.search) params.append('search', filters.search);
    
    const url = `${API_URL}/tramites${params.toString() ? '?' + params : ''}`;
    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al obtener trámites');
    }
    return response.json();
  }

  static async getTramiteById(id: number) {
    const response = await fetch(`${API_URL}/tramites/${id}`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al obtener trámite');
    }
    return response.json();
  }

  static async createTramite(data: any) {
    const response = await fetch(`${API_URL}/tramites`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al crear trámite');
    }
    return response.json();
  }

  static async updateTramite(id: number, data: any) {
    const response = await fetch(`${API_URL}/tramites/${id}`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al actualizar trámite');
    }
    return response.json();
  }

  static async deleteTramite(id: number) {
    const response = await fetch(`${API_URL}/tramites/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al eliminar trámite');
    }
    return response.json();
  }

  static async aprobarTramite(id: number) {
    const response = await fetch(`${API_URL}/tramites/${id}/aprobar`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al aprobar trámite');
    }
    return response.json();
  }

  // ============== USUARIOS ==============

  static async getUsuarios(filters?: { rol?: string; activo?: boolean; grupo?: number; search?: string }) {
    const params = new URLSearchParams();
    if (filters?.rol) params.append('rol', filters.rol);
    if (filters?.activo !== undefined) params.append('activo', filters.activo.toString());
    if (filters?.grupo) params.append('grupo', filters.grupo.toString());
    if (filters?.search) params.append('search', filters.search);
    
    const url = `${API_URL}/usuarios${params.toString() ? '?' + params : ''}`;
    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al obtener usuarios');
    }
    return response.json();
  }

  static async getUsuarioById(id: number) {
    const response = await fetch(`${API_URL}/usuarios/${id}`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Error al obtener usuario' }));
      throw new Error(error.error || 'Error al obtener usuario');
    }
    return response.json();
  }

  static async createUsuario(data: any) {
    const response = await fetch(`${API_URL}/usuarios`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al crear usuario');
    }
    return response.json();
  }

  static async updateUsuario(id: number, data: any) {
    const response = await fetch(`${API_URL}/usuarios/${id}`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al actualizar usuario');
    }
    return response.json();
  }

  static async deactivateUsuario(id: number) {
    const response = await fetch(`${API_URL}/usuarios/${id}/desactivar`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al desactivar usuario');
    }
    return response.json();
  }

  static async activateUsuario(id: number) {
    const response = await fetch(`${API_URL}/usuarios/${id}/activar`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al activar usuario');
    }
    return response.json();
  }

  static async deleteUsuario(id: number) {
    const response = await fetch(`${API_URL}/usuarios/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al eliminar usuario');
    }
    return response.json();
  }

  static async getAuditoria(filters?: { tipo_entidad?: string; id_entidad?: number; accion?: string }) {
    const params = new URLSearchParams();
    if (filters?.tipo_entidad) params.append('tipo_entidad', filters.tipo_entidad);
    if (filters?.id_entidad) params.append('id_entidad', filters.id_entidad.toString());
    if (filters?.accion) params.append('accion', filters.accion);
    
    const url = `${API_URL}/usuarios/auditoria${params.toString() ? '?' + params : ''}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Error al obtener auditoría');
    return response.json();
  }

  // ============== CONSULTANTES ==============

  static async getConsultantes() {
    const response = await fetch(`${API_URL}/consultantes`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Error al obtener consultantes');
    return response.json();
  }

  static async getConsultanteById(id: number) {
    const response = await fetch(`${API_URL}/consultantes/${id}`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Error al obtener consultante');
    return response.json();
  }

  static async createConsultante(data: any) {
    const response = await fetch(`${API_URL}/consultantes`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Error al crear consultante');
    return response.json();
  }

  // ============== HOJA DE RUTA ==============

  static async getHojaRutaByTramite(idTramite: number) {
    const response = await fetch(`${API_URL}/hoja-ruta/tramite/${idTramite}`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Error al obtener hoja de ruta');
    return response.json();
  }

  static async createActuacion(data: { id_tramite: number; fecha_actuacion?: string; descripcion: string }) {
    const response = await fetch(`${API_URL}/hoja-ruta`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al crear actuación');
    }
    return response.json();
  }

  static async updateActuacion(id: number, data: { fecha_actuacion?: string; descripcion?: string }) {
    const response = await fetch(`${API_URL}/hoja-ruta/${id}`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al actualizar actuación');
    }
    return response.json();
  }

  static async deleteActuacion(id: number) {
    const response = await fetch(`${API_URL}/hoja-ruta/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al eliminar actuación');
    }
    return response.json();
  }

  // ============== DOCUMENTOS ADJUNTOS ==============

  static async getDocumentosByTramite(idTramite: number) {
    const response = await fetch(`${API_URL}/documentos/tramite/${idTramite}`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Error al obtener documentos');
    return response.json();
  }

  static async uploadDocumento(idTramite: number, archivo: File, descripcion?: string) {
    const formData = new FormData();
    formData.append('archivo', archivo);
    if (descripcion) {
      formData.append('descripcion', descripcion);
    }

    const token = localStorage.getItem('accessToken');
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    // NO establecer Content-Type manualmente - el navegador lo establecerá automáticamente con el boundary correcto

    const response = await fetch(`${API_URL}/documentos/${idTramite}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al subir documento');
    }
    return response.json();
  }

  static async downloadDocumento(id: number) {
    const token = localStorage.getItem('accessToken');
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_URL}/documentos/${id}/download`, {
      headers,
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al descargar documento');
    }

    // Obtener el nombre del archivo del header Content-Disposition
    const contentDisposition = response.headers.get('Content-Disposition');
    let fileName = `documento_${id}`;
    if (contentDisposition) {
      const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
      if (fileNameMatch) {
        fileName = fileNameMatch[1];
      }
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  static async deleteDocumento(id: number) {
    const response = await fetch(`${API_URL}/documentos/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al eliminar documento');
    }
    return response.json();
  }

  // ============== GRUPOS ==============

  static async getGrupos(filters?: { search?: string }) {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    
    const url = `${API_URL}/grupos${params.toString() ? '?' + params : ''}`;
    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Error al obtener grupos');
    return response.json();
  }

  static async getGrupoById(id: number) {
    const response = await fetch(`${API_URL}/grupos/${id}`);
    if (!response.ok) throw new Error('Error al obtener grupo');
    return response.json();
  }

  static async createGrupo(data: {
    nombre: string;
    descripcion?: string;
    responsable_id: number;
    asistentes_ids: number[];
  }) {
    const response = await fetch(`${API_URL}/grupos`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al crear grupo');
    }
    return response.json();
  }

  static async updateGrupo(id: number, data: any) {
    const response = await fetch(`${API_URL}/grupos/${id}`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al actualizar grupo');
    }
    return response.json();
  }

  static async addMiembroGrupo(id: number, data: {
    id_usuario: number;
    rol_en_grupo: 'responsable' | 'asistente' | 'estudiante';
  }) {
    const response = await fetch(`${API_URL}/grupos/${id}/miembros`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al agregar miembro');
    }
    return response.json();
  }

  static async removeMiembroGrupo(id: number, id_usuario_grupo: number) {
    const response = await fetch(`${API_URL}/grupos/${id}/miembros/${id_usuario_grupo}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al eliminar miembro');
    }
    return response.json();
  }

  static async deactivateGrupo(id: number) {
    const response = await fetch(`${API_URL}/grupos/${id}`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ activo: false }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al desactivar grupo');
    }
    return response.json();
  }

  static async activateGrupo(id: number) {
    const response = await fetch(`${API_URL}/grupos/${id}`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ activo: true }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al activar grupo');
    }
    return response.json();
  }

  static async deleteGrupo(id: number) {
    const response = await fetch(`${API_URL}/grupos/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al eliminar grupo');
    }
    return response.json();
  }

  // ============== FICHAS ==============

  static async getFichas(filters?: { estado?: string; id_docente?: number; id_consultante?: number; search?: string }) {
    const params = new URLSearchParams();
    if (filters?.estado) params.append('estado', filters.estado);
    if (filters?.id_docente) params.append('id_docente', filters.id_docente.toString());
    if (filters?.id_consultante) params.append('id_consultante', filters.id_consultante.toString());
    if (filters?.search) params.append('search', filters.search);
    
    const url = `${API_URL}/fichas${params.toString() ? '?' + params : ''}`;
    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al obtener fichas');
    }
    return response.json();
  }

  static async getFichasStandby() {
    const response = await fetch(`${API_URL}/fichas/standby`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al obtener fichas en standby');
    }
    return response.json();
  }

  static async getFichaById(id: number) {
    const response = await fetch(`${API_URL}/fichas/${id}`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al obtener ficha');
    }
    return response.json();
  }

  static async createFicha(data: {
    id_consultante: number;
    fecha_cita?: string;
    hora_cita?: string;
    tema_consulta: string;
    id_docente: number;
    observaciones?: string;
    estado?: 'aprobado' | 'pendiente';
  }) {
    const response = await fetch(`${API_URL}/fichas`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al crear ficha');
    }
    return response.json();
  }

  static async aprobarFicha(id: number, fecha_cita: string, hora_cita: string) {
    const response = await fetch(`${API_URL}/fichas/${id}/aprobar`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ fecha_cita, hora_cita }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al aprobar ficha');
    }
    return response.json();
  }

  static async asignarFichaAGrupo(id: number, id_grupo: number) {
    const response = await fetch(`${API_URL}/fichas/${id}/asignar-grupo`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ id_grupo }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al asignar ficha a grupo');
    }
    return response.json();
  }

  static async iniciarTramiteDesdeFicha(id: number, observaciones?: string) {
    const response = await fetch(`${API_URL}/fichas/${id}/iniciar-tramite`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ observaciones }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al iniciar trámite desde ficha');
    }
    return response.json();
  }

  static async updateFicha(id: number, data: {
    fecha_cita?: string;
    hora_cita?: string;
    tema_consulta?: string;
    id_docente?: number;
    observaciones?: string;
  }) {
    const response = await fetch(`${API_URL}/fichas/${id}`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al actualizar ficha');
    }
    return response.json();
  }

  static async deleteFicha(id: number) {
    const response = await fetch(`${API_URL}/fichas/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al eliminar ficha');
    }
    return response.json();
  }

  // ============== NOTIFICACIONES ==============

  static async crearNotificacion(data: {
    id_usuario: number;
    id_usuario_emisor?: number;
    titulo: string;
    mensaje: string;
    tipo?: 'info' | 'success' | 'warning' | 'error';
    tipo_entidad?: string;
    id_entidad?: number;
    id_tramite?: number;
  }) {
    const response = await fetch(`${API_URL}/notificaciones`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al crear notificación');
    }
    
    return response.json();
  }

  static async getMisNotificaciones(filters?: { leida?: boolean; limit?: number; offset?: number }) {
    const params = new URLSearchParams();
    if (filters?.leida !== undefined) params.append('leida', filters.leida.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());
    
    const url = `${API_URL}/notificaciones/mis-notificaciones${params.toString() ? '?' + params : ''}`;
    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al obtener notificaciones');
    }
    
    return response.json();
  }

  static async getContadorNoLeidas() {
    const response = await fetch(`${API_URL}/notificaciones/contador`, {
      headers: this.getAuthHeaders(),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al obtener contador');
    }
    
    return response.json();
  }

  static async marcarLeida(id: number) {
    const response = await fetch(`${API_URL}/notificaciones/${id}/leida`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al marcar notificación como leída');
    }
    
    return response.json();
  }

  static async marcarTodasLeidas() {
    const response = await fetch(`${API_URL}/notificaciones/marcar-todas-leidas`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al marcar todas las notificaciones como leídas');
    }
    
    return response.json();
  }

  static async eliminarNotificacion(id: number) {
    const response = await fetch(`${API_URL}/notificaciones/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al eliminar notificación');
    }
    
    return response.json();
  }

  // ========== AUDITORÍAS ==========
  static async getAuditorias(filters?: {
    tipo_entidad?: string;
    id_entidad?: number;
    accion?: string;
    id_usuario?: number;
    fecha_desde?: string;
    fecha_hasta?: string;
    limit?: number;
    offset?: number;
  }) {
    const params = new URLSearchParams();
    if (filters?.tipo_entidad) params.append('tipo_entidad', filters.tipo_entidad);
    if (filters?.id_entidad) params.append('id_entidad', filters.id_entidad.toString());
    if (filters?.accion) params.append('accion', filters.accion);
    if (filters?.id_usuario) params.append('id_usuario', filters.id_usuario.toString());
    if (filters?.fecha_desde) params.append('fecha_desde', filters.fecha_desde);
    if (filters?.fecha_hasta) params.append('fecha_hasta', filters.fecha_hasta);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());

    const url = `${API_URL}/auditorias${params.toString() ? '?' + params : ''}`;
    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al obtener auditorías');
    }

    return response.json();
  }

  static async getAuditoriasByEntidad(tipo_entidad: string, id_entidad: number) {
    const response = await fetch(`${API_URL}/auditorias/${tipo_entidad}/${id_entidad}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al obtener auditorías de entidad');
    }

    return response.json();
  }

  static async getAuditoriasStats(filters?: {
    fecha_desde?: string;
    fecha_hasta?: string;
  }) {
    const params = new URLSearchParams();
    if (filters?.fecha_desde) params.append('fecha_desde', filters.fecha_desde);
    if (filters?.fecha_hasta) params.append('fecha_hasta', filters.fecha_hasta);

    const url = `${API_URL}/auditorias/stats${params.toString() ? '?' + params : ''}`;
    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al obtener estadísticas de auditoría');
    }

    return response.json();
  }

  // ========== REPORTES ==========
  static async getReporte(endpoint: string, filters?: {
    fecha_desde?: string;
    fecha_hasta?: string;
    id_grupo?: number;
    id_docente?: number;
    id_consultante?: number;
    id_estudiante?: number;
    estado?: string;
  }) {
    const params = new URLSearchParams();
    if (filters?.fecha_desde) params.append('fecha_desde', filters.fecha_desde);
    if (filters?.fecha_hasta) params.append('fecha_hasta', filters.fecha_hasta);
    if (filters?.id_grupo) params.append('id_grupo', filters.id_grupo.toString());
    if (filters?.id_docente) params.append('id_docente', filters.id_docente.toString());
    if (filters?.id_consultante) params.append('id_consultante', filters.id_consultante.toString());
    if (filters?.id_estudiante) params.append('id_estudiante', filters.id_estudiante.toString());
    if (filters?.estado) params.append('estado', filters.estado);

    const url = `${API_URL}/reportes/${endpoint}${params.toString() ? '?' + params : ''}`;
    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al obtener reporte');
    }

    return response.json();
  }

  // Reportes de Trámites
  static async getTramitesPorEstado(filters?: any) {
    return this.getReporte('tramites/por-estado', filters);
  }

  static async getTiempoPromedioResolucion(filters?: any) {
    return this.getReporte('tramites/tiempo-promedio', filters);
  }

  static async getTramitesPorDocente(filters?: any) {
    return this.getReporte('tramites/por-docente', filters);
  }

  static async getTramitesPorGrupo(filters?: any) {
    return this.getReporte('tramites/por-grupo', filters);
  }

  static async getTramitesPorConsultante(filters?: any) {
    return this.getReporte('tramites/por-consultante', filters);
  }

  static async getAnalisisDesistimientos(filters?: any) {
    return this.getReporte('tramites/desistimientos', filters);
  }

  static async getTramitesAntiguos(filters?: any) {
    return this.getReporte('tramites/antiguos', filters);
  }

  // Reportes de Fichas
  static async getFichasPorEstado(filters?: any) {
    return this.getReporte('fichas/por-estado', filters);
  }

  static async getTiemposProcesamientoFichas(filters?: any) {
    return this.getReporte('fichas/tiempos-procesamiento', filters);
  }

  static async getFichasPorDocente(filters?: any) {
    return this.getReporte('fichas/por-docente', filters);
  }

  // Reportes de Grupos
  static async getActividadPorGrupo(filters?: any) {
    return this.getReporte('grupos/actividad', filters);
  }

  // Reportes de Estudiantes
  static async getEstudiantesActivos(filters?: any) {
    return this.getReporte('estudiantes/activos', filters);
  }

  static async getDocumentosPorEstudiante(filters?: any) {
    return this.getReporte('estudiantes/documentos', filters);
  }

  // Métricas de Rendimiento
  static async getDashboardMetricas(filters?: any) {
    return this.getReporte('metricas/dashboard', filters);
  }

  static async getEvolucionTemporal(filters?: any) {
    return this.getReporte('metricas/evolucion-temporal', filters);
  }

  static async getActuacionesHojaRuta(filters?: any) {
    return this.getReporte('metricas/actuaciones', filters);
  }
}

