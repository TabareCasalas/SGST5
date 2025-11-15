import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FaUser, FaLock, FaSignInAlt } from 'react-icons/fa';
import { CambiarPasswordModal } from './CambiarPasswordModal';
import { SolicitarReactivacionModal } from './SolicitarReactivacionModal';
import './Login.css';

export function Login() {
  const [ci, setCi] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mostrarCambiarPassword, setMostrarCambiarPassword] = useState(false);
  const [passwordTemporal, setPasswordTemporal] = useState('');
  const [mostrarSolicitarReactivacion, setMostrarSolicitarReactivacion] = useState(false);
  const [infoReactivacion, setInfoReactivacion] = useState<{
    puedeSolicitar?: boolean;
    tieneSolicitudPendiente?: boolean;
    tieneSolicitudAprobada?: boolean;
    tieneSolicitudRechazada?: boolean;
  } | null>(null);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(ci, password);
      // Si el resultado indica que debe cambiar la contraseña
      if (result && 'debeCambiarPassword' in result && result.debeCambiarPassword) {
        setPasswordTemporal(password);
        setMostrarCambiarPassword(true);
        setLoading(false);
      }
    } catch (err: any) {
      // Verificar si el error es por usuario inactivo
      try {
        const errorData = JSON.parse(err.message);
        if (errorData.error === 'Usuario inactivo') {
          setInfoReactivacion({
            puedeSolicitar: errorData.puedeSolicitarReactivacion,
            tieneSolicitudPendiente: errorData.tieneSolicitudPendiente,
            tieneSolicitudAprobada: errorData.tieneSolicitudAprobada,
            tieneSolicitudRechazada: errorData.tieneSolicitudRechazada,
          });
          setMostrarSolicitarReactivacion(true);
          setError('');
          setLoading(false);
          return;
        }
      } catch {
        // No es JSON, continuar con el error normal
      }
      setError(err.message || 'Error al iniciar sesión');
      setLoading(false);
    }
  };

  const handlePasswordCambiada = () => {
    setMostrarCambiarPassword(false);
    setPasswordTemporal('');
    // Recargar la página para que el usuario inicie sesión nuevamente
    window.location.reload();
  };

  const handleQuickLogin = (testCi: string) => {
    setCi(testCi);
    setPassword('password123');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <h1>SiGeST</h1>
            <p>Sistema de Gestion y Seguimiento de Tramites</p>
          </div>
          <h2>Clínica Notarial</h2>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="ci">
              <FaUser className="label-icon" />
              Cédula de Identidad
            </label>
            <input
              id="ci"
              type="text"
              value={ci}
              onChange={(e) => setCi(e.target.value)}
              placeholder="Ingrese su CI"
              required
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">
              <FaLock className="label-icon" />
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ingrese su contraseña"
              required
              disabled={loading}
            />
            <small className="form-hint">
              Ingrese su CI y contraseña para acceder
            </small>
          </div>

          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? (
              <>Iniciando sesión...</>
            ) : (
              <>
                <FaSignInAlt /> Iniciar Sesión
              </>
            )}
          </button>
        </form>

        <div className="test-credentials">
          <div className="test-credentials-header">
            <h3>🧪 Credenciales de Prueba</h3>
            <p className="test-hint">Haz clic en cualquier usuario para llenar automáticamente el formulario</p>
          </div>
          
          <div className="credentials-grid">
            <div className="credential-card admin">
              <div className="credential-header">
                <span className="credential-badge">🔴 Admin Sistema</span>
              </div>
              <div className="credential-info">
                <p><strong>CI:</strong> 12345678</p>
                <p><strong>Password:</strong> password123</p>
                <button 
                  className="credential-btn"
                  onClick={() => handleQuickLogin('12345678')}
                  disabled={loading}
                >
                  Usar este usuario
                </button>
              </div>
            </div>

            <div className="credential-card admin">
              <div className="credential-header">
                <span className="credential-badge">🟡 Administrativo</span>
              </div>
              <div className="credential-info">
                <p><strong>CI:</strong> 34567890</p>
                <p><strong>Password:</strong> password123</p>
                <button 
                  className="credential-btn"
                  onClick={() => handleQuickLogin('34567890')}
                  disabled={loading}
                >
                  Usar este usuario
                </button>
              </div>
            </div>

            <div className="credential-card docente">
              <div className="credential-header">
                <span className="credential-badge">👨‍🏫 Docente</span>
              </div>
              <div className="credential-info">
                <p><strong>CI:</strong> 11111111</p>
                <p><strong>Password:</strong> password123</p>
                <button 
                  className="credential-btn"
                  onClick={() => handleQuickLogin('11111111')}
                  disabled={loading}
                >
                  Usar este usuario
                </button>
              </div>
            </div>

            <div className="credential-card estudiante">
              <div className="credential-header">
                <span className="credential-badge">👨‍🎓 Estudiante</span>
              </div>
              <div className="credential-info">
                <p><strong>CI:</strong> 55555555</p>
                <p><strong>Password:</strong> password123</p>
                <button 
                  className="credential-btn"
                  onClick={() => handleQuickLogin('55555555')}
                  disabled={loading}
                >
                  Usar este usuario
                </button>
              </div>
            </div>

            <div className="credential-card consultante">
              <div className="credential-header">
                <span className="credential-badge">🧑‍💼 Consultante</span>
              </div>
              <div className="credential-info">
                <p><strong>CI:</strong> 40404040</p>
                <p><strong>Password:</strong> password123</p>
                <button 
                  className="credential-btn"
                  onClick={() => handleQuickLogin('40404040')}
                  disabled={loading}
                >
                  Usar este usuario
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="login-footer">
          <p>Sistema de Gestión de Trámites Notariales</p>
          <small>© 2024 Clínica Notarial Universitaria</small>
        </div>
      </div>

      {/* Modal para cambiar contraseña */}
      <CambiarPasswordModal
        isOpen={mostrarCambiarPassword}
        onSuccess={handlePasswordCambiada}
        esPrimeraVez={true}
        passwordTemporal={passwordTemporal}
      />

      {/* Modal para solicitar reactivación */}
      <SolicitarReactivacionModal
        isOpen={mostrarSolicitarReactivacion}
        onClose={() => {
          setMostrarSolicitarReactivacion(false);
          setInfoReactivacion(null);
        }}
        onSuccess={() => {
          setMostrarSolicitarReactivacion(false);
          setInfoReactivacion(null);
        }}
        ci={ci}
        password={password}
        tieneSolicitudPendiente={infoReactivacion?.tieneSolicitudPendiente}
        tieneSolicitudAprobada={infoReactivacion?.tieneSolicitudAprobada}
        tieneSolicitudRechazada={infoReactivacion?.tieneSolicitudRechazada}
      />
    </div>
  );
}
