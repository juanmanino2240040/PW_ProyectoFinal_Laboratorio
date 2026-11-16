import { useState, useEffect } from 'react';
import Login from './components/Login';
import PortalPaciente from './components/PortalPaciente';
import Navbar from './components/Navbar';
import ResultadosTab from './components/ResultadosTab';
import GestionUsuariosTab from './components/GestionUsuariosTab';
import api from './api/axiosConfig';

const initialPacienteForm = {
  tipo_documento: 'CC',
  documento: '',
  nombres: '',
  apellidos: '',
  fecha_nacimiento: '',
  sexo: 'M',
  telefono: '',
  correo: '',
  direccion: '',
  afiliacion: 'PARTICULAR',
  empresa: 'PARTICULAR',
};

const initialReporteForm = {
  tipo: 'CERTIFICADO',
  titulo: '',
  resultado: '',
  paciente: '',
  fecha_desde: '',
  fecha_hasta: '',
  estado: '',
  empresa: '',
};

const formatApiError = (data, fallback) => {
  if (!data) return fallback;
  if (typeof data === 'string') return data;
  if (data.detail) return data.detail;
  try {
    return Object.entries(data)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`)
      .join('\n');
  } catch {
    return fallback;
  }
};

export default function App() {
  const [user, setUser] = useState(null);
  const [vistaPublicaPaciente, setVistaPublicaPaciente] = useState(false);
  const [activeTab, setActiveTab] = useState('resultados');
  const [pacientes, setPacientes] = useState([]);
  const [resultados, setResultados] = useState([]);
  const [reportes, setReportes] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [showPacienteForm, setShowPacienteForm] = useState(false);
  const [nuevoPaciente, setNuevoPaciente] = useState(initialPacienteForm);
  const [showReporteForm, setShowReporteForm] = useState(false);
  const [nuevoReporte, setNuevoReporte] = useState(initialReporteForm);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setLoadingProfile(false);
      return;
    }

    api
      .get('/usuarios/me/')
      .then((res) => setUser(res.data))
      .catch(() => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setUser(null);
      })
      .finally(() => setLoadingProfile(false));
  }, []);

  const cargarPacientes = async () => {
    const res = await api.get('/pacientes/');
    setPacientes(res.data);
  };

  const cargarResultados = async () => {
    const res = await api.get('/resultados/');
    setResultados(res.data);
  };

  const cargarReportes = async () => {
    const res = await api.get('/reportes/');
    setReportes(res.data);
  };

  useEffect(() => {
    if (!user) return;
    if (activeTab === 'pacientes') cargarPacientes();
    if (activeTab === 'reportes') {
      cargarReportes();
      cargarPacientes();
      cargarResultados();
    }
  }, [activeTab, user]);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    setActiveTab('resultados');
  };

  const handleCrearPaciente = async (e) => {
    e.preventDefault();
    try {
      await api.post('/pacientes/', nuevoPaciente);
      setNuevoPaciente(initialPacienteForm);
      setShowPacienteForm(false);
      await cargarPacientes();
      alert('Paciente creado correctamente.');
    } catch (err) {
      alert(formatApiError(err.response?.data, 'Error al crear el paciente. Verifique los datos.'));
    }
  };

  const handleTipoReporteChange = (tipo) => {
    setNuevoReporte((prev) => ({
      ...initialReporteForm,
      tipo,
      titulo: prev.titulo,
    }));
  };

  const handleCrearReporte = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        tipo: nuevoReporte.tipo,
        titulo: nuevoReporte.titulo,
      };

      if (nuevoReporte.tipo === 'CERTIFICADO') {
        if (!nuevoReporte.resultado) {
          alert('Seleccione un resultado para la certificación individual.');
          return;
        }
        payload.resultado = Number(nuevoReporte.resultado);
      }

      if (nuevoReporte.tipo === 'PACIENTE') {
        if (!nuevoReporte.paciente) {
          alert('Seleccione un paciente para el historial consolidado.');
          return;
        }
        payload.paciente = Number(nuevoReporte.paciente);
      }

      if (['EXCEL', 'ESTADISTICO'].includes(nuevoReporte.tipo)) {
        if (nuevoReporte.fecha_desde) payload.fecha_desde = nuevoReporte.fecha_desde;
        if (nuevoReporte.fecha_hasta) payload.fecha_hasta = nuevoReporte.fecha_hasta;
        if (nuevoReporte.estado) payload.estado = nuevoReporte.estado;
        if (nuevoReporte.empresa) payload.empresa = nuevoReporte.empresa;
      }

      // Para PACIENTE también permitimos filtrar si se desea
      if (nuevoReporte.tipo === 'PACIENTE') {
        if (nuevoReporte.fecha_desde) payload.fecha_desde = nuevoReporte.fecha_desde;
        if (nuevoReporte.fecha_hasta) payload.fecha_hasta = nuevoReporte.fecha_hasta;
        if (nuevoReporte.estado) payload.estado = nuevoReporte.estado;
      }

      await api.post('/reportes/', payload);
      setNuevoReporte(initialReporteForm);
      setShowReporteForm(false);
      await cargarReportes();
      alert('Reporte generado correctamente.');
    } catch (err) {
      alert(formatApiError(err.response?.data, 'Error al generar el reporte. Verifique los datos.'));
    }
  };

  const empresasDisponibles = Array.from(
    new Set(pacientes.map((p) => p.empresa).filter(Boolean))
  ).sort();

  if (loadingProfile) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Cargando sesión...</div>;
  }

  if (!user) {
    if (vistaPublicaPaciente) {
      return <PortalPaciente onVolverLogin={() => setVistaPublicaPaciente(false)} />;
    }
    return (
      <Login
        onLoginSuccess={(perfil) => setUser(perfil)}
        onOpenPortalPaciente={() => setVistaPublicaPaciente(true)}
      />
    );
  }

  return (
    <div>
      <Navbar
        user={user}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onLogout={handleLogout}
      />

      <main className="main-content">
        {activeTab === 'resultados' && <ResultadosTab />}
        {activeTab === 'gestion-usuarios' && <GestionUsuariosTab />}

        {activeTab === 'pacientes' && (
          <div className="card">
            <div className="table-toolbar" style={{ marginBottom: '12px' }}>
              <h3 style={{ margin: 0 }}>Módulo de Pacientes</h3>
              <button
                type="button"
                className="btn-save"
                onClick={() => setShowPacienteForm((v) => !v)}
              >
                <i className="fa-solid fa-plus"></i>{' '}
                {showPacienteForm ? 'Cerrar' : 'Nuevo paciente'}
              </button>
            </div>

            {showPacienteForm && (
              <form onSubmit={handleCrearPaciente} style={{ marginBottom: '16px', padding: '12px', border: '1px solid #dee2e6', borderRadius: '6px' }}>
                <div className="form-row">
                  <div className="form-group col-3">
                    <label>Tipo documento</label>
                    <select value={nuevoPaciente.tipo_documento} onChange={(e) => setNuevoPaciente({ ...nuevoPaciente, tipo_documento: e.target.value })}>
                      <option value="CC">CC</option>
                      <option value="TI">TI</option>
                      <option value="CE">CE</option>
                      <option value="PA">PA</option>
                      <option value="RC">RC</option>
                    </select>
                  </div>
                  <div className="form-group col-3">
                    <label>Documento *</label>
                    <input value={nuevoPaciente.documento} onChange={(e) => setNuevoPaciente({ ...nuevoPaciente, documento: e.target.value })} required />
                  </div>
                  <div className="form-group col-3">
                    <label>Nombres *</label>
                    <input value={nuevoPaciente.nombres} onChange={(e) => setNuevoPaciente({ ...nuevoPaciente, nombres: e.target.value })} required />
                  </div>
                  <div className="form-group col-3">
                    <label>Apellidos *</label>
                    <input value={nuevoPaciente.apellidos} onChange={(e) => setNuevoPaciente({ ...nuevoPaciente, apellidos: e.target.value })} required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group col-3">
                    <label>Fecha nacimiento *</label>
                    <input type="date" value={nuevoPaciente.fecha_nacimiento} onChange={(e) => setNuevoPaciente({ ...nuevoPaciente, fecha_nacimiento: e.target.value })} required />
                  </div>
                  <div className="form-group col-3">
                    <label>Sexo</label>
                    <select value={nuevoPaciente.sexo} onChange={(e) => setNuevoPaciente({ ...nuevoPaciente, sexo: e.target.value })}>
                      <option value="M">Masculino</option>
                      <option value="F">Femenino</option>
                      <option value="O">Otro</option>
                    </select>
                  </div>
                  <div className="form-group col-3">
                    <label>Teléfono</label>
                    <input value={nuevoPaciente.telefono} onChange={(e) => setNuevoPaciente({ ...nuevoPaciente, telefono: e.target.value })} />
                  </div>
                  <div className="form-group col-3">
                    <label>Correo</label>
                    <input type="email" value={nuevoPaciente.correo} onChange={(e) => setNuevoPaciente({ ...nuevoPaciente, correo: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group col-4">
                    <label>Dirección</label>
                    <input value={nuevoPaciente.direccion} onChange={(e) => setNuevoPaciente({ ...nuevoPaciente, direccion: e.target.value })} />
                  </div>
                  <div className="form-group col-4">
                    <label>Afiliación</label>
                    <input value={nuevoPaciente.afiliacion} onChange={(e) => setNuevoPaciente({ ...nuevoPaciente, afiliacion: e.target.value })} />
                  </div>
                  <div className="form-group col-4">
                    <label>Empresa</label>
                    <input value={nuevoPaciente.empresa} onChange={(e) => setNuevoPaciente({ ...nuevoPaciente, empresa: e.target.value })} />
                  </div>
                </div>
                <button type="submit" className="btn-save">Guardar paciente</button>
              </form>
            )}

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

        {activeTab === 'reportes' && (
          <div className="card">
            <div className="table-toolbar" style={{ marginBottom: '12px' }}>
              <h3 style={{ margin: 0 }}>Módulo de Reportes</h3>
              <button
                type="button"
                className="btn-save"
                onClick={() => setShowReporteForm((v) => !v)}
              >
                <i className="fa-solid fa-plus"></i>{' '}
                {showReporteForm ? 'Cerrar' : 'Nuevo reporte'}
              </button>
            </div>

            {showReporteForm && (
              <form onSubmit={handleCrearReporte} style={{ marginBottom: '16px', padding: '12px', border: '1px solid #dee2e6', borderRadius: '6px' }}>
                <div className="form-row">
                  <div className="form-group col-4">
                    <label>Tipo *</label>
                    <select value={nuevoReporte.tipo} onChange={(e) => handleTipoReporteChange(e.target.value)}>
                      <option value="CERTIFICADO">Certificación Individual (PDF)</option>
                      <option value="PACIENTE">Historial Consolidado de Paciente (PDF)</option>
                      <option value="EXCEL">Exportación Tabular (Excel)</option>
                      <option value="ESTADISTICO">Reporte Estadístico (PDF)</option>
                    </select>
                  </div>
                  <div className="form-group col-8">
                    <label>Título *</label>
                    <input value={nuevoReporte.titulo} onChange={(e) => setNuevoReporte({ ...nuevoReporte, titulo: e.target.value })} required />
                  </div>
                </div>

                {nuevoReporte.tipo === 'CERTIFICADO' && (
                  <div className="form-row">
                    <div className="form-group col-12">
                      <label>Resultado (consecutivo / paciente) *</label>
                      <select
                        value={nuevoReporte.resultado}
                        onChange={(e) => setNuevoReporte({ ...nuevoReporte, resultado: e.target.value })}
                        required
                      >
                        <option value="">Seleccione un resultado</option>
                        {resultados.map((r) => (
                          <option key={r.id} value={r.id}>
                            #{r.consecutivo} - {r.paciente_display} ({r.tipo_examen})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {nuevoReporte.tipo === 'PACIENTE' && (
                  <>
                    <div className="form-row">
                      <div className="form-group col-12">
                        <label>Paciente *</label>
                        <select
                          value={nuevoReporte.paciente}
                          onChange={(e) => setNuevoReporte({ ...nuevoReporte, paciente: e.target.value })}
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
                    </div>
                    <div className="form-row">
                      <div className="form-group col-4">
                        <label>Fecha desde</label>
                        <input type="date" value={nuevoReporte.fecha_desde} onChange={(e) => setNuevoReporte({ ...nuevoReporte, fecha_desde: e.target.value })} />
                      </div>
                      <div className="form-group col-4">
                        <label>Fecha hasta</label>
                        <input type="date" value={nuevoReporte.fecha_hasta} onChange={(e) => setNuevoReporte({ ...nuevoReporte, fecha_hasta: e.target.value })} />
                      </div>
                      <div className="form-group col-4">
                        <label>Estado</label>
                        <select value={nuevoReporte.estado} onChange={(e) => setNuevoReporte({ ...nuevoReporte, estado: e.target.value })}>
                          <option value="">Todos</option>
                          <option value="PENDIENTE">PENDIENTE</option>
                          <option value="IMPRESO">IMPRESO</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {(nuevoReporte.tipo === 'EXCEL' || nuevoReporte.tipo === 'ESTADISTICO') && (
                  <div className="form-row">
                    <div className="form-group col-3">
                      <label>Fecha desde</label>
                      <input type="date" value={nuevoReporte.fecha_desde} onChange={(e) => setNuevoReporte({ ...nuevoReporte, fecha_desde: e.target.value })} />
                    </div>
                    <div className="form-group col-3">
                      <label>Fecha hasta</label>
                      <input type="date" value={nuevoReporte.fecha_hasta} onChange={(e) => setNuevoReporte({ ...nuevoReporte, fecha_hasta: e.target.value })} />
                    </div>
                    <div className="form-group col-3">
                      <label>Estado</label>
                      <select value={nuevoReporte.estado} onChange={(e) => setNuevoReporte({ ...nuevoReporte, estado: e.target.value })}>
                        <option value="">Todos</option>
                        <option value="PENDIENTE">PENDIENTE</option>
                        <option value="IMPRESO">IMPRESO</option>
                      </select>
                    </div>
                    <div className="form-group col-3">
                      <label>Empresa</label>
                      <select value={nuevoReporte.empresa} onChange={(e) => setNuevoReporte({ ...nuevoReporte, empresa: e.target.value })}>
                        <option value="">Todas</option>
                        {empresasDisponibles.map((emp) => (
                          <option key={emp} value={emp}>{emp}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <button type="submit" className="btn-save">Generar reporte</button>
              </form>
            )}

            <table className="data-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Pertenece a</th>
                  <th>Título</th>
                  <th>Generado por</th>
                  <th>Fecha Generación</th>
                  <th>Archivo</th>
                </tr>
              </thead>
              <tbody>
                {reportes.map((r) => {
                  let perteneceA = r.tipo_display || r.tipo || '-';
                  if (r.tipo === 'CERTIFICADO') {
                    if (r.resultado_consecutivo) {
                      perteneceA = `Resultado: #${r.resultado_consecutivo}${r.resultado_paciente ? ` - ${r.resultado_paciente}` : r.paciente_nombre ? ` - ${r.paciente_nombre}` : ''}`;
                    } else {
                      perteneceA = 'Certificación individual';
                    }
                  } else if (r.tipo === 'PACIENTE') {
                    const nombre = r.paciente_nombre || r.paciente_documento || '';
                    perteneceA = nombre ? `Paciente: ${nombre}` : 'Paciente';
                  } else if (r.tipo === 'EXCEL') {
                    const filtros = r.filtros_aplicados || {};
                    const partes = [];
                    if (filtros.empresa) partes.push(`Empresa: ${filtros.empresa}`);
                    if (filtros.estado) partes.push(`Estado: ${filtros.estado}`);
                    if (filtros.fecha_desde || filtros.fecha_hasta) partes.push(`Fechas: ${filtros.fecha_desde || '...'} a ${filtros.fecha_hasta || '...'}`);
                    perteneceA = partes.length ? `Exportación (${partes.join(', ')})` : 'Exportación';
                  } else if (r.tipo === 'ESTADISTICO') {
                    const filtros = r.filtros_aplicados || {};
                    const partes = [];
                    if (filtros.empresa) partes.push(`Empresa: ${filtros.empresa}`);
                    if (filtros.estado) partes.push(`Estado: ${filtros.estado}`);
                    if (filtros.fecha_desde || filtros.fecha_hasta) partes.push(`Fechas: ${filtros.fecha_desde || '...'} a ${filtros.fecha_hasta || '...'}`);
                    perteneceA = partes.length ? `Estadístico (${partes.join(', ')})` : 'Estadístico';
                  }

                  return (
                    <tr key={r.id}>
                      <td>{r.tipo_display}</td>
                      <td>{perteneceA}</td>
                      <td>{r.titulo}</td>
                      <td>{r.generado_por_nombre || 'Sistema'}</td>
                      <td>{new Date(r.fecha_generacion).toLocaleString()}</td>
                      <td>
                        {r.archivo ? (
                          <a href={r.archivo} target="_blank" rel="noreferrer" className="btn-save" style={{ textDecoration: 'none', display: 'inline-block', padding: '6px 10px' }}>
                            <i className="fa-solid fa-download"></i> Descargar
                          </a>
                        ) : (
                          'Sin archivo'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}