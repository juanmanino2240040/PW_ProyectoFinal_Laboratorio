import { useState } from 'react';
import api from '../api/axiosConfig';

export default function Login({ onLoginSuccess, onOpenPortalPaciente }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Por favor ingrese usuario y contraseña.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/token/', {
        username: username.trim(),
        password,
      });

      const { access, refresh } = response.data;
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);

      // Obtener los datos del usuario autenticado desde el serializer de la app usuarios
      const perfil = await api.get('/usuarios/me/');
      onLoginSuccess(perfil.data);
    } catch (err) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      if (err.response?.status === 401) {
        setError('Usuario o contraseña incorrectos.');
      } else {
        setError('No se pudo conectar con el servidor de Django.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-view">
      <button
        type="button"
        className="top-btn"
        onClick={onOpenPortalPaciente || (() => alert('Módulo de consultas públicas no disponible.'))}
      >
        Consultas
      </button>

      <div className="login-card">
        <div className="lab-illustration">
          <i className="fa-solid fa-flask-vial icon-main"></i>
          <i className="fa-solid fa-microscope icon-sub"></i>
          <i className="fa-solid fa-vial icon-sub"></i>
        </div>
        <p style={{ color: '#6c757d', fontSize: '13px', marginBottom: '20px' }}>
          Sistema de Laboratorio de Bacteriología
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
              border: '1px solid #f5c2c7',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="text"
              placeholder="Ingrese su usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <input
              type="password"
              placeholder="Ingrese su clave"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Verificando...' : 'Ingresar'}
          </button>
        </form>

        <div className="footer-credit">
          Desarrollado por: <strong>JOTAFREX</strong>
        </div>
      </div>
    </div>
  );
}