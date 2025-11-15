import { useState, useEffect } from 'react';
import './App.css';
import { TramitesList } from './components/TramitesList';
import { UsuariosList } from './components/UsuariosList';
import { GruposList } from './components/GruposList';
import { FichasList } from './components/FichasList';
import { EstudianteGrupoInfo } from './components/EstudianteGrupoInfo';
import { EstudianteFichasList } from './components/EstudianteFichasList';
import { NotificacionesPanel } from './components/NotificacionesPanel';
import { NotificacionesBadge } from './components/NotificacionesBadge';
import { AuditoriasList } from './components/AuditoriasList';
import { ReportesPanel } from './components/ReportesPanel';
import { Login } from './components/Login';
import { NotificationBanner } from './components/NotificationBanner';
import { ToastContainer } from './components/ToastContainer';
import { ToastProvider } from './contexts/ToastContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { FaSignOutAlt, FaUser, FaBell } from 'react-icons/fa';

type View = 'tramites' | 'usuarios' | 'grupos' | 'fichas' | 'mis_tramites' | 'consultar_tramite' | 'mi_grupo' | 'notificaciones' | 'auditorias' | 'reportes';

interface MenuItem {
  id: string;
  icon: string;
  label: string;
  view: View;
  roles: string[];
}

function AppContent() {
  const { user, logout, isAuthenticated, isLoading, hasRole, hasAccessLevel } = useAuth();
  const [notificacionesOpen, setNotificacionesOpen] = useState(false);
  const [currentView, setCurrentView] = useState<View>('tramites');
  const [refreshKey, setRefreshKey] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [contadorNotificaciones, setContadorNotificaciones] = useState(0);

  // Actualizar vista inicial cuando se carga el usuario
  useEffect(() => {
    if (user) {
      let initialView: View = 'tramites';
      if (user.rol === 'estudiante') {
        initialView = 'mi_grupo';
      } else if (user.rol === 'consultante') {
        initialView = 'mis_tramites';
      }
      setCurrentView(initialView);
    }
  }, [user]);

  // Cargar contador de notificaciones
  useEffect(() => {
    if (isAuthenticated) {
      loadContadorNotificaciones();
      const interval = setInterval(loadContadorNotificaciones, 30000); // Cada 30 segundos
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const loadContadorNotificaciones = async () => {
    try {
      const { ApiService } = await import('./services/api');
      const data = await ApiService.getContadorNoLeidas();
      setContadorNotificaciones(data.contador || 0);
    } catch (error: any) {
      console.error('Error al cargar contador de notificaciones:', error);
    }
  };


  // Mostrar loading mientras se verifica la sesión
  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        Cargando...
      </div>
    );
  }

  // Si no está autenticado, mostrar login
  if (!isAuthenticated || !user) {
    return <Login />;
  }

  // Menú adaptado según rol y nivel de acceso
  const menuItems: MenuItem[] = [];

  // Administradores
  if (hasRole('admin')) {
    // Orden: Usuarios, Grupos, Fichas, Trámites, Auditorías, Reportes
    
    // 1. Usuarios (Administrativo nivel 1)
    if (hasAccessLevel(1)) {
      menuItems.push({ id: 'usuarios', icon: '👤', label: 'Usuarios', view: 'usuarios', roles: ['admin'] });
    }
    
    // 2. Grupos (Todos los admins)
    menuItems.push({ id: 'grupos', icon: '👥', label: 'Grupos', view: 'grupos', roles: ['admin'] });
    
    // 3. Fichas (Administrativo nivel 1)
    if (hasAccessLevel(1)) {
      menuItems.push({ id: 'fichas', icon: '📄', label: 'Fichas', view: 'fichas', roles: ['admin'] });
    }
    
    // 4. Trámites (Todos los admins)
    menuItems.push({ id: 'tramites', icon: '📋', label: 'Trámites', view: 'tramites', roles: ['admin'] });
    
    // 5. Auditorías (Solo Administrador Sistema nivel 3)
    if (hasAccessLevel(3)) {
      menuItems.push({ id: 'auditorias', icon: '📋', label: 'Auditorías', view: 'auditorias', roles: ['admin'] });
    }
    
    // 6. Reportes (Todos los admins)
    menuItems.push({ id: 'reportes', icon: '📊', label: 'Reportes', view: 'reportes', roles: ['admin'] });
    
  }
  
  // Docentes - orden: Grupos, Fichas, Trámites
  if (hasRole('docente')) {
    menuItems.push({ id: 'grupos', icon: '👥', label: 'Grupos', view: 'grupos', roles: ['docente'] });
    menuItems.push({ id: 'fichas', icon: '📄', label: 'Mis Fichas', view: 'fichas', roles: ['docente'] });
    menuItems.push({ id: 'tramites', icon: '📋', label: 'Trámites', view: 'tramites', roles: ['docente'] });
  }
  
  // Estudiantes
  if (hasRole('estudiante')) {
    menuItems.push({ id: 'mi_grupo', icon: '👥', label: 'Mi Grupo', view: 'mi_grupo', roles: ['estudiante'] });
    menuItems.push({ id: 'fichas', icon: '📄', label: 'Fichas', view: 'fichas', roles: ['estudiante'] });
    menuItems.push({ id: 'mis_tramites', icon: '📂', label: 'Mis Trámites', view: 'mis_tramites', roles: ['estudiante'] });
  }
  
  // Consultantes
  if (hasRole('consultante')) {
    menuItems.push({ id: 'mis_tramites', icon: '📂', label: 'Mis Trámites', view: 'mis_tramites', roles: ['consultante'] });
  }

  const filteredMenu = menuItems;

  return (
    <div className="app-container">
      <NotificationBanner />
      <ToastContainer />
      
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          {sidebarOpen && (
            <div className="sidebar-logo">
              <h2>SiGeST</h2>
              <p>Sistema de Gestion y Seguimiento de Tramites</p>
            </div>
          )}
          <button 
            className="sidebar-toggle-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={sidebarOpen ? 'Ocultar menú' : 'Mostrar menú'}
            aria-label={sidebarOpen ? 'Ocultar menú' : 'Mostrar menú'}
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        {/* Usuario actual */}
        {sidebarOpen && (
          <div className="sidebar-user-info">
            <div className="user-avatar">
              <FaUser />
            </div>
            <div className="user-details">
              <strong>{user.nombre}</strong>
              <span className={`user-role role-${user.rol}`}>
                {getRoleLabel(user.rol, user.nivel_acceso)}
              </span>
            </div>
          </div>
        )}

        <nav className="sidebar-nav">
          {filteredMenu.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.view)}
              className={`nav-item ${currentView === item.view ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {sidebarOpen && <span className="nav-label">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button 
            className="notificaciones-btn" 
            onClick={() => setNotificacionesOpen(true)} 
            title="Notificaciones"
          >
            <FaBell />
            {sidebarOpen && <span>Notificaciones</span>}
            {contadorNotificaciones > 0 && (
              <span className="notificaciones-contador-sidebar">
                {contadorNotificaciones > 99 ? '99+' : contadorNotificaciones}
              </span>
            )}
          </button>
          <button onClick={logout} className="logout-btn" title="Cerrar sesión">
            <FaSignOutAlt />
            {sidebarOpen && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      {/* Panel de Notificaciones (solo cuando se abre desde el botón del footer) */}
      {isAuthenticated && currentView !== 'notificaciones' && (
        <NotificacionesPanel 
          isOpen={notificacionesOpen} 
          onClose={() => {
            setNotificacionesOpen(false);
            loadContadorNotificaciones(); // Actualizar contador al cerrar
          }} 
        />
      )}

      {/* Main Content */}
      <main className="main-content">
        <header className="top-header">
          <div className="header-title">
            <h1>
              {currentView === 'tramites' && '📋 Gestión de Trámites'}
              {currentView === 'usuarios' && '👥 Gestión de Usuarios'}
              {currentView === 'grupos' && '👥 Gestión de Grupos'}
              {currentView === 'fichas' && (hasRole('estudiante') ? '📄 Fichas' : '📄 Gestión de Fichas')}
              {currentView === 'mi_grupo' && '👥 Mi Grupo'}
              {currentView === 'mis_tramites' && '📂 Mis Trámites'}
              {currentView === 'consultar_tramite' && '🔍 Consultar Trámite'}
              {currentView === 'notificaciones' && '🔔 Notificaciones'}
              {currentView === 'auditorias' && '📋 Auditorías del Sistema'}
              {currentView === 'reportes' && '📊 Reportes del Sistema'}
            </h1>
          </div>
        </header>

        <div className="content-area">
          {/* Vistas según rol */}
          {currentView === 'tramites' && (hasRole(['admin', 'docente'])) && (
            <TramitesList key={refreshKey} />
          )}
          {currentView === 'grupos' && (hasRole(['admin', 'docente'])) && (
            <GruposList key={refreshKey} />
          )}
          {currentView === 'fichas' && (hasRole('admin') && hasAccessLevel(1) || hasRole('docente')) && (
            <FichasList key={refreshKey} />
          )}
          {currentView === 'fichas' && hasRole('estudiante') && (
            <EstudianteFichasList key={refreshKey} />
          )}
          {currentView === 'usuarios' && hasRole('admin') && hasAccessLevel(1) && (
            <UsuariosList key={refreshKey} />
          )}
          {currentView === 'mi_grupo' && hasRole('estudiante') && (
            <EstudianteGrupoInfo key={refreshKey} />
          )}
          {currentView === 'mis_tramites' && hasRole(['estudiante', 'consultante']) && (
            <TramitesList key={refreshKey} />
          )}
          {currentView === 'notificaciones' && (
            <NotificacionesPanel 
              isOpen={true} 
              onClose={() => {}} 
              isFullPage={true}
              onNotificacionLeida={loadContadorNotificaciones}
            />
          )}
          {currentView === 'auditorias' && hasRole('admin') && hasAccessLevel(3) && (
            <AuditoriasList key={refreshKey} />
          )}
          {currentView === 'reportes' && hasRole('admin') && (
            <ReportesPanel key={refreshKey} />
          )}
        </div>

        <footer className="main-footer">
          <div className="footer-links">
            <a href="http://localhost:3001" target="_blank" rel="noopener noreferrer">
              📡 Backend API
            </a>
            <a href="http://localhost:8080" target="_blank" rel="noopener noreferrer">
              🗄️ PgAdmin
            </a>
          </div>
          <p className="footer-copyright">
            © 2024 Clínica Notarial - Sistema de Gestión de Trámites
          </p>
        </footer>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}

function getRoleLabel(role: string, nivel_acceso?: number): string {
  if (role === 'admin') {
    switch (nivel_acceso) {
      case 3:
        return 'Admin. Sistema';
      case 1:
        return 'Administrativo';
      default:
        return 'Administrador';
    }
  }
  
  const labels: { [key: string]: string } = {
    docente: 'Docente',
    estudiante: 'Estudiante',
    consultante: 'Consultante',
  };
  return labels[role] || role;
}

export default App;
