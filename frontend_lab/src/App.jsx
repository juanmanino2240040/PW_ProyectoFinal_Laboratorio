import { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import Login from './components/Login';
import PortalPaciente from './components/PortalPaciente';
import Navbar from './components/Navbar';
import ResultadosTab from './components/ResultadosTab';
import GestionUsuariosTab from './components/GestionUsuariosTab';
import api from './api/axiosconfig';

export default function App() {
  const [user, setUser] = useState(null);
  const [vistaPublicaPaciente, setVistaPublicaPaciente] = useState(false);
  const [activeTab, setActiveTab] = useState('resultados');
  const [pacientes, setPacientes] = useState([]);
  const [consultas, setConsultas] = useState([]);
  const [reportes, setReportes] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        if (decoded.exp * 1000 > Date.now()) {
          setUser((decoded.username || 'USUARIO').toUpperCase());
        }
      } catch {
        localStorage.removeItem('access_token');
      }
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    if (activeTab === 'pacientes') api.get('/pacientes/').then((r) => setPacientes(r.data));
    if (activeTab === 'consultas') api.get('/consultas/').then((r) => setConsultas(r.data));
    if (activeTab === 'reportes') api.get('/reportes/').then((r) => setReportes(r.data));
  }, [activeTab, user]);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  if (!user) {
    if (vistaPublicaPaciente) {
      return <PortalPaciente onVolverLogin={() => setVistaPublicaPaciente(false)} />;
    }
    return (
      <Login
        onLoginSuccess={(username) => setUser(username)}
        onOpenPortalPaciente={() => setVistaPublicaPaciente(true)}
      />
    );
  }

  return (
    <div>
      <Navbar
        username={user}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onLogout={handleLogout}
      />

      <main className="main-content">
        {activeTab === 'resultados' && <ResultadosTab />}
        {activeTab === 'gestion-usuarios' && <GestionUsuariosTab />}

        {activeTab === 'pacientes' && (
          <div className="card">
            <h3 style={{ marginBottom: '12px' }}>Módulo de Pacientes</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Documento</th>
                  <th>Nombres y Apellidos</th>
                  <th>Sexo</th>
                  <th>Teléfono</th>
                  <th>Empresa / Afiliación</th>
                </tr>
              </thead>
              <tbody>
                {pacientes.map((p) => (
                  <tr key={p.id}>
                    <td>{p.tipo_documento} {p.documento}</td>
                    <td>{p.nombres} {p.apellidos}</td>
                    <td>{p.sexo}</td>
                    <td>{p.telefono || '-'}</td>
                    <td>{p.empresa} / {p.afiliacion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'consultas' && (
          <div className="card">
            <h3 style={{ marginBottom: '12px' }}>Auditoría de Consultas Públicas</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha Consulta</th>
                  <th>Documento Consultado</th>
                  <th>Código Ingresado</th>
                  <th>Examen</th>
                  <th>IP Origen</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {consultas.map((c) => (
                  <tr key={c.id}>
                    <td>{new Date(c.fecha_consulta).toLocaleString()}</td>
                    <td>{c.documento_consultado}</td>
                    <td><code>{c.codigo_ingresado}</code></td>
                    <td>#{c.consecutivo} - {c.tipo_examen}</td>
                    <td>{c.ip_origen || '-'}</td>
                    <td>
                      <span
                        style={{
                          background: c.exitosa ? '#28a745' : '#dc3545',
                          color: 'white',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                        }}
                      >
                        {c.exitosa ? 'EXITOSA' : 'FALLIDA'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'reportes' && (
          <div className="card">
            <h3 style={{ marginBottom: '12px' }}>Módulo de Reportes</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Título</th>
                  <th>Generado por</th>
                  <th>Fecha Generación</th>
                  <th>Archivo</th>
                </tr>
              </thead>
              <tbody>
                {reportes.map((r) => (
                  <tr key={r.id}>
                    <td>{r.tipo_display}</td>
                    <td>{r.titulo}</td>
                    <td>{r.generado_por_nombre || 'Sistema'}</td>
                    <td>{new Date(r.fecha_generacion).toLocaleString()}</td>
                    <td>
                      {r.archivo ? (
                        <a href={r.archivo} target="_blank" rel="noreferrer">
                          Descargar
                        </a>
                      ) : (
                        'Sin archivo'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}