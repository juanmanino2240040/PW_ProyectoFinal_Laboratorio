import { useState, useEffect } from 'react';

export default function EditResultModal({ isOpen, resultado, onClose, onSave }) {
  const [formData, setFormData] = useState({
    tipoExamen: 'GLICEMIA',
    estado: 'IMPRESO',
    paciente: '',
    medico: 'PARTICULAR',
    afiliacion: 'PARTICULAR',
    empresa: 'PARTICULAR',
    consecutivo: '',
    fecha: '2025-05-05',
    examenesDetalle: '',
    valorGlicemia: '103 mg/dL',
    plantilla: 'Nothing selected',
    observaciones: '',
  });

  useEffect(() => {
    if (resultado) {
      setFormData({
        tipoExamen: resultado.examen || 'GLICEMIA',
        estado: resultado.estado || 'PENDIENTE',
        paciente: resultado.paciente || '',
        medico: resultado.medico || 'PARTICULAR',
        afiliacion: resultado.afiliacion || 'PARTICULAR',
        empresa: resultado.empresa || 'PARTICULAR',
        consecutivo: resultado.consecutivo || '',
        fecha: resultado.fecha || '2025-05-05',
        examenesDetalle: resultado.examenesDetalle || '',
        valorGlicemia: resultado.valorGlicemia || '103 mg/dL',
        plantilla: 'Nothing selected',
        observaciones: resultado.observaciones || '',
      });
    }
  }, [resultado]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePlantillaChange = (e) => {
    const value = e.target.value;
    setFormData((prev) => ({
      ...prev,
      plantilla: value,
      observaciones:
        value === 'Plantilla Estándar Bacteriología'
          ? 'MUESTRA: \nTINCIÓN DE GRAM: \nCULTIVO: \nANTIBIOGRAMA: '
          : prev.observaciones,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...resultado, ...formData });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h3>Editar Resultado</h3>
          <button type="button" className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group col-4">
                <label>* Tipo de examen:</label>
                <select name="tipoExamen" value={formData.tipoExamen} onChange={handleChange}>
                  <option value="QUÍMICA SANGUÍNEA">QUÍMICA SANGUÍNEA</option>
                  <option value="GLICEMIA">GLICEMIA</option>
                  <option value="CULTIVO DE ORINA / UROCULTIVO">CULTIVO DE ORINA / UROCULTIVO</option>
                  <option value="COPROCULTIVO">COPROCULTIVO</option>
                  <option value="AMIGDALAR">AMIGDALAR</option>
                </select>
              </div>
              <div className="form-group col-4">
                <label>Estado:</label>
                <select name="estado" value={formData.estado} onChange={handleChange}>
                  <option value="IMPRESO">IMPRESO</option>
                  <option value="PENDIENTE">PENDIENTE</option>
                  <option value="EN PROCESO">EN PROCESO</option>
                </select>
              </div>
              <div className="form-group col-4">
                <label>* Paciente:</label>
                <input
                  type="text"
                  name="paciente"
                  value={formData.paciente}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group col-4">
                <label>Médico:</label>
                <input type="text" name="medico" value={formData.medico} onChange={handleChange} />
              </div>
              <div className="form-group col-4">
                <label>Afiliación:</label>
                <input type="text" name="afiliacion" value={formData.afiliacion} onChange={handleChange} />
              </div>
              <div className="form-group col-4">
                <label>Empresa:</label>
                <input type="text" name="empresa" value={formData.empresa} onChange={handleChange} />
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
              <div className="form-group col-3">
                <label>Fecha:</label>
                <input type="date" name="fecha" value={formData.fecha} onChange={handleChange} />
              </div>
              <div className="form-group col-6">
                <label>Exámenes:</label>
                <input
                  type="text"
                  name="examenesDetalle"
                  placeholder="Detalle de exámenes..."
                  value={formData.examenesDetalle}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label style={{ fontWeight: 'bold', color: '#212529' }}>Glicemia</label>
              <input
                type="text"
                name="valorGlicemia"
                value={formData.valorGlicemia}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Plantilla</label>
              <span className="alert-banner">
                Al seleccionar una nueva plantilla, los datos en el campo Resultado/Otros serán formateados con los de la plantilla
              </span>
              <select
                name="plantilla"
                value={formData.plantilla}
                onChange={handlePlantillaChange}
                style={{ marginTop: '5px' }}
              >
                <option value="Nothing selected">Nothing selected</option>
                <option value="Plantilla Estándar Bacteriología">Plantilla Estándar Bacteriología</option>
              </select>
            </div>

            <div className="form-group">
              <label style={{ fontWeight: 'bold' }}>Resultados</label>
              <textarea
                className="editor-area"
                name="observaciones"
                placeholder="Escriba los detalles microbiológicos u observaciones aquí..."
                value={formData.observaciones}
                onChange={handleChange}
              ></textarea>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '8px 14px', borderRadius: '4px', border: '1px solid #ccc', cursor: 'pointer' }}
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