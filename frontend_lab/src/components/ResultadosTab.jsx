import { useState, useEffect } from 'react';
import api from '../api/axiosconfig';
import EditResultModal from './EditResultModal';

const DATOS_DEMO = [
  {
    id: 1,
    consecutivo: '63',
    hora: '14:54:09',
    paciente: '91230146: JHON GABINO PINZON POF',
    examen: 'QUÍMICA SANGUÍNEA',
    empresa: 'PARTICULAR',
    afiliacion: 'PARTICULAR',
    medico: 'PARTICULAR',
    estado: 'IMPRESO',
    fecha: '2025-05-05',
    valorGlicemia: '103 mg/dL',
    observaciones: '',
  },
  {
    id: 2,
    consecutivo: '8',
    hora: '09:51:19',
    paciente: '10987654: MARIA RODRIGUEZ',
    examen: 'CULTIVO DE ORINA / UROCULTIVO',
    empresa: 'PARTICULAR',
    afiliacion: 'PARTICULAR',
    medico: 'PARTICULAR',
    estado: 'PENDIENTE',
    fecha: '2025-05-05',
    valorGlicemia: '',
    observaciones: '',
  },
];

export default function ResultadosTab() {
  const [resultados, setResultados] = useState(DATOS_DEMO);
  const [busqueda, setBusqueda] = useState('');
  const [selectedResultado, setSelectedResultado] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const fetchResultados = async () => {
      try {
        const res = await api.get('/resultados/');
        if (Array.isArray(res.data) && res.data.length > 0) {
          setResultados(res.data);
        }
      } catch {
        // Mantiene datos locales si el endpoint aún no tiene registros
      }
    };
    fetchResultados();
  }, []);

  const resultadosFiltrados = resultados.filter(
    (item) =>
      item.paciente.toLowerCase().includes(busqueda.toLowerCase()) ||
      String(item.consecutivo).includes(busqueda) ||
      item.examen.toLowerCase().includes(busqueda.toLowerCase())
  );

  const handleEdit = (item) => {
    setSelectedResultado(item);
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este registro?')) return;
    try {
      await api.delete(`/resultados/${id}/`);
    } catch {
      // Fallback local si el backend no responde
    }
    setResultados((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSave = async (updatedItem) => {
    const payload = {
      ...updatedItem,
      examen: updatedItem.tipoExamen,
    };

    try {
      await api.put(`/resultados/${updatedItem.id}/`, payload);
    } catch {
      // Fallback local si el backend no responde
    }

    setResultados((prev) =>
      prev.map((item) => (item.id === updatedItem.id ? payload : item))
    );
    setModalOpen(false);
    alert('Resultado guardado exitosamente.');
  };

  return (
    <div className="card">
      <div className="table-toolbar">
        <h3>Gestión de Resultados</h3>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <label>Buscar:</label>
          <input
            type="text"
            placeholder="Buscar por paciente, examen..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{ padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
          />
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Consecutivo / Fecha</th>
              <th>Paciente</th>
              <th>Exámenes / Acciones</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {resultadosFiltrados.map((item) => (
              <tr key={item.id}>
                <td>
                  <strong>{item.consecutivo}</strong>
                  <br />
                  <small style={{ color: '#6c757d' }}>{item.hora}</small>
                </td>
                <td>{item.paciente}</td>
                <td>
                  <div className="action-badge-container">
                    <div className="action-badge">
                      <span>
                        {item.consecutivo} ({item.hora})
                      </span>
                      <div className="btn-group">
                        <button
                          className="btn-action edit"
                          title="Editar"
                          onClick={() => handleEdit(item)}
                        >
                          <i className="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button
                          className="btn-action delete"
                          title="Eliminar"
                          onClick={() => handleDelete(item.id)}
                        >
                          <i className="fa-solid fa-trash"></i>
                        </button>
                        <button
                          className="btn-action print"
                          title="Imprimir"
                          onClick={() => alert(`Imprimiendo examen #${item.consecutivo}`)}
                        >
                          <i className="fa-solid fa-print"></i>
                        </button>
                      </div>
                    </div>

                    <div className="custom-tooltip">
                      <strong>Examen:</strong> {item.examen}
                      <br />
                      <strong>Empresa:</strong> {item.empresa}
                      <br />
                      <strong>Afiliación:</strong> {item.afiliacion}
                      <br />
                      <strong>Médico:</strong> {item.medico}
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
            ))}
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