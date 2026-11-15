import { useState, useEffect } from 'react';
import api from '../api/axiosConfig';

const PERMISOS_LISTA = [
  'Todos',
  'Actualizar Permisos',
  'Actualizar usuario',
  'Añadir orden antigua',
  'Añadir Roles',
  'Añadir Usuario',
  'Eliminar usuario',
  'Importar copia de seguridad sistema',
  'Vista Afiliaciones',
  'Vista Doctores',
  'Vista Empresas',
  'Vista Examenes',
  'Vista Gestion',
  'Vista Pacientes',
  'Vista Plantillas',
  'Vista Reportes',
  'Vista Resultados',
];

const USUARIOS_DEMO = [
  { id: 3, usuario: 'MERY', rol: 'Recepcion' },
  { id: 4, usuario: 'PATRICIA', rol: 'Registro' },
  { id: 6, usuario: 'GRACIELA', rol: 'Registro' },
  { id: 9, usuario: 'YOMARA', rol: 'Registro' },
  { id: 10, usuario: 'ADENISC', rol: 'Registro' },
];

export default function GestionUsuariosTab() {
  const [rolSeleccionado, setRolSeleccionado] = useState('Recepcion');
  const [usuarios, setUsuarios] = useState(USUARIOS_DEMO);
  const [busquedaUsuario, setBusquedaUsuario] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(3);
  const [permisosActivos, setPermisosActivos] = useState([
    'Vista Afiliaciones',
    'Vista Doctores',
    'Vista Empresas',
    'Vista Examenes',
    'Vista Pacientes',
    'Vista Plantillas',
    'Vista Reportes',
    'Vista Resultados',
  ]);

  useEffect(() => {
    const fetchUsuarios = async () => {
      try {
        const res = await api.get('/usuarios/');
        if (Array.isArray(res.data) && res.data.length > 0) {
          setUsuarios(res.data);
        }
      } catch {
        // Mantiene usuarios locales si el endpoint aún no existe en Django
      }
    };
    fetchUsuarios();
  }, []);

  const togglePermiso = (permiso) => {
    if (permiso === 'Todos') {
      setPermisosActivos((prev) =>
        prev.includes('Todos') ? [] : [...PERMISOS_LISTA]
      );
      return;
    }
    setPermisosActivos((prev) =>
      prev.includes(permiso) ? prev.filter((p) => p !== permiso) : [...prev, permiso]
    );
  };

  const handleDeleteUser = async () => {
    if (!selectedUserId) return;
    if (!window.confirm('¿Eliminar el usuario seleccionado?')) return;
    try {
      await api.delete(`/usuarios/${selectedUserId}/`);
    } catch {
      // Fallback local
    }
    setUsuarios((prev) => prev.filter((u) => u.id !== selectedUserId));
    setSelectedUserId(null);
  };

  const usuariosFiltrados = usuarios.filter(
    (u) =>
      u.usuario.toLowerCase().includes(busquedaUsuario.toLowerCase()) ||
      u.rol.toLowerCase().includes(busquedaUsuario.toLowerCase())
  );

  return (
    <div className="two-column-layout">
      <div className="card">
        <div className="card-header">Gestión de roles</div>
        <div className="card-body">
          <div className="form-group">
            <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Rol :</label>
            <select
              value={rolSeleccionado}
              onChange={(e) => setRolSeleccionado(e.target.value)}
              style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px', marginTop: '5px' }}
            >
              <option value="Recepcion">Recepcion</option>
              <option value="Bacteriólogo / Laboratorio">Bacteriólogo / Laboratorio</option>
              <option value="Administrador">Administrador</option>
            </select>
          </div>

          <label style={{ fontWeight: 'bold', fontSize: '13px', marginTop: '15px', display: 'block' }}>
            Permisos :
          </label>
          <div className="checkbox-list">
            {PERMISOS_LISTA.map((permiso) => (
              <label key={permiso} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={permisosActivos.includes(permiso)}
                  onChange={() => togglePermiso(permiso)}
                />
                {permiso}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">Gestión de usuarios</div>
        <div className="card-body">
          <div className="table-toolbar">
            <div style={{ display: 'flex', gap: '5px' }}>
              <button style={{ padding: '5px 10px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>
                <i className="fa-solid fa-copy"></i>
              </button>
              <button style={{ padding: '5px 10px', background: '#198754', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>
                <i className="fa-solid fa-file-excel"></i>
              </button>
              <button style={{ padding: '5px 10px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>
                <i className="fa-solid fa-file-pdf"></i>
              </button>
              <button style={{ padding: '5px 10px', background: '#17a2b8', color: 'white', border: 'none', borderRadius: '3px', fontSize: '12px', cursor: 'pointer' }}>
                Ver Columnas <i className="fa-solid fa-caret-down"></i>
              </button>
            </div>
            <div>
              <label style={{ fontSize: '12px' }}>Buscar: </label>
              <input
                type="text"
                value={busquedaUsuario}
                onChange={(e) => setBusquedaUsuario(e.target.value)}
                style={{ padding: '4px', border: '1px solid #ccc', borderRadius: '3px' }}
              />
            </div>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th style={{ background: '#212529', color: 'white' }}>Id <i className="fa-solid fa-sort"></i></th>
                <th style={{ background: '#212529', color: 'white' }}>Usuario <i className="fa-solid fa-sort"></i></th>
                <th style={{ background: '#212529', color: 'white' }}>Rol <i className="fa-solid fa-sort"></i></th>
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
                  <td>{u.usuario}</td>
                  <td>{u.rol}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px' }}>
            <span style={{ fontSize: '12px', color: '#6c757d' }}>
              Mostrando registros del 1 al {usuariosFiltrados.length} de un total de {usuariosFiltrados.length} registros
            </span>
            <div style={{ display: 'flex', gap: '2px' }}>
              <button style={{ padding: '5px 10px', border: '1px solid #ccc', background: '#fff', fontSize: '12px' }}>Anterior</button>
              <button style={{ padding: '5px 10px', border: '1px solid #0d6efd', background: '#0d6efd', color: 'white', fontSize: '12px' }}>1</button>
              <button style={{ padding: '5px 10px', border: '1px solid #ccc', background: '#fff', fontSize: '12px' }}>Siguiente</button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
            <button
              title="Nuevo usuario"
              onClick={() => alert('Formulario de creación de usuario')}
              style={{ background: '#198754', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }}
            >
              <i className="fa-solid fa-plus"></i>
            </button>
            <button
              title="Editar usuario"
              onClick={() => alert(`Editando usuario ID: ${selectedUserId}`)}
              style={{ background: '#0d6efd', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }}
            >
              <i className="fa-solid fa-pen-to-square"></i>
            </button>
            <button
              title="Eliminar usuario"
              onClick={handleDeleteUser}
              style={{ background: '#dc3545', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }}
            >
              <i className="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}