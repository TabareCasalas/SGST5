import { useState, useEffect } from 'react';
import { ApiService } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { FaPlus } from 'react-icons/fa';
import { CreateUsuarioModal } from './CreateUsuarioModal';
import './UsuariosList.css';

interface Usuario {
  id_usuario: number;
  nombre: string;
  ci: string;
  correo: string;
  rol: string;
  nivel_acceso?: number;
  activo: boolean;
  semestre?: string;
}

export function UsuariosList() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filters, setFilters] = useState({
    rol: '',
    activo: '',
    search: '',
  });
  const { showToast } = useToast();
  const { hasAccessLevel, hasRole } = useAuth();

  useEffect(() => {
    loadUsuarios();
  }, [filters]);

  const loadUsuarios = async () => {
    try {
      setLoading(true);
      const data = await ApiService.getUsuarios({
        rol: filters.rol || undefined,
        activo: filters.activo === 'true' ? true : filters.activo === 'false' ? false : undefined,
        search: filters.search || undefined,
      });
      setUsuarios(data);
    } catch (error: any) {
      showToast('Error al cargar usuarios: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActivo = async (usuario: Usuario) => {
    try {
      if (usuario.activo) {
        await ApiService.deactivateUsuario(usuario.id_usuario);
        showToast('Usuario desactivado', 'success');
      } else {
        await ApiService.activateUsuario(usuario.id_usuario);
        showToast('Usuario activado', 'success');
      }
      loadUsuarios();
    } catch (error: any) {
      showToast('Error: ' + error.message, 'error');
    }
  };

  const getRoleLabel = (rol: string, nivel_acceso?: number) => {
    const labels: Record<string, string> = {
      estudiante: 'Estudiante',
      docente: 'Docente',
      consultante: 'Consultante',
      administrador: nivel_acceso === 3 ? 'Administrador Sistema' : 'Administrativo',
    };
    return labels[rol] || rol;
  };

  if (loading) {
    return <div className="usuarios-list-loading">Cargando usuarios...</div>;
  }

  return (
    <div className="usuarios-list">
      <div className="list-header">
        <div>
          <h2>Gestión de Usuarios</h2>
          <div className="filters">
          <input
            type="text"
            placeholder="Buscar por nombre, CI o correo..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="search-input"
          />
          <select
            value={filters.rol}
            onChange={(e) => setFilters({ ...filters, rol: e.target.value })}
          >
            <option value="">Todos los roles</option>
            <option value="estudiante">Estudiante</option>
            <option value="docente">Docente</option>
            <option value="consultante">Consultante</option>
            <option value="administrador">Administrador</option>
          </select>
          <select
            value={filters.activo}
            onChange={(e) => setFilters({ ...filters, activo: e.target.value })}
          >
            <option value="">Todos</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>
          </div>
        </div>
        <div className="header-actions">
          {hasRole('admin') && hasAccessLevel(1) && (
            <button
              className="btn-create"
              onClick={() => setShowCreateForm(true)}
              title="Crear nuevo usuario"
            >
              <FaPlus /> Crear Usuario
            </button>
          )}
        </div>
      </div>

      <div className="table-container">
        <table className="usuarios-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>CI</th>
              <th>Correo</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty-state">
                  No se encontraron usuarios
                </td>
              </tr>
            ) : (
              usuarios.map((usuario) => (
                <tr key={usuario.id_usuario}>
                  <td>{usuario.id_usuario}</td>
                  <td>{usuario.nombre}</td>
                  <td>{usuario.ci}</td>
                  <td>{usuario.correo}</td>
                  <td>{getRoleLabel(usuario.rol, usuario.nivel_acceso)}</td>
                  <td>
                    <span className={`status-badge ${usuario.activo ? 'active' : 'inactive'}`}>
                      {usuario.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => handleToggleActivo(usuario)}
                      className={`btn-toggle ${usuario.activo ? 'btn-deactivate' : 'btn-activate'}`}
                    >
                      {usuario.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de creación */}
      <CreateUsuarioModal
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        onSuccess={loadUsuarios}
      />
    </div>
  );
}





