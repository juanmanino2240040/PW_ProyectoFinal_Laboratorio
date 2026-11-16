import { useState, useEffect, useRef } from 'react';
import api from '../api/axiosConfig';

const NAV_ITEMS = [
  { id: 'resultados', label: 'Resultados' },
  { id: 'pacientes', label: 'Pacientes' },
  { id: 'reportes', label: 'Reportes' },
];

const initialPasswordForm = {
  password_actual: '',
  password_nueva: '',
  confirmar_password: '',
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

export default function Navbar({ user, activeTab, onSelectTab, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState(initialPasswordForm);
  const [changingPassword, setChangingPassword] = useState(false);
  const menuRef = useRef(null);

  const displayName =
    user?.username?.toUpperCase?.() ||
    `${user?.first_name || ''} ${user?.last_name || ''}`.trim().toUpperCase() ||
    'USUARIO';

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

  const handleExportDb = async () => {
    try {
      const res = await api.get('/usuarios/exportar-db/', { responseType: 'blob' });
      const disposition = res.headers?.['content-disposition'] || '';
      const match = disposition.match(/filename="?([^"]+)"?/i);
      const filename = match?.[1] || 'backup_base_datos.sql';
      const blob = new Blob([res.data], { type: 'application/sql' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      let message = 'No se pudo exportar la base de datos.';
      const data = err.response?.data;
      if (data instanceof Blob) {
        try {
          const text = await data.text();
          const parsed = JSON.parse(text);
          message = formatApiError(parsed, message);
        } catch {
          // mantener mensaje por defecto
        }
      } else {
        message = formatApiError(data, message);
      }
      alert(message);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.password_nueva !== passwordForm.confirmar_password) {
      alert('La confirmación no coincide con la nueva contraseña.');
      return;
    }
    setChangingPassword(true);
    try {
      await api.post('/usuarios/cambiar-password/', passwordForm);
      alert('Contraseña actualizada correctamente.');
      setShowPasswordModal(false);
      setPasswordForm(initialPasswordForm);
    } catch (err) {
      alert(formatApiError(err.response?.data, 'No se pudo cambiar la contraseña.'));
    } finally {
      setChangingPassword(false);
    }
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
          title={user?.rol_display || user?.rol || ''}
        >
          <span>{displayName}</span>
          <i className="fa-solid fa-caret-down"></i>
        </button>

        {menuOpen && (
          <div className="user-dropdown-menu">
            <button onClick={() => handleOptionClick(onLogout)}>
              <i className="fa-solid fa-sign-out-alt"></i> Cerrar sesión
            </button>
            <button onClick={() => handleOptionClick(() => setShowPasswordModal(true))}>
              <i className="fa-solid fa-key"></i> Cambio de contraseña
            </button>
            <button onClick={() => handleOptionClick(handleExportDb)}>
              <i className="fa-solid fa-database"></i> Copia de seguridad
            </button>
            <button onClick={() => handleOptionClick(() => onSelectTab('gestion-usuarios'))}>
              <i className="fa-solid fa-users-cog"></i> Gestión de usuario
            </button>
          </div>
        )}
      </div>

      {showPasswordModal && (
        <div className="modal-overlay" onClick={() => !changingPassword && setShowPasswordModal(false)}>
          <div className="modal-container" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Cambiar contraseña</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => !changingPassword && setShowPasswordModal(false)}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handlePasswordSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Contraseña actual *</label>
                  <input
                    type="password"
                    value={passwordForm.password_actual}
                    onChange={(e) => setPasswordForm({ ...passwordForm, password_actual: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Nueva contraseña *</label>
                  <input
                    type="password"
                    value={passwordForm.password_nueva}
                    onChange={(e) => setPasswordForm({ ...passwordForm, password_nueva: e.target.value })}
                    required
                    minLength={8}
                  />
                </div>
                <div className="form-group">
                  <label>Confirmar nueva contraseña *</label>
                  <input
                    type="password"
                    value={passwordForm.confirmar_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmar_password: e.target.value })}
                    required
                    minLength={8}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => { if (!changingPassword) { setShowPasswordModal(false); setPasswordForm(initialPasswordForm); } }}
                  style={{ padding: '8px 14px', borderRadius: '4px', border: '1px solid #ccc', cursor: 'pointer', background: '#fff' }}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-save" disabled={changingPassword}>
                  {changingPassword ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}