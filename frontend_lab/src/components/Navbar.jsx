import { useState, useEffect, useRef } from 'react';

const NAV_ITEMS = [
  { id: 'resultados', label: 'Resultados' },
  { id: 'pacientes', label: 'Pacientes' },
  { id: 'medicos', label: 'Médicos' },
  { id: 'afiliaciones', label: 'Afiliaciones' },
  { id: 'empresas', label: 'Empresas' },
  { id: 'examenes', label: 'Exámenes' },
  { id: 'plantillas', label: 'Plantillas' },
  { id: 'reportes', label: 'Reportes' },
];

export default function Navbar({ username, activeTab, onSelectTab, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOptionClick = (action) => {
    setMenuOpen(false);
    action();
  };

  return (
    <header className="navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <i className="fa-solid fa-vials" style={{ fontSize: '20px' }}></i>
        <nav className="nav-links">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`nav-btn ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => onSelectTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="user-menu-container" ref={menuRef}>
        <button
          className="user-dropdown-btn"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span>{username}</span>
          <i className="fa-solid fa-caret-down"></i>
        </button>

        {menuOpen && (
          <div className="user-dropdown-menu">
            <button onClick={() => handleOptionClick(onLogout)}>
              <i className="fa-solid fa-sign-out-alt"></i> Cerrar sesión
            </button>
            <button onClick={() => handleOptionClick(() => alert('Cambio de contraseña'))}>
              <i className="fa-solid fa-key"></i> Cambio de contraseña
            </button>
            <button onClick={() => handleOptionClick(() => alert('Copia de seguridad iniciada'))}>
              <i className="fa-solid fa-database"></i> Copia de seguridad
            </button>
            <button onClick={() => handleOptionClick(() => onSelectTab('gestion-usuarios'))}>
              <i className="fa-solid fa-users-cog"></i> Gestión de usuario
            </button>
          </div>
        )}
      </div>
    </header>
  );
}