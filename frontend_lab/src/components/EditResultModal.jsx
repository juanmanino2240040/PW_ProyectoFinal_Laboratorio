import { useState, useEffect } from 'react';

export default function EditResultModal({ isOpen, resultado, onClose, onSave }) {
  const [formData, setFormData] = useState({
    tipo_examen: '',
    estado: 'PENDIENTE',
    medico_remitente: 'PARTICULAR',
    consecutivo: '',
    fecha_toma: '',
    detalle_examenes: '',
    contenido_resultado: '',
    plantilla: 'Nothing selected',
  });

  useEffect(() => {
    if (resultado) {
      setFormData({
        tipo_examen: resultado.tipo_examen || 'QUÍMICA SANGUÍNEA',
        estado: resultado.estado || 'PENDIENTE',
        medico_remitente: resultado.medico_remitente || 'PARTICULAR',
        consecutivo: resultado.consecutivo || '',
        fecha_toma: resultado.fecha_toma ? resultado.fecha_toma.slice(0, 16) : '',
        detalle_examenes: resultado.detalle_examenes || '',
        contenido_resultado: resultado.contenido_resultado || '',
        plantilla: 'Nothing selected',
      });
    }
  }, [resultado]);

  if (!isOpen || !resultado) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePlantillaChange = (e) => {
    const value = e.target.value;
    setFormData((prev) => ({
      ...prev,
      plantilla: value,
      contenido_resultado:
        value === 'Plantilla Estándar Bacteriología'
          ? 'MUESTRA: \nTINCIÓN DE GRAM: \nCULTIVO: \nRECUENTO DE COLONIAS: \nANTIBIOGRAMA: '
          : prev.contenido_resultado,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      id: resultado.id,
      paciente: resultado.paciente,
      consecutivo: formData.consecutivo,
      tipo_examen: formData.tipo_examen,
      medico_remitente: formData.medico_remitente,
      estado: formData.estado,
      fecha_toma: formData.fecha_toma,
      detalle_examenes: formData.detalle_examenes,
      contenido_resultado: formData.contenido_resultado,
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h3>
            Editar Resultado #{formData.consecutivo} — Código Público:{' '}
            <span style={{ color: '#0d6efd' }}>{resultado.codigo_consulta}</span>
          </h3>
          <button type="button" className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group col-4">
                <label>* Tipo de examen:</label>
                <input
                  type="text"
                  name="tipo_examen"
                  value={formData.tipo_examen}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group col-4">
                <label>Estado:</label>
                <select name="estado" value={formData.estado} onChange={handleChange}>
                  <option value="PENDIENTE">PENDIENTE</option>
                  <option value="IMPRESO">IMPRESO</option>
                </select>
              </div>
              <div className="form-group col-4">
                <label>Paciente:</label>
                <input type="text" value={resultado.paciente_display || ''} disabled />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group col-4">
                <label>Médico remitente:</label>
                <input
                  type="text"
                  name="medico_remitente"
                  value={formData.medico_remitente}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group col-4">
                <label>Afiliación:</label>
                <input type="text" value={resultado.paciente_afiliacion || ''} disabled />
              </div>
              <div className="form-group col-4">
                <label>Empresa:</label>
                <input type="text" value={resultado.paciente_empresa || ''} disabled />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group col-3">
                <label>* Consecutivo:</label>
                <input
                  type="text"
                  name="consecutivo"
                  value={formData.consecutivo}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group col-4">
                <label>Fecha y hora de toma:</label>
                <input
                  type="datetime-local"
                  name="fecha_toma"
                  value={formData.fecha_toma}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group col-5" style={{ flex: 5 }}>
                <label>Detalle de exámenes:</label>
                <input
                  type="text"
                  name="detalle_examenes"
                  value={formData.detalle_examenes}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Plantilla</label>
              <span className="alert-banner">
                Al seleccionar una plantilla se formateará el contenido del resultado
              </span>
              <select
                name="plantilla"
                value={formData.plantilla}
                onChange={handlePlantillaChange}
                style={{ marginTop: '5px' }}
              >
                <option value="Nothing selected">Nothing selected</option>
                <option value="Plantilla Estándar Bacteriología">
                  Plantilla Estándar Bacteriología
                </option>
              </select>
            </div>

            <div className="form-group">
              <label style={{ fontWeight: 'bold' }}>Contenido del Resultado</label>
              <textarea
                className="editor-area"
                name="contenido_resultado"
                value={formData.contenido_resultado}
                onChange={handleChange}
              ></textarea>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 14px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-save">
              <i className="fa-solid fa-floppy-disk"></i> Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}