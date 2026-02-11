const pool = require('../config/database');

// Devolver el datetime en formato ISO con T sin conversión de zona horaria
// Lee exactamente lo que está en la BD sin cambios
const convertMySQLDateToISO = (datetimeStr) => {
  if (!datetimeStr) return null;
  
  if (typeof datetimeStr === 'string') {
    // Ya es string, convertir espacio a T: "2026-02-11 08:00:00" → "2026-02-11T08:00:00"
    return datetimeStr.replace(' ', 'T');
  }
  
  if (datetimeStr instanceof Date) {
    // Si MySQL devuelve un Date object, convertirlo a string USANDO MÉTODOS LOCALES
    // SIN conversión de zona horaria
    const year = datetimeStr.getFullYear();
    const month = String(datetimeStr.getMonth() + 1).padStart(2, '0');
    const day = String(datetimeStr.getDate()).padStart(2, '0');
    const hours = String(datetimeStr.getHours()).padStart(2, '0');
    const mins = String(datetimeStr.getMinutes()).padStart(2, '0');
    const secs = String(datetimeStr.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${mins}:${secs}`;
  }
  
  return datetimeStr;
};

// Obtener turnos de hoy
const getTodayAppointments = async (req, res) => {
  try {
    const userId = req.user.id;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const [appointments] = await pool.execute(
      'SELECT * FROM shift WHERE user_id = ? AND datetime >= ? AND datetime < ? AND status = false ORDER BY datetime ASC',
      [userId, startOfDay.toISOString(), endOfDay.toISOString()]
    );

    const appointmentsWithISODates = appointments.map(app => ({
      ...app,
      datetime: convertMySQLDateToISO(app.datetime)
    }));

    res.json(appointmentsWithISODates);
  } catch (error) {
    console.error('Error obteniendo turnos de hoy:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener turnos atrasados
const getOverdueAppointments = async (req, res) => {
  try {
    const userId = req.user.id;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [appointments] = await pool.execute(
      'SELECT * FROM shift WHERE user_id = ? AND datetime < ? AND status = false ORDER BY datetime DESC',
      [userId, startOfDay.toISOString()]
    );

    const appointmentsWithISODates = appointments.map(app => ({
      ...app,
      datetime: convertMySQLDateToISO(app.datetime)
    }));

    res.json(appointmentsWithISODates);
  } catch (error) {
    console.error('Error obteniendo turnos atrasados:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener total de turnos pendientes
const getTotalPendingAppointments = async (req, res) => {
  try {
    const userId = req.user.id;

    const [result] = await pool.execute(
      'SELECT COUNT(*) as total FROM shift WHERE user_id = ? AND status = false',
      [userId]
    );

    res.json(result[0].total);
  } catch (error) {
    console.error('Error obteniendo total de turnos pendientes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Marcar turno como completado
const markAppointmentAsCompleted = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const [result] = await pool.execute(
      'UPDATE shift SET status = true WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Turno no encontrado' });
    }

    res.json({ message: 'Turno marcado como completado' });
  } catch (error) {
    console.error('Error marcando turno como completado:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Crear turno
const createAppointment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, date, time, dni, type } = req.body;

    // Guardar exactamente como viene del frontend: "2026-02-10 21:00:00"
    const datetime = `${date} ${time}:00`;

    const [result] = await pool.execute(
      'INSERT INTO shift (name, datetime, dni, type, status, user_id) VALUES (?, ?, ?, ?, false, ?)',
      [name, datetime, dni || null, type, userId]
    );

    res.status(201).json({
      id: result.insertId,
      name,
      datetime: convertMySQLDateToISO(datetime),
      dni,
      type,
      status: false
    });
  } catch (error) {
    console.error('Error creando turno:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener todos los turnos pendientes
const getAllPendingAppointments = async (req, res) => {
  try {
    const userId = req.user.id;

    const [appointments] = await pool.execute(
      'SELECT * FROM shift WHERE user_id = ? AND status = false ORDER BY datetime ASC',
      [userId]
    );

    // Convertir datetime a ISO format para que JavaScript lo interprete como UTC
    const appointmentsWithISODates = appointments.map(app => ({
      ...app,
      datetime: convertMySQLDateToISO(app.datetime)
    }));

    res.json(appointmentsWithISODates);
  } catch (error) {
    console.error('Error obteniendo turnos pendientes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener turno por ID
const getAppointmentById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const [appointments] = await pool.execute(
      'SELECT * FROM shift WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (appointments.length === 0) {
      return res.status(404).json({ error: 'Turno no encontrado' });
    }

    const appointment = appointments[0];
    appointment.datetime = convertMySQLDateToISO(appointment.datetime);

    res.json(appointment);
  } catch (error) {
    console.error('Error obteniendo turno:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Actualizar turno
const updateAppointment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { name, date, time, dni, type } = req.body;

    const updateFields = [];
    const updateValues = [];

    if (name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(name);
    }
    if (date && time) {
      updateFields.push('datetime = ?');
      // Guardar exactamente como viene: "2026-02-10 21:00:00"
      updateValues.push(`${date} ${time}:00`);
    }
    if (dni !== undefined) {
      updateFields.push('dni = ?');
      updateValues.push(dni);
    }
    if (type !== undefined) {
      updateFields.push('type = ?');
      updateValues.push(type);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }

    updateValues.push(id, userId);

    const [result] = await pool.execute(
      `UPDATE shift SET ${updateFields.join(', ')} WHERE id = ? AND user_id = ?`,
      updateValues
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Turno no encontrado' });
    }

    res.json({ message: 'Turno actualizado exitosamente' });
  } catch (error) {
    console.error('Error actualizando turno:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Eliminar turno
const deleteAppointment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const [result] = await pool.execute(
      'DELETE FROM shift WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Turno no encontrado' });
    }

    res.json({ message: 'Turno eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando turno:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  getTodayAppointments,
  getOverdueAppointments,
  getTotalPendingAppointments,
  markAppointmentAsCompleted,
  createAppointment,
  getAllPendingAppointments,
  getAppointmentById,
  updateAppointment,
  deleteAppointment
};