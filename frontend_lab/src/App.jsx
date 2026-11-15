import { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import Login from './components/Login';
import Navbar from './components/Navbar';
import ResultadosTab from './components/ResultadosTab';
import GestionUsuariosTab from './components/GestionUsuariosTab';

const MODULOS_PLACEHOLDER = {
  pacientes: { titulo: 'Módulo de Pacientes', desc: 'Gestión del expediente de pacientes y muestras de bacteriología.' },
  medicos: { titulo: 'Módulo de Médicos', desc: 'Listado de médicos remitentes.' },
  afiliaciones: { titulo: 'Módulo de Afiliaciones', desc: 'Convenios y regímenes de afiliación.' },
  empresas: { titulo: 'Módulo de Empresas', desc: 'Administración de empresas clientes.' },
  examenes: { titulo: 'Módulo de Exámenes', desc: 'Catálogo de pruebas microbiológicas y de laboratorio.' },
  plantillas: { titulo: 'Módulo de Plantillas', desc: 'Configuración de formatos de resultados.' },
  reportes: { titulo: 'Módulo de Reportes', desc: 'Generación de estadísticas e informes clínicos.' },
};

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('resultados');

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        const isExpired = decoded.exp * 1000 < Date.now();
        if (!isExpired) {
          setUser((decoded.username || 'USUARIO').toUpperCase());
        } else {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        }
      } catch {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      }
    }
  }, []);

  const handleLoginSuccess = (username) => {
    setUser(username);
    setActiveTab('resultados');
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
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

        {MODULOS_PLACEHOLDER[activeTab] && (
          <div className="card">
            <h3>{MODULOS_PLACEHOLDER[activeTab].titulo}</h3>
            <p style={{ marginTop: '8px', color: '#555' }}>
              {MODULOS_PLACEHOLDER[activeTab].desc}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}