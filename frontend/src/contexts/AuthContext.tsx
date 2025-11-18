import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

// En producción, usar ruta relativa para que Nginx haga el proxy
// En desarrollo, usar la URL completa
const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3001/api');

export type UserRole = 'admin' | 'docente' | 'estudiante' | 'consultante';

export interface AuthUser {
  id_usuario: number;
  nombre: string;
  ci: string;
  correo: string;
  rol: UserRole;
  nivel_acceso?: number; // 1=admin_administrativo (unificado), 3=admin_sistema
  activo: boolean;
  semestre?: string;
  id_grupo?: number;
  grupo?: {
    nombre: string;
  };
  grupos_participa?: Array<{
    id_grupo: number;
    rol_en_grupo: string;
    grupo: {
      id_grupo: number;
      nombre: string;
    };
  }>;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (ci: string, password?: string) => Promise<{ debeCambiarPassword?: boolean; usuario?: any } | void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
  hasAccessLevel: (minLevel: number) => boolean;
  isAdminSistema: () => boolean;
  isAdminAdministrativo: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verificar si hay sesión guardada
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
      } catch (error) {
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (ci: string, password?: string) => {
    try {
      // Usar autenticación real del backend
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ci, password: password || 'password123' }), // Usar contraseña por defecto si no se proporciona
      });

      if (!response.ok) {
        const error = await response.json();
        // Si es error de usuario inactivo, incluir información adicional
        if (error.error === 'Usuario inactivo') {
          const errorObj = new Error(JSON.stringify(error));
          throw errorObj;
        }
        throw new Error(error.error || 'Error al iniciar sesión');
      }

      const data = await response.json();
      const usuario = data.usuario;
      const debeCambiarPassword = data.debeCambiarPassword || false;

      // Verificar que el usuario esté activo
      if (!usuario.activo) {
        throw new Error('Usuario inactivo');
      }

      // Guardar tokens SIEMPRE (incluso si debe cambiar la contraseña)
      // El usuario necesita estar autenticado para cambiar su contraseña
      if (data.accessToken) {
        localStorage.setItem('accessToken', data.accessToken);
      }
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }

      // Si debe cambiar la contraseña, retornar información especial
      // pero los tokens ya están guardados para permitir el cambio
      if (debeCambiarPassword) {
        return { debeCambiarPassword: true, usuario };
      }

      // Mapear rol del usuario y determinar nivel_acceso
      const rolMapeado = mapRolToUserRole(usuario.rol);
      const nivelAcceso = usuario.nivel_acceso || getNivelAccesoFromRol(usuario.rol);

      // Mapear rol del usuario
      const authUser: AuthUser = {
        id_usuario: usuario.id_usuario,
        nombre: usuario.nombre,
        ci: usuario.ci,
        correo: usuario.correo,
        rol: rolMapeado,
        nivel_acceso: nivelAcceso,
        activo: usuario.activo,
        semestre: usuario.semestre,
        id_grupo: usuario.id_grupo,
        grupo: usuario.grupo,
        grupos_participa: usuario.grupos_participa || [],
      };

      setUser(authUser);
      setIsAuthenticated(true);
      localStorage.setItem('user', JSON.stringify(authUser));
    } catch (error: any) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Llamar al endpoint de logout si hay refresh token
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          await fetch(`${API_URL}/auth/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });
        } catch (error) {
          console.error('Error al cerrar sesión en el backend:', error);
        }
      }
    } finally {
      // Limpiar todo el estado local
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  };

  const hasRole = (roles: UserRole | UserRole[]): boolean => {
    if (!user) return false;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(user.rol);
  };

  const hasAccessLevel = (minLevel: number): boolean => {
    if (!user || user.rol !== 'admin') return false;
    return (user.nivel_acceso || 0) >= minLevel;
  };

  const isAdminSistema = (): boolean => {
    return user?.rol === 'admin' && user?.nivel_acceso === 3;
  };

  const isAdminAdministrativo = (): boolean => {
    return user?.rol === 'admin' && user?.nivel_acceso === 1;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      isAuthenticated,
      isLoading,
      hasRole, 
      hasAccessLevel,
      isAdminSistema,
      isAdminAdministrativo
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Helper para mapear roles del backend a roles de la app
function mapRolToUserRole(rol: string): UserRole {
  // Mapeo directo de los nuevos roles unificados
  if (rol === 'administrador') {
    return 'admin';
  }
  if (rol === 'docente') {
    return 'docente';
  }
  if (rol === 'estudiante') {
    return 'estudiante';
  }
  if (rol === 'consultante') {
    return 'consultante';
  }
  // Default: por defecto retorna consultante
  console.warn(`Rol desconocido: ${rol}, mapeando a consultante`);
  return 'consultante';
}

// Helper para obtener nivel_acceso desde el rol (ya no necesario, el backend lo provee)
// Mantenido por compatibilidad hacia atrás con roles antiguos en caso de datos sin migrar
function getNivelAccesoFromRol(rol: string): number | undefined {
  // El backend ahora siempre proporciona nivel_acceso para administradores
  // Este helper solo se usa como fallback si el backend no lo proporciona
  // (no debería pasar con los nuevos roles, pero mantenemos compatibilidad)
  if (rol === 'administrador') {
    // El backend debería proporcionar nivel_acceso
    // Retornamos undefined para que se use el valor del backend
    return undefined;
  }
  return undefined;
}
