import { useState, useRef } from 'react';
import { FaFileExcel, FaTimes, FaDownload, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import { ApiService } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import './ImportUsuariosModal.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ImportResult {
  success: number;
  errors: Array<{ row: number; error: string }>;
  total: number;
}

export function ImportUsuariosModal({ isOpen, onClose, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validar que sea un archivo Excel
    const validExtensions = ['.xlsx', '.xls'];
    const fileExtension = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();
    
    if (!validExtensions.includes(fileExtension)) {
      showToast('Por favor selecciona un archivo Excel (.xlsx o .xls)', 'error');
      return;
    }

    setFile(selectedFile);
    setResult(null);
    previewFile(selectedFile);
  };

  const previewFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

        // Validar que tenga encabezados
        if (jsonData.length === 0) {
          showToast('El archivo Excel está vacío', 'error');
          return;
        }

        // Mostrar las primeras 5 filas como preview
        const headers = jsonData[0] as string[];
        const rows = jsonData.slice(1, 6).map((row: any, index) => {
          const rowData: any = {};
          headers.forEach((header, colIndex) => {
            rowData[header] = row[colIndex] || '';
          });
          return { ...rowData, _rowNumber: index + 2 };
        });

        setPreview(rows);
      } catch (error) {
        console.error('Error leyendo archivo:', error);
        showToast('Error al leer el archivo Excel', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSubmit = async () => {
    if (!file) {
      showToast('Por favor selecciona un archivo', 'error');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3001/api');
      const response = await fetch(`${API_URL}/usuarios/importar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al importar usuarios');
      }

      setResult(data);
      
      if (data.errors && data.errors.length > 0) {
        showToast(
          `Importación completada con errores: ${data.success} exitosos, ${data.errors.length} errores`,
          'warning'
        );
      } else {
        showToast(`¡${data.success} usuarios importados exitosamente!`, 'success');
        if (onSuccess) {
          onSuccess();
        }
        setTimeout(() => {
          handleClose();
        }, 2000);
      }
    } catch (error: any) {
      showToast(error.message || 'Error al importar usuarios', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreview([]);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  const downloadTemplate = () => {
    // Crear un template Excel
    const templateData = [
      ['nombre', 'ci', 'domicilio', 'telefono', 'correo', 'rol', 'nivel_acceso', 'semestre', 'id_grupo'],
      ['Juan Pérez', '12345678', 'Av. Principal 123', '099123456', 'juan@email.com', 'estudiante', '', '2024-1', '1'],
      ['María García', '87654321', 'Calle Secundaria 456', '099234567', 'maria@email.com', 'docente', '', '', ''],
      ['Carlos Admin', '11111111', 'Bv. Artigas 789', '099345678', 'carlos@email.com', 'administrador', '1', '', ''],
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Usuarios');
    XLSX.writeFile(wb, 'plantilla_usuarios.xlsx');
  };

  return (
    <div className="import-modal-overlay" onClick={handleClose}>
      <div className="import-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="import-modal-header">
          <h2>
            <FaFileExcel /> Importar Usuarios desde Excel
          </h2>
          <button className="close-btn" onClick={handleClose}>
            <FaTimes />
          </button>
        </div>

        <div className="import-modal-body">
          {/* Instrucciones */}
          <div className="import-instructions">
            <h3>📋 Formato Requerido del Archivo Excel</h3>
            <div className="instructions-content">
              <p><strong>El archivo Excel debe tener las siguientes columnas (en este orden):</strong></p>
              <ul>
                <li><strong>nombre</strong> (obligatorio) - Nombre completo del usuario</li>
                <li><strong>ci</strong> (obligatorio) - Cédula de Identidad (único)</li>
                <li><strong>domicilio</strong> (obligatorio) - Dirección del usuario</li>
                <li><strong>telefono</strong> (obligatorio) - Teléfono de contacto</li>
                <li><strong>correo</strong> (obligatorio) - Correo electrónico (único)</li>
                <li><strong>rol</strong> (obligatorio) - Debe ser: <code>estudiante</code>, <code>docente</code>, <code>consultante</code> o <code>administrador</code></li>
                <li><strong>nivel_acceso</strong> (solo para administradores) - Debe ser <code>1</code> (Administrativo) o <code>3</code> (Sistema). Dejar vacío para otros roles.</li>
                <li><strong>semestre</strong> (solo para estudiantes) - Ejemplo: <code>2024-1</code>. Dejar vacío para otros roles.</li>
                <li><strong>id_grupo</strong> (opcional, solo para estudiantes) - ID del grupo al que pertenece. Dejar vacío si no aplica.</li>
              </ul>
              
              <div className="important-notes">
                <h4>⚠️ Notas Importantes:</h4>
                <ul>
                  <li>La primera fila debe contener los encabezados de las columnas</li>
                  <li>Los campos obligatorios no pueden estar vacíos</li>
                  <li>El CI y correo deben ser únicos (no pueden existir previamente en el sistema)</li>
                  <li>Si un usuario ya existe (mismo CI o correo), se omitirá y se mostrará en los errores</li>
                  <li>Para estudiantes, el <code>semestre</code> es obligatorio</li>
                  <li>Para administradores, el <code>nivel_acceso</code> es obligatorio (1 o 3)</li>
                </ul>
              </div>

              <button 
                type="button" 
                className="btn-download-template"
                onClick={downloadTemplate}
              >
                <FaDownload /> Descargar Plantilla de Ejemplo
              </button>
            </div>
          </div>

          {/* Selector de archivo */}
          <div className="file-selector">
            <label className="file-input-label">
              <FaFileExcel /> Seleccionar Archivo Excel
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                disabled={loading}
              />
            </label>
            {file && (
              <div className="file-info">
                <span>📄 {file.name}</span>
                <span>📊 {(file.size / 1024).toFixed(2)} KB</span>
              </div>
            )}
          </div>

          {/* Preview */}
          {preview.length > 0 && (
            <div className="preview-section">
              <h4>Vista Previa (primeras 5 filas):</h4>
              <div className="preview-table-container">
                <table className="preview-table">
                  <thead>
                    <tr>
                      {Object.keys(preview[0] || {}).filter(k => k !== '_rowNumber').map((key) => (
                        <th key={key}>{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, idx) => (
                      <tr key={idx}>
                        {Object.entries(row)
                          .filter(([key]) => key !== '_rowNumber')
                          .map(([key, value]) => (
                            <td key={key}>{String(value || '')}</td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Resultados */}
          {result && (
            <div className="import-results">
              <h4>Resultados de la Importación:</h4>
              <div className={`result-summary ${result.errors.length > 0 ? 'has-errors' : 'success'}`}>
                <div className="result-stat">
                  <FaCheckCircle /> <strong>{result.success}</strong> usuarios creados exitosamente
                </div>
                {result.errors.length > 0 && (
                  <div className="result-stat error">
                    <FaExclamationCircle /> <strong>{result.errors.length}</strong> errores
                  </div>
                )}
              </div>

              {result.errors.length > 0 && (
                <div className="errors-list">
                  <h5>Errores encontrados:</h5>
                  <ul>
                    {result.errors.slice(0, 10).map((error, idx) => (
                      <li key={idx}>
                        <strong>Fila {error.row}:</strong> {error.error}
                      </li>
                    ))}
                    {result.errors.length > 10 && (
                      <li>... y {result.errors.length - 10} errores más</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="import-modal-footer">
          <button className="btn-cancel" onClick={handleClose} disabled={loading}>
            Cancelar
          </button>
          <button
            className="btn-import"
            onClick={handleSubmit}
            disabled={!file || loading}
          >
            {loading ? 'Importando...' : '📥 Importar Usuarios'}
          </button>
        </div>
      </div>
    </div>
  );
}




