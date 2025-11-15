import { useState, useEffect } from 'react';
import { ApiService } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { FaLock, FaEye, FaEyeSlash, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import './CambiarPasswordModal.css';

interface Props {
  isOpen: boolean;
  onSuccess: () => void;
  esPrimeraVez?: boolean;
  passwordTemporal?: string;
}

export function CambiarPasswordModal({ isOpen, onSuccess, esPrimeraVez = false, passwordTemporal = '' }: Props) {
  const [passwordActual, setPasswordActual] = useState(passwordTemporal);
  const [passwordNueva, setPasswordNueva] = useState('');
  const [passwordConfirmar, setPasswordConfirmar] = useState('');
  const [mostrarPasswordActual, setMostrarPasswordActual] = useState(false);
  const [mostrarPasswordNueva, setMostrarPasswordNueva] = useState(false);
  const [mostrarPasswordConfirmar, setMostrarPasswordConfirmar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errores, setErrores] = useState<string[]>([]);
  const { showToast } = useToast();

  // Actualizar passwordActual cuando cambie passwordTemporal
  useEffect(() => {
    if (passwordTemporal && esPrimeraVez) {
      setPasswordActual(passwordTemporal);
    }
  }, [passwordTemporal, esPrimeraVez]);

  if (!isOpen) return null;

  const validarPassword = (password: string): string[] => {
    const errores: string[] = [];
    
    if (password.length < 8) {
      errores.push('Al menos 8 caracteres');
    }
    
    if (!/[A-Z]/.test(password)) {
      errores.push('Al menos una letra mayúscula');
    }
    
    if (!/[a-z]/.test(password)) {
      errores.push('Al menos una letra minúscula');
    }
    
    if (!/[0-9]/.test(password)) {
      errores.push('Al menos un número');
    }
    
    if (!/[!@#$%&*]/.test(password)) {
      errores.push('Al menos un carácter especial (!@#$%&*)');
    }
    
    return errores;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrores([]);

    // Validar que las contraseñas coincidan
    if (passwordNueva !== passwordConfirmar) {
      setErrores(['Las contraseñas no coinciden']);
      return;
    }

    // Validar requisitos de seguridad
    const erroresValidacion = validarPassword(passwordNueva);
    if (erroresValidacion.length > 0) {
      setErrores(erroresValidacion);
      return;
    }

    setLoading(true);
    try {
      await ApiService.cambiarPassword(passwordActual, passwordNueva);
      showToast('Contraseña cambiada exitosamente', 'success');
      onSuccess();
    } catch (error: any) {
      if (error.detalles && Array.isArray(error.detalles)) {
        setErrores(error.detalles);
      } else {
        setErrores([error.message || 'Error al cambiar contraseña']);
      }
    } finally {
      setLoading(false);
    }
  };

  const erroresValidacionNueva = passwordNueva ? validarPassword(passwordNueva) : [];
  const cumpleRequisitos = erroresValidacionNueva.length === 0 && passwordNueva.length > 0;
  const passwordsCoinciden = passwordNueva === passwordConfirmar && passwordConfirmar.length > 0;

  return (
    <div 
      className="modal-overlay cambiar-password-overlay"
      onClick={esPrimeraVez ? undefined : (e) => {
        if (e.target === e.currentTarget && !loading) {
          // Solo permitir cerrar si no es primera vez
        }
      }}
    >
      <div className="cambiar-password-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            {esPrimeraVez ? '🔐 Cambiar Contraseña' : '🔒 Cambiar Contraseña'}
          </h2>
          {esPrimeraVez && (
            <p className="modal-subtitle">
              Por seguridad, debes cambiar tu contraseña temporal antes de continuar
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {!esPrimeraVez && (
            <div className="form-group">
              <label htmlFor="passwordActual">
                <FaLock /> Contraseña Actual *
              </label>
              <div className="password-input-wrapper">
                <input
                  id="passwordActual"
                  type={mostrarPasswordActual ? 'text' : 'password'}
                  value={passwordActual}
                  onChange={(e) => setPasswordActual(e.target.value)}
                  placeholder="Ingrese su contraseña actual"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setMostrarPasswordActual(!mostrarPasswordActual)}
                  tabIndex={-1}
                >
                  {mostrarPasswordActual ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>
          )}

          {esPrimeraVez && (
            <div className="form-group">
              <label htmlFor="passwordActual">
                <FaLock /> Contraseña Temporal *
              </label>
              <div className="password-input-wrapper">
                <input
                  id="passwordActual"
                  type={mostrarPasswordActual ? 'text' : 'password'}
                  value={passwordActual}
                  onChange={(e) => setPasswordActual(e.target.value)}
                  placeholder="Ingrese la contraseña temporal recibida por correo"
                  required
                  disabled={loading || (passwordTemporal.length > 0)}
                  readOnly={passwordTemporal.length > 0}
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setMostrarPasswordActual(!mostrarPasswordActual)}
                  tabIndex={-1}
                >
                  {mostrarPasswordActual ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {passwordTemporal.length > 0 && (
                <small className="form-hint">
                  La contraseña temporal ha sido prellenada. Puedes cambiarla si es necesario.
                </small>
              )}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="passwordNueva">
              <FaLock /> Nueva Contraseña *
            </label>
            <div className="password-input-wrapper">
              <input
                id="passwordNueva"
                type={mostrarPasswordNueva ? 'text' : 'password'}
                value={passwordNueva}
                onChange={(e) => setPasswordNueva(e.target.value)}
                placeholder="Ingrese su nueva contraseña"
                required
                disabled={loading}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setMostrarPasswordNueva(!mostrarPasswordNueva)}
                tabIndex={-1}
              >
                {mostrarPasswordNueva ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {passwordNueva && (
              <div className="password-requirements">
                <p className="requirements-title">Requisitos de seguridad:</p>
                <ul className="requirements-list">
                  <li className={passwordNueva.length >= 8 ? 'valid' : 'invalid'}>
                    {passwordNueva.length >= 8 ? <FaCheckCircle /> : <FaTimesCircle />}
                    Al menos 8 caracteres
                  </li>
                  <li className={/[A-Z]/.test(passwordNueva) ? 'valid' : 'invalid'}>
                    {/[A-Z]/.test(passwordNueva) ? <FaCheckCircle /> : <FaTimesCircle />}
                    Al menos una letra mayúscula
                  </li>
                  <li className={/[a-z]/.test(passwordNueva) ? 'valid' : 'invalid'}>
                    {/[a-z]/.test(passwordNueva) ? <FaCheckCircle /> : <FaTimesCircle />}
                    Al menos una letra minúscula
                  </li>
                  <li className={/[0-9]/.test(passwordNueva) ? 'valid' : 'invalid'}>
                    {/[0-9]/.test(passwordNueva) ? <FaCheckCircle /> : <FaTimesCircle />}
                    Al menos un número
                  </li>
                  <li className={/[!@#$%&*]/.test(passwordNueva) ? 'valid' : 'invalid'}>
                    {/[!@#$%&*]/.test(passwordNueva) ? <FaCheckCircle /> : <FaTimesCircle />}
                    Al menos un carácter especial (!@#$%&*)
                  </li>
                </ul>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="passwordConfirmar">
              <FaLock /> Confirmar Nueva Contraseña *
            </label>
            <div className="password-input-wrapper">
              <input
                id="passwordConfirmar"
                type={mostrarPasswordConfirmar ? 'text' : 'password'}
                value={passwordConfirmar}
                onChange={(e) => setPasswordConfirmar(e.target.value)}
                placeholder="Confirme su nueva contraseña"
                required
                disabled={loading}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setMostrarPasswordConfirmar(!mostrarPasswordConfirmar)}
                tabIndex={-1}
              >
                {mostrarPasswordConfirmar ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {passwordConfirmar && (
              <div className={`password-match ${passwordsCoinciden ? 'match' : 'no-match'}`}>
                {passwordsCoinciden ? (
                  <>
                    <FaCheckCircle /> Las contraseñas coinciden
                  </>
                ) : (
                  <>
                    <FaTimesCircle /> Las contraseñas no coinciden
                  </>
                )}
              </div>
            )}
          </div>

          {errores.length > 0 && (
            <div className="alert alert-error">
              <ul>
                {errores.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="modal-actions">
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !cumpleRequisitos || !passwordsCoinciden || !passwordActual}
            >
              {loading ? 'Cambiando...' : 'Cambiar Contraseña'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

