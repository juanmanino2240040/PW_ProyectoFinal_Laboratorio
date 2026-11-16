import { useState } from 'react';
import api from '../api/axiosconfig';

export default function PortalPaciente({ onVolverLogin }) {
  const [documento, setDocumento] = useState('');
  const [codigoConsulta, setCodigoConsulta] = useState('');
  const [datosConsulta, setDatosConsulta] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConsultar = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/resultados/consulta-publica/', {
        documento: documento.trim(),
        codigo_consulta: codigoConsulta.trim().toUpperCase(),
      });
      setDatosConsulta(res.data);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          'No se pudo validar la consulta. Verifique su documento y código.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!datosConsulta) {
    return (
      <div className="login-view">
        <button type="button" className="top-btn" onClick={onVolverLogin}>
          <i className="fa-solid fa-arrow-left"></i> Acceso Personal Lab
        </button>

        <div className="login-card" style={{ width: '360px' }}>
          <div className="lab-illustration">
            <i className="fa-solid fa-file-medical icon-main"></i>
          </div>
          <h3 style={{ marginBottom: '6px', color: '#1e293b' }}>Consulta de Resultados</h3>
          <p style={{ color: '#6c757d', fontSize: '13px', marginBottom: '20px' }}>
            Ingrese su número de documento y el código de consulta entregado en recepción
          </p>

          {error && (
            <div
              style={{
                backgroundColor: '#f8d7da',
                color: '#842029',
                padding: '8px 12px',
                borderRadius: '4px',
                fontSize: '13px',
                marginBottom: '15px',
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleConsultar}>
            <div className="form-group">
              <label>Número de Documento / Cédula</label>
              <input
                type="text"
                placeholder="Ej. 91230146"
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Código de Consulta (8 caracteres)</label>
              <input
                type="text"
                maxLength={12}
                placeholder="Ej. A7B9K2M1"
                value={codigoConsulta}
                onChange={(e) => setCodigoConsulta(e.target.value.toUpperCase())}
                style={{ textTransform: 'uppercase', letterSpacing: '1px' }}
                required
              />
            </div>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Buscando resultado...' : 'Consultar Resultado'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const { paciente, resultado_consultado, historial } = datosConsulta;

  return (
    <div>
      <header className="navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <i className="fa-solid fa-microscope" style={{ fontSize: '20px' }}></i>
          <strong>Portal Público de Resultados - Laboratorio de Bacteriología</strong>
        </div>
        <button
          className="user-dropdown-btn"
          onClick={() => {
            setDatosConsulta(null);
            setCodigoConsulta('');
          }}
        >
          <i className="fa-solid fa-magnifying-glass"></i> Nueva Consulta
        </button>
      </header>

      <main className="main-content">
        <div className="card">
          <h3>
            Paciente: {paciente.nombres} {paciente.apellidos}
          </h3>
          <p style={{ fontSize: '13px', color: '#6c757d', marginTop: '4px' }}>
            <strong>Documento:</strong> {paciente.tipo_documento} {paciente.documento} |{' '}
            <strong>Empresa:</strong> {paciente.empresa} | <strong>Afiliación:</strong>{' '}
            {paciente.afiliacion}
          </p>
        </div>

        <div className="card">
          <div className="table-toolbar">
            <h4>
              Resultado Consultado: #{resultado_consultado.consecutivo} -{' '}
              {resultado_consultado.tipo_examen}
            </h4>
            <button className="btn-action print" onClick={() => window.print()}>
              <i className="fa-solid fa-print"></i> Imprimir / Guardar PDF
            </button>
          </div>

          <div
            style={{
              background: '#f8f9fa',
              padding: '15px',
              borderRadius: '4px',
              border: '1px solid #dee2e6',
              marginBottom: '15px',
            }}
          >
            <p style={{ fontSize: '13px', marginBottom: '8px' }}>
              <strong>Médico Remitente:</strong> {resultado_consultado.medico_remitente} |{' '}
              <strong>Fecha de Toma:</strong>{' '}
              {new Date(resultado_consultado.fecha_toma).toLocaleString()} |{' '}
              <strong>Estado:</strong> {resultado_consultado.estado}
            </p>
            <hr style={{ margin: '10px 0', borderColor: '#dee2e6' }} />
            <pre
              style={{
                whiteSpace: 'pre-wrap',
                fontFamily: 'inherit',
                fontSize: '14px',
                lineHeight: '1.6',
              }}
            >
              {resultado_consultado.contenido_resultado ||
                'El examen aún se encuentra en procesamiento por el área de bacteriología.'}
            </pre>
          </div>

          {historial.length > 1 && (
            <>
              <h4 style={{ margin: '15px 0 10px' }}>Otros exámenes registrados del paciente</h4>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Consecutivo</th>
                    <th>Código Consulta</th>
                    <th>Examen</th>
                    <th>Fecha Toma</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map((h) => (
                    <tr key={h.id}>
                      <td>#{h.consecutivo}</td>
                      <td><code>{h.codigo_consulta}</code></td>
                      <td>{h.tipo_examen}</td>
                      <td>{new Date(h.fecha_toma).toLocaleDateString()}</td>
                      <td>{h.estado}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </main>
    </div>
  );
}