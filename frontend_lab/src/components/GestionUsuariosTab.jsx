import { useState, useEffect } from 'react';
import api from '../api/axiosConfig';

const emptyForm = {
  username: '',
  email: '',
  first_name: '',
  last_name: '',
  documento: '',
  cargo: '',
  rol: 'REGISTRO',
  is_active: true,
  password: '',
};

const getUsuarioNombre = (u) => u.username || u.usuario || '';
const getUsuarioRol = (u) => u.rol_display || u.rol || '';

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

export default function GestionUsuariosTab() {
  const [usuarios, setUsuarios] = useState([]);
  const [busquedaUsuario, setBusquedaUsuario] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [mode, setMode] = useState(null); // 'create' | 'edit' | null
  const [loading, setLoading] = useState(false);

  const fetchUsuarios = async () => {
    try {
      const res = await api.get('/usuarios/');
      setUsuarios(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
      setUsuarios([]);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const usuariosFiltrados = usuarios.filter((u) => {
    const nombre = getUsuarioNombre(u).toLowerCase();
    const rol = getUsuarioRol(u).toLowerCase();
    const q = busquedaUsuario.toLowerCase();
    return nombre.includes(q) || rol.includes(q);
  });

  const selectedUser = usuarios.find((u) => u.id === selectedUserId) || null;

  const startCreate = () => {
    setSelectedUserId(null);
    setFormData(emptyForm);
    setMode('create');
  };

  const startEdit = () => {
    if (!selectedUser) {
      alert('Seleccione un usuario para editar.');
      return;
    }
    setFormData({
      username: selectedUser.username || '',
      email: selectedUser.email || '',
      first_name: selectedUser.first_name || '',
      last_name: selectedUser.last_name || '',
      documento: selectedUser.documento || '',
      cargo: selectedUser.cargo || '',
      rol: selectedUser.rol || 'REGISTRO',
      is_active: selectedUser.is_active !== false,
      password: '',
    });
    setMode('edit');
  };

  const cancelForm = () => {
    setMode(null);
    setFormData(emptyForm);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'create') {
        if (!formData.password || formData.password.length < 8) {
          alert('La contraseña es obligatoria y debe tener al menos 8 caracteres.');
          setLoading(false);
          return;
        }
        const payload = { ...formData };
        await api.post('/usuarios/', payload);
        alert('Usuario creado correctamente.');
      } else if (mode === 'edit' && selectedUserId) {
        const payload = { ...formData };
        if (!payload.password) delete payload.password; // opcional al editar
        await api.put(`/usuarios/${selectedUserId}/`, payload);
        alert('Usuario actualizado correctamente.');
      }
      await fetchUsuarios();
      cancelForm();
    } catch (err) {
      alert(formatApiError(err.response?.data, 'Error al guardar el usuario.'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUserId) {
      alert('Seleccione un usuario para eliminar.');
      return;
    }
    if (!window.confirm('¿Está seguro de eliminar el usuario seleccionado?')) return;
    try {
      await api.delete(`/usuarios/${selectedUserId}/`);
      setSelectedUserId(null);
      await fetchUsuarios();
      if (mode === 'edit') cancelForm();
      alert('Usuario eliminado correctamente.');
    } catch (err) {
      alert(formatApiError(err.response?.data, 'No se pudo eliminar el usuario.'));
    }
  };

  return (
    <div className="card">
      <div className="card-header">Gestión de usuarios</div>
      <div className="card-body">
        <div className="table-toolbar" style={{ marginBottom: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', marginRight: '6px' }}>Buscar:</label>
            <input
              type="text"
              value={busquedaUsuario}
              onChange={(e) => setBusquedaUsuario(e.target.value)}
              placeholder="Usuario o rol..."
              style={{ padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              title="Nuevo usuario"
              onClick={startCreate}
              style={{ background: '#198754', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }}
            >
              <i className="fa-solid fa-plus"></i> Nuevo
            </button>
            <button
              title="Editar usuario"
              onClick={startEdit}
              style={{ background: '#0d6efd', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }}
            >
              <i className="fa-solid fa-pen-to-square"></i> Editar
            </button>
            <button
              title="Eliminar usuario"
              onClick={handleDeleteUser}
              style={{ background: '#dc3545', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }}
            >
              <i className="fa-solid fa-trash"></i> Eliminar
            </button>
          </div>
        </div>

        {mode && (
          <form onSubmit={handleSubmit} style={{ marginBottom: '16px', padding: '12px', border: '1px solid #dee2e6', borderRadius: '6px', background: '#f8f9fa' }}>
            <h4 style={{ marginTop: 0, marginBottom: '12px' }}>
              {mode === 'create' ? 'Crear usuario' : `Editar usuario #${selectedUserId}`}
            </h4>
            <div className="form-row">
              <div className="form-group col-4">
                <label>Usuario *</label>
                <input name="username" value={formData.username} onChange={handleChange} required />
              </div>
              <div className="form-group col-4">
                <label>Correo</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} />
              </div>
              <div className="form-group col-4">
                <label>Rol *</label>
                <select name="rol" value={formData.rol} onChange={handleChange} required>
                  <option value="ADMIN">Administrador</option>
                  <option value="RECEPCION">Recepción</option>
                  <option value="REGISTRO">Registro</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group col-3">
                <label>Nombre</label>
                <input name="first_name" value={formData.first_name} onChange={handleChange} />
              </div>
              <div className="form-group col-3">
                <label>Apellido</label>
                <input name="last_name" value={formData.last_name} onChange={handleChange} />
              </div>
              <div className="form-group col-3">
                <label>Documento</label>
                <input name="documento" value={formData.documento} onChange={handleChange} />
              </div>
              <div className="form-group col-3">
                <label>Cargo</label>
                <input name="cargo" value={formData.cargo} onChange={handleChange} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group col-4">
                <label>Contraseña {mode === 'create' ? '*' : '(dejar en blanco para no cambiar)'}</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required={mode === 'create'}
                  minLength={mode === 'create' ? 8 : undefined}
                />
              </div>
              <div className="form-group col-4" style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '22px' }}>
                <input id="is_active" type="checkbox" name="is_active" checked={formData.is_active} onChange={handleChange} style={{ width: 'auto' }} />
                <label htmlFor="is_active" style={{ margin: 0 }}>Usuario activo</label>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" className="btn-save" disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
              <button type="button" onClick={cancelForm} style={{ padding: '8px 14px', borderRadius: '4px', border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}>
                Cancelar
              </button>
            </div>
          </form>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Usuario</th>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Documento</th>
                <th>Cargo</th>
                <th>Activo</th>
              </tr>
            </thead>
            <tbody>
              {usuariosFiltrados.map((u) => (
                <tr
                  key={u.id}
                  onClick={() => setSelectedUserId(u.id)}
                  style={{
                    background: selectedUserId === u.id ? '#e2e3e5' : 'white',
                    cursor: 'pointer',
                  }}
                >
                  <td>{u.id}</td>
                  <td>{getUsuarioNombre(u)}</td>
                  <td>{[u.first_name, u.last_name].filter(Boolean).join(' ') || '-'}</td>
                  <td>{u.email || '-'}</td>
                  <td>{getUsuarioRol(u)}</td>
                  <td>{u.documento || '-'}</td>
                  <td>{u.cargo || '-'}</td>
                  <td>{u.is_active ? 'Sí' : 'No'}</td>
                </tr>
              ))}
              {usuariosFiltrados.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', color: '#6c757d' }}>No hay usuarios para mostrar.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: '12px', fontSize: '12px', color: '#6c757d' }}>
          Mostrando {usuariosFiltrados.length} de {usuarios.length} usuarios.
        </div>
      </div>
    </div>
  );
}