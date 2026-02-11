const pool = require('../config/database');

// Obtener todos los pacientes del usuario con paginación
const getAllPatients = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const searchTerm = req.query.search || '';
    const offset = (page - 1) * pageSize;

    console.log('=== GET ALL PATIENTS ===');
    console.log('userId:', userId, 'page:', page, 'pageSize:', pageSize, 'offset:', offset, 'search:', searchTerm);

    let countQuery = `SELECT COUNT(*) as total FROM patient WHERE user_id = ${userId}`;
    let patientsQuery = `SELECT * FROM patient WHERE user_id = ${userId} ORDER BY id DESC LIMIT ${pageSize} OFFSET ${offset}`;

    if (searchTerm) {
      countQuery += ` AND (name LIKE '%${searchTerm}%' OR dni LIKE '%${searchTerm}%')`;
      patientsQuery = patientsQuery.replace(`WHERE user_id = ${userId}`, `WHERE user_id = ${userId} AND (name LIKE '%${searchTerm}%' OR dni LIKE '%${searchTerm}%')`);
    }

    // Obtener total de pacientes
    const [countResult] = await pool.query(countQuery);
    const totalPatients = countResult[0].total;

    // Obtener pacientes paginados
    const [patients] = await pool.query(patientsQuery);

    const totalPages = Math.ceil(totalPatients / pageSize);

    res.json({
      success: true,
      data: patients,
      pagination: {
        currentPage: page,
        pageSize,
        totalPatients,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error obteniendo pacientes:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

// Obtener un paciente por ID
const getPatient = async (req, res) => {
  try {
    const userId = req.user.id;
    const patientId = req.params.id;

    const [patients] = await pool.execute(
      'SELECT * FROM patient WHERE id = ? AND user_id = ?',
      [patientId, userId]
    );

    if (patients.length === 0) {
      return res.status(404).json({ success: false, error: 'Paciente no encontrado' });
    }

    res.json({ success: true, data: patients[0] });
  } catch (error) {
    console.error('Error obteniendo paciente:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

// Actualizar datos del paciente
const updatePatient = async (req, res) => {
  try {
    const userId = req.user.id;
    const patientId = req.params.id;
    const updateData = req.body;

    const updateFields = [];
    const updateValues = [];

    // Solo permitir actualizar ciertos campos
    const allowedFields = ['tel', 'email', 'address', 'occupation', 'affiliate_number', 'holder'];

    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = ?`);
        updateValues.push(updateData[key]);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, error: 'No hay campos válidos para actualizar' });
    }

    updateValues.push(patientId, userId);

    const [result] = await pool.execute(
      `UPDATE patient SET ${updateFields.join(', ')} WHERE id = ? AND user_id = ?`,
      updateValues
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Paciente no encontrado' });
    }

    res.json({ success: true, message: 'Paciente actualizado correctamente' });
  } catch (error) {
    console.error('Error actualizando paciente:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

// Crear o actualizar paciente
const savePatient = async (req, res) => {
  try {
    const userId = req.user.id;
    const patientData = req.body;

    const dataToSave = {
      name: patientData.name,
      lastname: patientData.lastname,
      dni: patientData.dni || '',
      birthdate: patientData.birthDate || null,
      tel: patientData.phone || '',
      email: patientData.email || '',
      address: patientData.address || '',
      occupation: patientData.occupation || '',
      affiliate_number: patientData.healthInsurance?.number || '',
      holder: patientData.healthInsurance?.isHolder || false,
      user_id: userId
    };

    let result;
    if (patientData.patientId) {
      // Update
      const updateFields = [];
      const updateValues = [];
      Object.keys(dataToSave).forEach(key => {
        if (key !== 'user_id') {
          updateFields.push(`${key} = ?`);
          updateValues.push(dataToSave[key]);
        }
      });
      updateValues.push(patientData.patientId, userId);

      [result] = await pool.execute(
        `UPDATE patient SET ${updateFields.join(', ')} WHERE id = ? AND user_id = ?`,
        updateValues
      );

      res.json({ success: true, data: { ...dataToSave, id: patientData.patientId }, isNew: false });
    } else {
      // Insert
      const fields = Object.keys(dataToSave).join(', ');
      const placeholders = Object.keys(dataToSave).map(() => '?').join(', ');
      const values = Object.values(dataToSave);

      [result] = await pool.execute(
        `INSERT INTO patient (${fields}) VALUES (${placeholders})`,
        values
      );

      res.json({ success: true, data: { ...dataToSave, id: result.insertId }, isNew: true });
    }
  } catch (error) {
    console.error('Error guardando paciente:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

// Obtener paciente con anamnesis
const getPatientWithAnamnesis = async (req, res) => {
  try {
    const userId = req.user.id;
    const patientId = req.params.id;

    // Obtener paciente
    const [patients] = await pool.execute(
      'SELECT * FROM patient WHERE id = ? AND user_id = ?',
      [patientId, userId]
    );

    if (patients.length === 0) {
      return res.status(404).json({ success: false, error: 'Paciente no encontrado' });
    }

    // Obtener anamnesis
    const [anamnesis] = await pool.execute(
      'SELECT * FROM anamnesis_answers WHERE patient_id = ?',
      [patientId]
    );

    res.json({
      success: true,
      patient: patients[0],
      anamnesis: anamnesis[0] || null
    });
  } catch (error) {
    console.error('Error obteniendo paciente con anamnesis:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

// Actualizar anamnesis de un paciente
const updatePatientAnamnesis = async (req, res) => {
  try {
    const userId = req.user.id;
    const patientId = req.params.id;
    const anamnesisData = req.body;

    // Verificar que el paciente existe y pertenece al usuario
    const [patients] = await pool.execute(
      'SELECT id FROM patient WHERE id = ? AND user_id = ?',
      [patientId, userId]
    );

    if (patients.length === 0) {
      return res.status(404).json({ success: false, error: 'Paciente no encontrado' });
    }

    // Verificar si ya existe anamnesis
    const [existingAnamnesis] = await pool.execute(
      'SELECT id FROM anamnesis_answers WHERE patient_id = ?',
      [patientId]
    );

    const anamnesisPayload = {
      patient_id: patientId,
      alergico: anamnesisData.allergies?.hasAllergies || false,
      medico_cabecera: anamnesisData.primaryDoctor || null,
      medico_tel: anamnesisData.primaryDoctorPhone || null,
      servicio_cabecera: anamnesisData.primaryService || null,
      alergias_descripcion: anamnesisData.allergies?.description || null,
      tratamiento_medico: anamnesisData.currentTreatment?.underTreatment || false,
      hospitalizado_ultimo_anio: anamnesisData.hospitalization?.wasHospitalized || false,
      hospitalizacion_motivo: anamnesisData.hospitalization?.reason || null,
      problemas_cicatrizacion: anamnesisData.healingProblems || false,
      grupo_sanguineo: anamnesisData.bloodType || null,
      rh: anamnesisData.bloodRh || null,
      embarazada: anamnesisData.isPregnant || false,
      tiempo_gestacional: anamnesisData.pregnancyTime || null,
      obstetra: anamnesisData.obstetrician || null,
      obstetra_tel: anamnesisData.obstetricianPhone || null,
      medicamento: anamnesisData.takesMedication || false,
      medicamento_detalles: anamnesisData.medication || null,
      antecedentes: JSON.stringify(anamnesisData.diseases || []),
      observaciones: anamnesisData.observations || null
    };

    if (existingAnamnesis.length > 0) {
      // Update
      const anamnesisId = existingAnamnesis[0].id;
      const fields = Object.keys(anamnesisPayload).filter(key => key !== 'patient_id');
      const setClause = fields.map(field => `${field} = ?`).join(', ');
      const values = fields.map(field => anamnesisPayload[field]);
      values.push(anamnesisId);

      await pool.execute(
        `UPDATE anamnesis_answers SET ${setClause} WHERE id = ?`,
        values
      );
    } else {
      // Insert
      const fields = Object.keys(anamnesisPayload);
      const placeholders = fields.map(() => '?').join(', ');
      const values = fields.map(field => anamnesisPayload[field]);

      await pool.execute(
        `INSERT INTO anamnesis_answers (${fields.join(', ')}) VALUES (${placeholders})`,
        values
      );
    }

    res.json({ success: true, message: 'Anamnesis actualizada correctamente' });
  } catch (error) {
    console.error('Error actualizando anamnesis:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

// Guardar paciente completo
const saveCompletePatient = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const userId = req.user.id;
    const { patientData, anamnesisData, consentData, odontogramaData } = req.body;

    // Validaciones
    if (!patientData.name || !patientData.lastname || !patientData.dni) {
      return res.status(400).json({ success: false, error: 'Nombre, Apellido y DNI son requeridos' });
    }

    // Las enfermedades (anamnesis) son opcionales
    // El consentimiento es opcional

    // 1. Guardar paciente
    const patientPayload = {
      name: patientData.name,
      lastname: patientData.lastname,
      dni: patientData.dni,
      birthdate: patientData.birthDate || null,
      tel: patientData.phone || '',
      email: patientData.email || '',
      address: patientData.address || '',
      occupation: patientData.occupation || '',
      affiliate_number: patientData.healthInsurance?.number || '',
      holder: patientData.healthInsurance?.isHolder || false,
      user_id: userId
    };

    const patientFields = Object.keys(patientPayload).join(', ');
    const patientPlaceholders = Object.keys(patientPayload).map(() => '?').join(', ');
    const patientValues = Object.values(patientPayload);

    const [patientResult] = await connection.execute(
      `INSERT INTO patient (${patientFields}) VALUES (${patientPlaceholders})`,
      patientValues
    );

    const newPatientId = patientResult.insertId;

    // 2. Guardar anamnesis
    const anamnesisPayload = {
      patient_id: newPatientId,
      alergico: anamnesisData.allergies.hasAllergies || false,
      medico_cabecera: anamnesisData.primaryDoctor || null,
      medico_tel: anamnesisData.primaryDoctorPhone || null,
      servicio_cabecera: anamnesisData.primaryService || null,
      alergias_descripcion: anamnesisData.allergies.description || null,
      tratamiento_medico: anamnesisData.currentTreatment.underTreatment || false,
      hospitalizado_ultimo_anio: anamnesisData.hospitalization.wasHospitalized || false,
      hospitalizacion_motivo: anamnesisData.hospitalization.reason || null,
      problemas_cicatrizacion: anamnesisData.healingProblems || false,
      grupo_sanguineo: anamnesisData.bloodType || null,
      rh: anamnesisData.bloodRh || null,
      embarazada: anamnesisData.isPregnant || false,
      tiempo_gestacional: anamnesisData.pregnancyTime || null,
      obstetra: anamnesisData.obstetrician || null,
      obstetra_tel: anamnesisData.obstetricianPhone || null,
      medicamento: anamnesisData.takesMedication || false,
      medicamento_detalles: anamnesisData.medication || null,
      antecedentes: JSON.stringify(anamnesisData.diseases),
      observaciones: anamnesisData.observations || null
    };

    const anamnesisFields = Object.keys(anamnesisPayload).join(', ');
    const anamnesisPlaceholders = Object.keys(anamnesisPayload).map(() => '?').join(', ');
    const anamnesisValues = Object.values(anamnesisPayload);

    await connection.execute(
      `INSERT INTO anamnesis_answers (${anamnesisFields}) VALUES (${anamnesisPlaceholders})`,
      anamnesisValues
    );

    // 3. Guardar consentimiento
    const consentPayload = {
      patient_id: newPatientId,
      text: `En este acto, yo ${patientData.name} ${patientData.lastname} DNI ${patientData.dni} autorizo a Od ${consentData.doctorName || 'No especificado'} M.P. ${consentData.doctorMatricula || 'No especificada'} y/o asociados o ayudantes a realizar el tratamiento informado, conversado con el profesional sobre la naturaleza y propósito del tratamiento, sobre la posibilidad de complicaciones, los riesgos y administración de anestesia local, práctica, radiografías y otros métodos de diagnóstico.`,
      datetime: consentData.datetime || new Date().toISOString(),
      accepted: consentData.accepted || false
    };

    const consentFields = Object.keys(consentPayload).join(', ');
    const consentPlaceholders = Object.keys(consentPayload).map(() => '?').join(', ');
    const consentValues = Object.values(consentPayload);

    await connection.execute(
      `INSERT INTO consent (${consentFields}) VALUES (${consentPlaceholders})`,
      consentValues
    );

    // 4. Guardar odontograma
    const odontogramaPayload = {
      patient_id: newPatientId,
      formato: JSON.stringify(odontogramaData.adult),
      formato_nino: odontogramaData.child.teethState && Object.keys(odontogramaData.child.teethState).length > 0 || odontogramaData.child.connections.length > 0 ? JSON.stringify(odontogramaData.child) : null,
      observaciones: odontogramaData.observaciones || null,
      elementos_dentarios: odontogramaData.elementos_dentarios || null,
      version: odontogramaData.version || 1
    };

    const odontogramaFields = Object.keys(odontogramaPayload).join(', ');
    const odontogramaPlaceholders = Object.keys(odontogramaPayload).map(() => '?').join(', ');
    const odontogramaValues = Object.values(odontogramaPayload);

    await connection.execute(
      `INSERT INTO odontograma (${odontogramaFields}) VALUES (${odontogramaPlaceholders})`,
      odontogramaValues
    );

    // 5. Guardar tratamientos si existen
    if (odontogramaData.treatments && odontogramaData.treatments.length > 0) {
      console.log('=== GUARDANDO TRATAMIENTOS ===');
      console.log('Número de tratamientos:', odontogramaData.treatments.length);
      
      for (let i = 0; i < odontogramaData.treatments.length; i++) {
        const treatment = odontogramaData.treatments[i];
        console.log(`Guardando tratamiento ${i + 1}:`, treatment);
        
        const treatmentPayload = {
          patient_id: newPatientId,
          date: treatment.date || null,
          code: treatment.code || null,
          tooth_elements: treatment.tooth_elements || null,
          faces: treatment.faces || null,
          observations: treatment.observations || null
        };

        const treatmentFields = Object.keys(treatmentPayload).join(', ');
        const treatmentPlaceholders = Object.keys(treatmentPayload).map(() => '?').join(', ');
        const treatmentValues = Object.values(treatmentPayload);

        console.log('SQL:', `INSERT INTO treatments (${treatmentFields}) VALUES (${treatmentPlaceholders})`);
        console.log('Values:', treatmentValues);

        await connection.execute(
          `INSERT INTO treatments (${treatmentFields}) VALUES (${treatmentPlaceholders})`,
          treatmentValues
        );
        
        console.log(`Tratamiento ${i + 1} guardado exitosamente`);
      }
    }

    await connection.commit();

    res.json({
      success: true,
      patient: { ...patientPayload, id: newPatientId },
      message: `Paciente ${patientData.name} ${patientData.lastname} guardado exitosamente con su historia clínica`
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error guardando paciente completo:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  } finally {
    connection.release();
  }
};

// Obtener consentimiento de un paciente
const getPatientConsent = async (req, res) => {
  try {
    const userId = req.user.id;
    const patientId = req.params.id;

    const [consents] = await pool.execute(
      'SELECT * FROM consent WHERE patient_id = ?',
      [patientId]
    );

    res.json({ success: true, data: consents[0] || null });
  } catch (error) {
    console.error('Error obteniendo consentimiento:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

// Actualizar consentimiento de un paciente
const updatePatientConsent = async (req, res) => {
  try {
    const userId = req.user.id;
    const patientId = req.params.id;
    const consentData = req.body;

    const [result] = await pool.execute(
      'UPDATE consent SET text = ?, datetime = ?, accepted = ? WHERE patient_id = ?',
      [consentData.text, new Date(consentData.datetime), consentData.accepted, patientId]
    );

    res.json({ success: true, message: 'Consentimiento actualizado correctamente' });
  } catch (error) {
    console.error('Error actualizando consentimiento:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

// Obtener tratamientos de un paciente
const getPatientTreatments = async (req, res) => {
  try {
    const userId = req.user.id;
    const patientId = req.params.id;

    const [treatments] = await pool.execute(
      'SELECT * FROM treatments WHERE patient_id = ? ORDER BY date DESC',
      [patientId]
    );

    res.json({ success: true, data: treatments });
  } catch (error) {
    console.error('Error obteniendo tratamientos:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

// Actualizar tratamientos de un paciente
const updatePatientTreatments = async (req, res) => {
  try {
    const userId = req.user.id;
    const patientId = req.params.id;
    const treatments = req.body.treatments || [];

    // Usar transacción para actualizar tratamientos
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Eliminar tratamientos existentes
      await connection.execute('DELETE FROM treatments WHERE patient_id = ?', [patientId]);

      // Insertar tratamientos nuevos
      for (const treatment of treatments) {
        const formattedDate = treatment.date ? new Date(treatment.date).toISOString().split('T')[0] : null;
        await connection.execute(
          'INSERT INTO treatments (patient_id, date, code, tooth_elements, faces, observations) VALUES (?, ?, ?, ?, ?, ?)',
          [patientId, formattedDate, treatment.code, treatment.tooth_elements, treatment.faces, treatment.observations]
        );
      }

      await connection.commit();
      res.json({ success: true, message: 'Tratamientos actualizados correctamente' });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error actualizando tratamientos:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

// Obtener odontograma de un paciente
const getPatientOdontograma = async (req, res) => {
  try {
    const userId = req.user.id;
    const patientId = req.params.id;

    const [odontogramas] = await pool.execute(
      'SELECT * FROM odontograma WHERE patient_id = ? ORDER BY version DESC LIMIT 1',
      [patientId]
    );

    if (odontogramas.length === 0) {
      return res.json({ success: true, data: null });
    }

    const odontograma = odontogramas[0];

    // Parsear los datos JSON
    let adultData = { teethState: {}, connections: [] };
    let childData = { teethState: {}, connections: [] };

    try {
      if (odontograma.formato) {
        if (typeof odontograma.formato === 'string') {
          adultData = JSON.parse(odontograma.formato);
        } else {
          adultData = odontograma.formato;
        }
      }
    } catch (jsonError) {
      console.warn('Error parsing odontograma formato:', jsonError, 'Data:', odontograma.formato);
    }

    try {
      if (odontograma.formato_nino) {
        if (typeof odontograma.formato_nino === 'string') {
          childData = JSON.parse(odontograma.formato_nino);
        } else {
          childData = odontograma.formato_nino;
        }
      }
    } catch (jsonError) {
      console.warn('Error parsing odontograma formato_nino:', jsonError, 'Data:', odontograma.formato_nino);
    }

    res.json({
      success: true,
      data: {
        adult: adultData,
        child: childData,
        observaciones: odontograma.observaciones || '',
        elementos_dentarios: odontograma.elementos_dentarios || '',
        version: odontograma.version,
        treatments: [] // Los tratamientos se obtienen por separado
      }
    });
  } catch (error) {
    console.error('Error obteniendo odontograma:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

// Actualizar odontograma de un paciente
const updatePatientOdontograma = async (req, res) => {
  try {
    const userId = req.user.id;
    const patientId = req.params.id;
    const odontogramaData = req.body;

    // Obtener la versión más alta actual
    const [currentVersions] = await pool.execute(
      'SELECT MAX(version) as maxVersion FROM odontograma WHERE patient_id = ?',
      [patientId]
    );

    const nextVersion = (currentVersions[0].maxVersion || 0) + 1;

    const odontogramaPayload = {
      patient_id: patientId,
      formato: JSON.stringify(odontogramaData.adult),
      formato_nino: odontogramaData.child && Object.keys(odontogramaData.child).length > 0 ? JSON.stringify(odontogramaData.child) : null,
      observaciones: odontogramaData.observaciones || null,
      elementos_dentarios: odontogramaData.elementos_dentarios || null,
      version: nextVersion
    };

    const fields = Object.keys(odontogramaPayload).join(', ');
    const placeholders = Object.keys(odontogramaPayload).map(() => '?').join(', ');
    const values = Object.values(odontogramaPayload);

    await pool.execute(
      `INSERT INTO odontograma (${fields}) VALUES (${placeholders})`,
      values
    );

    res.json({ success: true, message: 'Odontograma actualizado correctamente', version: nextVersion });
  } catch (error) {
    console.error('Error actualizando odontograma:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

// Obtener versiones de odontograma de un paciente
const getOdontogramaVersions = async (req, res) => {
  try {
    const userId = req.user.id;
    const patientId = req.params.id;

    const [versions] = await pool.execute(
      'SELECT version FROM odontograma WHERE patient_id = ? ORDER BY version DESC',
      [patientId]
    );

    const versionNumbers = versions.map(item => item.version);

    res.json({ success: true, data: versionNumbers });
  } catch (error) {
    console.error('Error obteniendo versiones de odontograma:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

// Obtener odontograma por versión específica
const getOdontogramaByVersion = async (req, res) => {
  try {
    const userId = req.user.id;
    const patientId = req.params.id;
    const version = req.params.version;

    const [odontogramas] = await pool.execute(
      'SELECT * FROM odontograma WHERE patient_id = ? AND version = ?',
      [patientId, version]
    );

    if (odontogramas.length === 0) {
      return res.status(404).json({ success: false, error: 'Versión de odontograma no encontrada' });
    }

    const odontograma = odontogramas[0];

    // Parsear los datos JSON
    let adultData = { teethState: {}, connections: [] };
    let childData = { teethState: {}, connections: [] };

    try {
      if (odontograma.formato) {
        if (typeof odontograma.formato === 'string') {
          adultData = JSON.parse(odontograma.formato);
        } else {
          adultData = odontograma.formato;
        }
      }
    } catch (jsonError) {
      console.warn('Error parsing odontograma formato:', jsonError, 'Data:', odontograma.formato);
    }

    try {
      if (odontograma.formato_nino) {
        if (typeof odontograma.formato_nino === 'string') {
          childData = JSON.parse(odontograma.formato_nino);
        } else {
          childData = odontograma.formato_nino;
        }
      }
    } catch (jsonError) {
      console.warn('Error parsing odontograma formato_nino:', jsonError, 'Data:', odontograma.formato_nino);
    }

    res.json({
      success: true,
      data: {
        adult: adultData,
        child: childData,
        observaciones: odontograma.observaciones || '',
        elementos_dentarios: odontograma.elementos_dentarios || '',
        version: odontograma.version,
        treatments: [] // Los tratamientos se obtienen por separado
      }
    });
  } catch (error) {
    console.error('Error obteniendo odontograma por versión:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

// Más funciones según sea necesario...

module.exports = {
  getAllPatients,
  getPatient,
  savePatient,
  updatePatient,
  getPatientWithAnamnesis,
  updatePatientAnamnesis,
  saveCompletePatient,
  getPatientConsent,
  updatePatientConsent,
  getPatientTreatments,
  updatePatientTreatments,
  getPatientOdontograma,
  updatePatientOdontograma,
  getOdontogramaVersions,
  getOdontogramaByVersion
};