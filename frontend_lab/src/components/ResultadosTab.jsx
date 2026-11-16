import { useState, useEffect, useRef } from 'react';
import api from '../api/axiosconfig';
import EditResultModal from './EditResultModal';

export default function ResultadosTab() {
  const [resultados, setResultados] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [selectedResultado, setSelectedResultado] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [importando, setImportando] = useState(false);
  const fileInputRef = useRef(null);

  const fetchResultados = async () => {
    try {
      const res = await api.get('/resultados/');
      setResultados(res.data);
    } catch (err) {
      console.error('Error al cargar resultados:', err);
    }
  };

  useEffect(() => {
    fetchResultados();
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImportando(true);
    try {
      const text = await file.text();
      const jsonData = JSON.parse(text);
      const res = await api.post('/resultados/importar-json/', jsonData);

      alert(
        `${res.data.mensaje}` +
          (res.data.errores?.length ? `\nAdvertencias:\n${res.data.errores.join('\n')}` : '')
      );
      await fetchResultados();
    } catch (err) {
      if (err instanceof SyntaxError) {
        alert('El archivo seleccionado no es un JSON válido.');
      } else {
        alert(err.response?.data?.error || 'Error al importar resultados.');
      }
    } finally {
      setImportando(false);
      e.target.value = '';
    }
  };

  const resultadosFiltrados = resultados.filter(
    (item) =>
      (item.paciente_display || '').toLowerCase().includes(busqueda.toLowerCase()) ||
      String(item.consecutivo).includes(busqueda) ||
      (item.codigo_consulta || '').toLowerCase().includes(busqueda.toLowerCase()) ||
      (item.tipo_examen || '').toLowerCase().includes(busqueda.toLowerCase())
  );

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

  return (
    <div className="card">
      <div className="table-toolbar">
        <h3>Gestión de Resultados</h3>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
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

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <label>Buscar:</label>
            <input
              type="text"
              placeholder="Consecutivo, código, paciente..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{ padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Consecutivo / Toma</th>
              <th>Código Consulta</th>
              <th>Paciente</th>
              <th>Exámenes / Acciones</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {resultadosFiltrados.map((item) => {
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
                    <small style={{ color: '#6c757d' }}>{horaToma}</small>
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
                            onClick={() => {
                              setSelectedResultado(item);
                              setModalOpen(true);
                            }}
                          >
                            <i className="fa-solid fa-pen-to-square"></i>
                          </button>
                          <button
                            className="btn-action delete"
                            onClick={() => handleDelete(item.id)}
                          >
                            <i className="fa-solid fa-trash"></i>
                          </button>
                          <button className="btn-action print" onClick={() => window.print()}>
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
      />
    </div>
  );
}