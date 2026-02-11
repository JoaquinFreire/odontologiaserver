const pool = require('../config/database');

// Obtener todos los presupuestos de tratamiento de un paciente
const getTreatmentBudgets = async (req, res) => {
  try {
    const { patientId } = req.params;
    const userId = req.user.id;

    // Verificar que el paciente pertenece al usuario autenticado
    const [patientCheck] = await pool.query(
      'SELECT id FROM patient WHERE id = ? AND user_id = ?',
      [patientId, userId]
    );

    if (patientCheck.length === 0) {
      return res.status(404).json({ success: false, error: 'Paciente no encontrado' });
    }

    // Obtener todos los presupuestos de tratamiento del paciente
    const [budgets] = await pool.query(
      'SELECT * FROM treatment_budget WHERE patient_id = ? ORDER BY id DESC',
      [patientId]
    );

    // Para cada presupuesto, calcular cuánto se ha pagado
    const budgetsWithPayments = await Promise.all(
      budgets.map(async (budget) => {
        let payments;
        try {
          // Intentar consulta con filtro is_active (después de migración)
          [payments] = await pool.query(
            'SELECT SUM(amount_paid) as total_paid FROM payments WHERE treatment_budget_id = ? AND (is_active IS NULL OR is_active = 1)',
            [budget.id]
          );
        } catch (error) {
          // Si la columna no existe, usar consulta simple
          if (error.code === 'ER_BAD_FIELD_ERROR') {
            [payments] = await pool.query(
              'SELECT SUM(amount_paid) as total_paid FROM payments WHERE treatment_budget_id = ?',
              [budget.id]
            );
          } else {
            throw error;
          }
        }

        const totalPaid = payments[0]?.total_paid || 0;
        const remaining = budget.total - totalPaid;

        return {
          ...budget,
          total_paid: parseFloat(totalPaid),
          remaining: parseFloat(remaining)
        };
      })
    );

    res.json({
      success: true,
      data: budgetsWithPayments
    });
  } catch (error) {
    console.error('Error obteniendo presupuestos:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

// Obtener un presupuesto específico
const getTreatmentBudget = async (req, res) => {
  try {
    const { patientId, budgetId } = req.params;
    const userId = req.user.id;

    // Verificar que el paciente pertenece al usuario autenticado
    const [patientCheck] = await pool.query(
      'SELECT id FROM patient WHERE id = ? AND user_id = ?',
      [patientId, userId]
    );

    if (patientCheck.length === 0) {
      return res.status(404).json({ success: false, error: 'Paciente no encontrado' });
    }

    // Obtener el presupuesto
    const [budgets] = await pool.query(
      'SELECT * FROM treatment_budget WHERE id = ? AND patient_id = ?',
      [budgetId, patientId]
    );

    if (budgets.length === 0) {
      return res.status(404).json({ success: false, error: 'Presupuesto no encontrado' });
    }

    const budget = budgets[0];

    // Obtener los pagos asociados
    let payments;
    try {
      // Intentar consulta con filtro is_active (después de migración)
      [payments] = await pool.query(
        'SELECT * FROM payments WHERE treatment_budget_id = ? AND (is_active IS NULL OR is_active = 1) ORDER BY payment_date DESC',
        [budgetId]
      );
    } catch (error) {
      // Si la columna no existe, usar consulta simple
      if (error.code === 'ER_BAD_FIELD_ERROR') {
        [payments] = await pool.query(
          'SELECT * FROM payments WHERE treatment_budget_id = ? ORDER BY payment_date DESC',
          [budgetId]
        );
      } else {
        throw error;
      }
    }

    const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount_paid), 0);
    const remaining = budget.total - totalPaid;

    res.json({
      success: true,
      data: {
        ...budget,
        payments,
        total_paid: totalPaid,
        remaining
      }
    });
  } catch (error) {
    console.error('Error obteniendo presupuesto:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

// Crear un nuevo presupuesto de tratamiento
const createTreatmentBudget = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { treatment, total } = req.body;
    const userId = req.user.id;

    // Validar entrada
    if (!treatment || !total) {
      return res.status(400).json({ 
        success: false, 
        error: 'El tratamiento y el total son requeridos' 
      });
    }

    // Verificar que el paciente pertenece al usuario autenticado
    const [patientCheck] = await pool.query(
      'SELECT id FROM patient WHERE id = ? AND user_id = ?',
      [patientId, userId]
    );

    if (patientCheck.length === 0) {
      return res.status(404).json({ success: false, error: 'Paciente no encontrado' });
    }

    // Crear el presupuesto
    const [result] = await pool.query(
      'INSERT INTO treatment_budget (patient_id, treatment, total, pending, is_active) VALUES (?, ?, ?, ?, 1)',
      [patientId, treatment, total, total]
    );

    res.json({
      success: true,
      data: {
        id: result.insertId,
        patient_id: patientId,
        treatment,
        total: parseFloat(total),
        pending: parseFloat(total),
        is_active: 1,
        total_paid: 0,
        remaining: parseFloat(total)
      }
    });
  } catch (error) {
    console.error('Error creando presupuesto:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

// Actualizar un presupuesto
const updateTreatmentBudget = async (req, res) => {
  try {
    const { patientId, budgetId } = req.params;
    const { treatment, total, is_active } = req.body;
    const userId = req.user.id;

    // Verificar que el paciente pertenece al usuario autenticado
    const [patientCheck] = await pool.query(
      'SELECT id FROM patient WHERE id = ? AND user_id = ?',
      [patientId, userId]
    );

    if (patientCheck.length === 0) {
      return res.status(404).json({ success: false, error: 'Paciente no encontrado' });
    }

    // Verificar que el presupuesto existe
    const [budgetCheck] = await pool.query(
      'SELECT * FROM treatment_budget WHERE id = ? AND patient_id = ?',
      [budgetId, patientId]
    );

    if (budgetCheck.length === 0) {
      return res.status(404).json({ success: false, error: 'Presupuesto no encontrado' });
    }

    // Actualizar el presupuesto
    const budget = budgetCheck[0];
    const newTotal = total !== undefined ? total : budget.total;
    const newTreatment = treatment || budget.treatment;
    const newIsActive = is_active !== undefined ? is_active : budget.is_active;

    await pool.query(
      'UPDATE treatment_budget SET treatment = ?, total = ?, is_active = ? WHERE id = ?',
      [newTreatment, newTotal, newIsActive, budgetId]
    );

    // Obtener los pagos para calcular pending
    const [payments] = await pool.query(
      'SELECT SUM(amount_paid) as total_paid FROM payments WHERE treatment_budget_id = ? AND (is_active IS NULL OR is_active = 1)',
      [budgetId]
    );

    const totalPaid = payments[0]?.total_paid || 0;
    const remaining = newTotal - totalPaid;

    res.json({
      success: true,
      data: {
        id: budgetId,
        patient_id: patientId,
        treatment: newTreatment,
        total: parseFloat(newTotal),
        pending: parseFloat(remaining),
        is_active: newIsActive,
        total_paid: parseFloat(totalPaid),
        remaining: parseFloat(remaining)
      }
    });
  } catch (error) {
    console.error('Error actualizando presupuesto:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

// Eliminar un presupuesto
const deleteTreatmentBudget = async (req, res) => {
  try {
    const { patientId, budgetId } = req.params;
    const userId = req.user.id;

    // Verificar que el paciente pertenece al usuario autenticado
    const [patientCheck] = await pool.query(
      'SELECT id FROM patient WHERE id = ? AND user_id = ?',
      [patientId, userId]
    );

    if (patientCheck.length === 0) {
      return res.status(404).json({ success: false, error: 'Paciente no encontrado' });
    }

    // Verificar que el presupuesto existe
    const [budgetCheck] = await pool.query(
      'SELECT id FROM treatment_budget WHERE id = ? AND patient_id = ?',
      [budgetId, patientId]
    );

    if (budgetCheck.length === 0) {
      return res.status(404).json({ success: false, error: 'Presupuesto no encontrado' });
    }

    // Eliminar el presupuesto (y sus pagos asociados por cascada)
    await pool.query(
      'DELETE FROM treatment_budget WHERE id = ?',
      [budgetId]
    );

    res.json({
      success: true,
      message: 'Presupuesto eliminado correctamente'
    });
  } catch (error) {
    console.error('Error eliminando presupuesto:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

module.exports = {
  getTreatmentBudgets,
  getTreatmentBudget,
  createTreatmentBudget,
  updateTreatmentBudget,
  deleteTreatmentBudget
};
