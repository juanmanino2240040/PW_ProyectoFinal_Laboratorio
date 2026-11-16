import { useState, useEffect, useRef } from 'react';
import api from '../api/axiosConfig';
import EditResultModal from './EditResultModal';

const TIPOS_EXAMEN = [
  {
    value: 'GLICEMIA',
    label: 'Glicemia Basal',
    plantilla: 'GLICEMIA EN SUERO:\nVALOR DE REFERENCIA: 70 - 100 mg/dL',
  },
  {
    value: 'CUADRO HEMATICO',
    label: 'Cuadro Hemático (Hemograma)',
    plantilla:
      'HEMOGLOBINA:\nHEMATOCRITO:\nLEUCOCITOS:\nPLAQUETAS:\nOBSERVACIONES:',
  },
  {
    value: 'PARCIAL DE ORINA',
    label: 'Parcial de Orina',
    plantilla:
      'COLOR:\nASPECTO:\nPH:\nDENSIDAD:\nLEUCOCITOS:\nBACTERIAS:',
  },
  {
    value: 'PERFIL LIPIDICO',
    label: 'Perfil Lipídico',
    plantilla:
      'COLESTEROL TOTAL:\nHDL:\nLDL:\nTRIGLICÉRIDOS:',
  },
  {
    value: 'UROCULTIVO',
    label: 'Urocultivo y Antibiograma',
    plantilla:
      'MUESTRA:\nTINCIÓN DE GRAM:\nCULTIVO:\nRECUENTO DE COLONIAS:\nANTIBIOGRAMA:',
  },
];

const initialNuevoResultado = {
  paciente: '',
  tipo_examen: '',
  medico_remitente: 'PARTICULAR',
  estado: 'PENDIENTE',
  fecha_toma: '',
  detalle_examenes: '',
  contenido_resultado: '',
};

export default function ResultadosTab({ user }) {
  const rol = user?.rol;
  const canWrite = rol === 'ADMIN' || rol === 'REGISTRO';
  const canDelete = rol === 'ADMIN';
  const canCargaMasiva = rol === 'ADMIN' || rol === 'REGISTRO';
  const [resultados, setResultados] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [selectedResultado, setSelectedResultado] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [importando, setImportando] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [nuevoResultado, setNuevoResultado] = useState(initialNuevoResultado);
  const fileInputRef = useRef(null);

  const fetchResultados = async () => {
    try {
      const res = await api.get('/resultados/');
      setResultados(res.data);
    } catch (err) {
      console.error('Error al cargar resultados:', err);
    }
  };

  const fetchPacientes = async () => {
    try {
      const res = await api.get('/pacientes/');
      setPacientes(res.data);
    } catch (err) {
      console.error('Error al cargar pacientes:', err);
    }
  };

  useEffect(() => {
    fetchResultados();
  }, []);

  useEffect(() => {
    if (showCreate && pacientes.length === 0) {
      fetchPacientes();
    }
  }, [showCreate]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImportando(true);
    try {
      const text = await file.text();
      const jsonData = JSON.parse(text);

      if (!Array.isArray(jsonData)) {
        alert('El archivo JSON debe contener un arreglo de resultados.');
        return;
      }

      const res = await api.post('/resultados/carga-masiva/', { resultados: jsonData });
      alert(`${res.data.mensaje}\nTotal procesados: ${res.data.total ?? (res.data.creados + res.data.actualizados)}`);
      await fetchResultados();
    } catch (err) {
      if (err instanceof SyntaxError) {
        alert('El archivo seleccionado no es un JSON válido.');
      } else {
        const data = err.response?.data;
        if (data?.errores?.length) {
          alert(`${data.detail || 'Errores en la carga masiva.'}\n\n${data.errores.join('\n')}`);
        } else {
          alert(data?.detail || data?.error || 'Error al importar resultados.');
        }
      }
    } finally {
      setImportando(false);
      e.target.value = '';
    }
  };

  const resultadosFiltrados = resultados.filter((item) => {
    const q = busqueda.toLowerCase().trim();
    if (!q) return true;
    const fechaToma = item.fecha_toma ? new Date(item.fecha_toma).toLocaleString().toLowerCase() : '';
    const fechaTomaIso = item.fecha_toma ? String(item.fecha_toma).toLowerCase() : '';
    const fechaResultado = item.fecha_resultado ? new Date(item.fecha_resultado).toLocaleString().toLowerCase() : '';
    const fechaResultadoIso = item.fecha_resultado ? String(item.fecha_resultado).toLowerCase() : '';
    return (
      (item.paciente_display || '').toLowerCase().includes(q) ||
      String(item.consecutivo).toLowerCase().includes(q) ||
      (item.codigo_consulta || '').toLowerCase().includes(q) ||
      (item.tipo_examen || '').toLowerCase().includes(q) ||
      fechaToma.includes(q) ||
      fechaTomaIso.includes(q) ||
      fechaResultado.includes(q) ||
      fechaResultadoIso.includes(q)
    );
  });

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este resultado?')) return;
    try {
      await api.delete(`/resultados/${id}/`);
      setResultados((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      alert(err.response?.data?.detail || 'No se pudo eliminar el registro.');
    }
  };

  const handleSave = async (updatedPayload) => {
    try {
      const res = await api.put(`/resultados/${updatedPayload.id}/`, updatedPayload);
      setResultados((prev) =>
        prev.map((item) => (item.id === updatedPayload.id ? res.data : item))
      );
      setModalOpen(false);
      alert('Resultado actualizado exitosamente.');
    } catch {
      alert('Error al guardar los cambios en el servidor.');
    }
  };

  const handleTipoExamenChange = (e) => {
    const value = e.target.value;
    const tipo = TIPOS_EXAMEN.find((t) => t.value === value);
    setNuevoResultado((prev) => ({
      ...prev,
      tipo_examen: value,
      contenido_resultado: tipo ? tipo.plantilla : prev.contenido_resultado,
      detalle_examenes: prev.detalle_examenes || (tipo ? tipo.label : ''),
    }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...nuevoResultado,
        paciente: Number(nuevoResultado.paciente),
      };
      await api.post('/resultados/', payload);
      setNuevoResultado(initialNuevoResultado);
      setShowCreate(false);
      await fetchResultados();
      alert('Resultado creado correctamente.');
    } catch (err) {
      const detail = err.response?.data;
      alert(typeof detail === 'string' ? detail : 'Error al crear el resultado. Verifique los datos.');
    }
  };

  return (
    <div className="card">
      <div className="table-toolbar">
        <h3>Gestión de Resultados</h3>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {canWrite && (
            <button
              type="button"
              className="btn-save"
              onClick={() => setShowCreate((v) => !v)}
            >
              <i className="fa-solid fa-plus"></i>{' '}
              {showCreate ? 'Cerrar' : 'Nuevo resultado'}
            </button>
          )}

          {canCargaMasiva && (
            <>
              <input
                type="file"
                accept=".json,application/json"
                ref={fileInputRef}
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current.click()}
                disabled={importando}
                style={{
                  backgroundColor: '#198754',
                  color: 'white',
                  border: 'none',
                  padding: '7px 14px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <i className="fa-solid fa-file-import"></i>
                {importando ? 'Importando...' : 'Importar JSON'}
              </button>
            </>
          )}

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <label>Buscar:</label>
            <input
              type="text"
              placeholder="Consecutivo, código, paciente o fecha..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{ padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>
        </div>
      </div>

      {showCreate && canWrite && (
        <form onSubmit={handleCreate} style={{ marginBottom: '16px', padding: '12px', border: '1px solid #dee2e6', borderRadius: '6px' }}>
          <div className="form-row">
            <div className="form-group col-4">
              <label>Paciente *</label>
              <select
                value={nuevoResultado.paciente}
                onChange={(e) => setNuevoResultado({ ...nuevoResultado, paciente: e.target.value })}
                required
              >
                <option value="">Seleccione un paciente</option>
                {pacientes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.documento} - {p.nombres} {p.apellidos}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group col-4">
              <label>Tipo de examen *</label>
              <select
                value={nuevoResultado.tipo_examen}
                onChange={handleTipoExamenChange}
                required
              >
                <option value="">Seleccione un tipo de examen</option>
                {TIPOS_EXAMEN.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group col-4">
              <label>Consecutivo</label>
              <input value="Se generará automáticamente" disabled />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group col-4">
              <label>Fecha y hora de toma *</label>
              <input
                type="datetime-local"
                value={nuevoResultado.fecha_toma}
                onChange={(e) => setNuevoResultado({ ...nuevoResultado, fecha_toma: e.target.value })}
                required
              />
            </div>
            <div className="form-group col-4">
              <label>Médico remitente</label>
              <input
                value={nuevoResultado.medico_remitente}
                onChange={(e) => setNuevoResultado({ ...nuevoResultado, medico_remitente: e.target.value })}
              />
            </div>
            <div className="form-group col-4">
              <label>Estado</label>
              <select
                value={nuevoResultado.estado}
                onChange={(e) => setNuevoResultado({ ...nuevoResultado, estado: e.target.value })}
              >
                <option value="PENDIENTE">PENDIENTE</option>
                <option value="IMPRESO">IMPRESO</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group col-6">
              <label>Detalle de exámenes</label>
              <input
                value={nuevoResultado.detalle_examenes}
                onChange={(e) => setNuevoResultado({ ...nuevoResultado, detalle_examenes: e.target.value })}
              />
            </div>
            <div className="form-group col-6">
              <label>Contenido del resultado</label>
              <textarea
                value={nuevoResultado.contenido_resultado}
                onChange={(e) => setNuevoResultado({ ...nuevoResultado, contenido_resultado: e.target.value })}
                rows={4}
              />
            </div>
          </div>
          <button type="submit" className="btn-save">Guardar resultado</button>
        </form>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Consecutivo / Fecha de toma</th>
              <th>Código Consulta</th>
              <th>Paciente</th>
              <th>Exámenes / Acciones</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {resultadosFiltrados.map((item) => {
              const fechaToma = item.fecha_toma ? new Date(item.fecha_toma).toLocaleString() : '-';
              const fechaResultado = item.fecha_resultado ? new Date(item.fecha_resultado).toLocaleString() : '';
              const horaToma = item.fecha_toma
                ? new Date(item.fecha_toma).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })
                : '';

              return (
                <tr key={item.id}>
                  <td>
                    <strong>{item.consecutivo}</strong>
                    <br />
                    <small style={{ color: '#6c757d' }}>{fechaToma}</small>
                    {fechaResultado && (
                      <>
                        <br />
                        <small style={{ color: '#6c757d' }}>Resultado: {fechaResultado}</small>
                      </>
                    )}
                  </td>
                  <td>
                    <code
                      style={{
                        background: '#e9ecef',
                        padding: '3px 7px',
                        borderRadius: '4px',
                        fontWeight: 'bold',
                        color: '#0d6efd',
                      }}
                    >
                      {item.codigo_consulta}
                    </code>
                  </td>
                  <td>{item.paciente_display}</td>
                  <td>
                    <div className="action-badge-container">
                      <div className="action-badge">
                        <span>
                          {item.consecutivo} ({horaToma})
                        </span>
                        <div className="btn-group">
                          <button
                            className="btn-action edit"
                            title={canWrite ? 'Editar resultado' : 'Ver resultado'}
                            onClick={() => {
                              setSelectedResultado(item);
                              setModalOpen(true);
                            }}
                          >
                            <i className={`fa-solid ${canWrite ? 'fa-pen-to-square' : 'fa-eye'}`}></i>
                          </button>
                          {canDelete && (
                            <button
                              className="btn-action delete"
                              title="Eliminar resultado"
                              onClick={() => handleDelete(item.id)}
                            >
                              <i className="fa-solid fa-trash"></i>
                            </button>
                          )}
                          <button className="btn-action print" title="Imprimir" onClick={() => window.print()}>
                            <i className="fa-solid fa-print"></i>
                          </button>
                        </div>
                      </div>

                      <div className="custom-tooltip">
                        <strong>Examen:</strong> {item.tipo_examen}
                        <br />
                        <strong>Empresa:</strong> {item.paciente_empresa}
                        <br />
                        <strong>Afiliación:</strong> {item.paciente_afiliacion}
                        <br />
                        <strong>Médico:</strong> {item.medico_remitente}
                        <br />
                        <strong>Estado:</strong> {item.estado}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span
                      style={{
                        background: item.estado === 'IMPRESO' ? '#28a745' : '#ffc107',
                        color: item.estado === 'IMPRESO' ? 'white' : 'black',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                      }}
                    >
                      {item.estado}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <EditResultModal
        isOpen={modalOpen}
        resultado={selectedResultado}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        readOnly={!canWrite}
      />
    </div>
  );
}