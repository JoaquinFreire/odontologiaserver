const pool = require('../config/database');

// Obtener todos los pagos de un presupuesto
const getPayments = async (req, res) => {
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
      'SELECT * FROM treatment_budget WHERE id = ? AND patient_id = ?',
      [budgetId, patientId]
    );

    if (budgetCheck.length === 0) {
      return res.status(404).json({ success: false, error: 'Presupuesto no encontrado' });
    }

    // Obtener todos los pagos (solo activos)
    let payments;
    try {
      [payments] = await pool.query(
        'SELECT * FROM payments WHERE treatment_budget_id = ? AND (is_active IS NULL OR is_active = 1) ORDER BY payment_date DESC',
        [budgetId]
      );
    } catch (error) {
      if (error.code === 'ER_BAD_FIELD_ERROR') {
        [payments] = await pool.query(
          'SELECT * FROM payments WHERE treatment_budget_id = ? ORDER BY payment_date DESC',
          [budgetId]
        );
      } else {
        throw error;
      }
    }

    res.json({
      success: true,
      data: payments
    });
  } catch (error) {
    console.error('Error obteniendo pagos:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

// Obtener un pago específico
const getPayment = async (req, res) => {
  try {
    const { patientId, budgetId, paymentId } = req.params;
    const userId = req.user.id;

    // Verificar que el paciente pertenece al usuario autenticado
    const [patientCheck] = await pool.query(
      'SELECT id FROM patient WHERE id = ? AND user_id = ?',
      [patientId, userId]
    );

    if (patientCheck.length === 0) {
      return res.status(404).json({ success: false, error: 'Paciente no encontrado' });
    }

    // Obtener el pago
    const [payments] = await pool.query(
      'SELECT p.* FROM payments p JOIN treatment_budget tb ON p.treatment_budget_id = tb.id WHERE p.id = ? AND p.treatment_budget_id = ? AND tb.patient_id = ?',
      [paymentId, budgetId, patientId]
    );

    if (payments.length === 0) {
      return res.status(404).json({ success: false, error: 'Pago no encontrado' });
    }

    res.json({
      success: true,
      data: payments[0]
    });
  } catch (error) {
    console.error('Error obteniendo pago:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

// Crear un nuevo pago
const createPayment = async (req, res) => {
  try {
    const { patientId, budgetId } = req.params;
    const { amount_paid, payment_method, payment_date } = req.body;
    const userId = req.user.id;

    // Validar entrada
    if (amount_paid === undefined || amount_paid === null || !payment_method || !payment_date) {
      return res.status(400).json({
        success: false,
        error: 'El monto, método de pago y fecha son requeridos'
      });
    }

    // Parsear y validar monto numérico
    const amountNum = parseFloat(amount_paid);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'El monto debe ser un número mayor que 0' });
    }

    // Verificar que el paciente pertenece al usuario autenticado
    const [patientCheck] = await pool.query(
      'SELECT id FROM patient WHERE id = ? AND user_id = ?',
      [patientId, userId]
    );

    if (patientCheck.length === 0) {
      return res.status(404).json({ success: false, error: 'Paciente no encontrado' });
    }

    // Verificar que el presupuesto existe y obtener su información
    const [budgetCheck] = await pool.query(
      'SELECT * FROM treatment_budget WHERE id = ? AND patient_id = ?',
      [budgetId, patientId]
    );

    if (budgetCheck.length === 0) {
      return res.status(404).json({ success: false, error: 'Presupuesto no encontrado' });
    }

    const budget = budgetCheck[0];

    // Obtener el total pagado hasta ahora
    let paidCheck;
    try {
      [paidCheck] = await pool.query(
        'SELECT SUM(amount_paid) as total_paid FROM payments WHERE treatment_budget_id = ? AND (is_active IS NULL OR is_active = 1)',
        [budgetId]
      );
    } catch (error) {
      if (error.code === 'ER_BAD_FIELD_ERROR') {
        [paidCheck] = await pool.query(
          'SELECT SUM(amount_paid) as total_paid FROM payments WHERE treatment_budget_id = ?',
          [budgetId]
        );
      } else {
        throw error;
      }
    }

    // Asegurar que sumas y comparaciones sean numéricas para evitar problemas de tipo/precisión
    const totalPaidBefore = parseFloat(paidCheck[0]?.total_paid) || 0;
    const budgetTotal = parseFloat(budget.total) || 0;
    const totalPaidAfter = totalPaidBefore + amountNum;

    // Comparar usando números con precisión razonable (2 decimales)
    if (Number((totalPaidAfter).toFixed(2)) > Number(budgetTotal.toFixed(2))) {
      return res.status(400).json({
        success: false,
        error: `El monto total no puede exceder el presupuesto. Debe: ${budgetTotal.toFixed(2)}, Total a pagar con este pago: ${totalPaidAfter.toFixed(4)}`
      });
    }

    // Crear el pago
    const [result] = await pool.query(
      'INSERT INTO payments (treatment_budget_id, payment_date, amount_paid, payment_method) VALUES (?, ?, ?, ?)',
      [budgetId, payment_date, amountNum, payment_method]
    );

    // Actualizar el pending del presupuesto y marcar inactivo si queda en 0
    const newPending = budgetTotal - totalPaidAfter;
    const newIsActive = Number((newPending).toFixed(2)) <= 0 ? 0 : 1;
    try {
      await pool.query(
        'UPDATE treatment_budget SET pending = ?, is_active = ? WHERE id = ?',
        [newPending, newIsActive, budgetId]
      );
    } catch (error) {
      // Si falla por is_active, intentar solo con pending
      if (error.code === 'ER_BAD_FIELD_ERROR') {
        await pool.query(
          'UPDATE treatment_budget SET pending = ? WHERE id = ?',
          [newPending, budgetId]
        );
      } else {
        throw error;
      }
    }

    res.json({
      success: true,
      data: {
        id: result.insertId,
        treatment_budget_id: budgetId,
        payment_date,
        amount_paid: parseFloat(amountNum),
        payment_method
      }
    });
  } catch (error) {
    console.error('Error creando pago:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

// Actualizar un pago
const updatePayment = async (req, res) => {
  try {
    const { patientId, budgetId, paymentId } = req.params;
    const { amount_paid, payment_method, payment_date } = req.body;
    const userId = req.user.id;

    // Verificar que el paciente pertenece al usuario autenticado
    const [patientCheck] = await pool.query(
      'SELECT id FROM patient WHERE id = ? AND user_id = ?',
      [patientId, userId]
    );

    if (patientCheck.length === 0) {
      return res.status(404).json({ success: false, error: 'Paciente no encontrado' });
    }

    // Obtener el pago actual
    const [paymentCheck] = await pool.query(
      'SELECT p.* FROM payments p JOIN treatment_budget tb ON p.treatment_budget_id = tb.id WHERE p.id = ? AND p.treatment_budget_id = ? AND tb.patient_id = ?',
      [paymentId, budgetId, patientId]
    );

    if (paymentCheck.length === 0) {
      return res.status(404).json({ success: false, error: 'Pago no encontrado' });
    }

    const oldPayment = paymentCheck[0];
    const newAmountRaw = amount_paid !== undefined && amount_paid !== null ? amount_paid : oldPayment.amount_paid;
    const newAmount = parseFloat(newAmountRaw);

    // Obtener el presupuesto
    const [budgetData] = await pool.query(
      'SELECT * FROM treatment_budget WHERE id = ?',
      [budgetId]
    );

    const budget = budgetData[0];

    // Calcular el total pagado sin este pago
    const [totalPaidCheck] = await pool.query(
      'SELECT SUM(amount_paid) as total_paid FROM payments WHERE treatment_budget_id = ? AND id != ?',
      [budgetId, paymentId]
    );

    const totalPaidWithoutThis = parseFloat(totalPaidCheck[0]?.total_paid) || 0;
    const budgetTotal2 = parseFloat(budget.total) || 0;
    const totalPaidAfter = totalPaidWithoutThis + newAmount;

    if (!Number.isFinite(newAmount) || newAmount <= 0) {
      return res.status(400).json({ success: false, error: 'El monto debe ser un número mayor que 0' });
    }

    // Validar que no se pague más de lo debido (comparación numérica)
    if (Number((totalPaidAfter).toFixed(2)) > Number(budgetTotal2.toFixed(2))) {
      return res.status(400).json({
        success: false,
        error: `El monto total no puede exceder el presupuesto. Debe: ${budgetTotal2.toFixed(2)}, Total a pagar: ${totalPaidAfter.toFixed(4)}`
      });
    }

    // Actualizar el pago
    await pool.query(
      'UPDATE payments SET amount_paid = ?, payment_method = ?, payment_date = ? WHERE id = ?',
      [newAmount, payment_method || oldPayment.payment_method, payment_date || oldPayment.payment_date, paymentId]
    );

    // Actualizar el pending del presupuesto y marcar inactivo si queda en 0
    const newPending = budgetTotal2 - totalPaidAfter;
    const newIsActive = Number((newPending).toFixed(2)) <= 0 ? 0 : 1;
    try {
      await pool.query(
        'UPDATE treatment_budget SET pending = ?, is_active = ? WHERE id = ?',
        [newPending, newIsActive, budgetId]
      );
    } catch (error) {
      // Si falla por is_active, intentar solo con pending
      if (error.code === 'ER_BAD_FIELD_ERROR') {
        await pool.query(
          'UPDATE treatment_budget SET pending = ? WHERE id = ?',
          [newPending, budgetId]
        );
      } else {
        throw error;
      }
    }

    res.json({
      success: true,
      data: {
        id: paymentId,
        treatment_budget_id: budgetId,
        payment_date: payment_date || oldPayment.payment_date,
        amount_paid: parseFloat(newAmount),
        payment_method: payment_method || oldPayment.payment_method
      }
    });
  } catch (error) {
    console.error('Error actualizando pago:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

// Eliminar un pago
const deletePayment = async (req, res) => {
  try {
    const { patientId, budgetId, paymentId } = req.params;
    const userId = req.user.id;

    // Verificar que el paciente pertenece al usuario autenticado
    const [patientCheck] = await pool.query(
      'SELECT id FROM patient WHERE id = ? AND user_id = ?',
      [patientId, userId]
    );

    if (patientCheck.length === 0) {
      return res.status(404).json({ success: false, error: 'Paciente no encontrado' });
    }

    // Obtener el pago
    const [paymentCheck] = await pool.query(
      'SELECT p.* FROM payments p JOIN treatment_budget tb ON p.treatment_budget_id = tb.id WHERE p.id = ? AND p.treatment_budget_id = ? AND tb.patient_id = ?',
      [paymentId, budgetId, patientId]
    );

    if (paymentCheck.length === 0) {
      return res.status(404).json({ success: false, error: 'Pago no encontrado' });
    }

    const payment = paymentCheck[0];

    // Obtener el presupuesto
    const [budgetData] = await pool.query(
      'SELECT * FROM treatment_budget WHERE id = ?',
      [budgetId]
    );

    const budget = budgetData[0];

    // Marcar pago como inactivo (borrado suave)
    try {
      await pool.query(
        'UPDATE payments SET is_active = 0 WHERE id = ?',
        [paymentId]
      );
    } catch (error) {
      // Si la columna no existe, simplemente continuar (la migración no se ejecutó)
      if (error.code !== 'ER_BAD_FIELD_ERROR') {
        throw error;
      }
    }

    // Recalcular el pending del presupuesto (sumamos solo pagos activos)
    let totalPaidCheck;
    try {
      [totalPaidCheck] = await pool.query(
        'SELECT SUM(amount_paid) as total_paid FROM payments WHERE treatment_budget_id = ? AND (is_active IS NULL OR is_active = 1)',
        [budgetId]
      );
    } catch (error) {
      if (error.code === 'ER_BAD_FIELD_ERROR') {
        [totalPaidCheck] = await pool.query(
          'SELECT SUM(amount_paid) as total_paid FROM payments WHERE treatment_budget_id = ?',
          [budgetId]
        );
      } else {
        throw error;
      }
    }

    const totalPaidAfter = parseFloat(totalPaidCheck[0]?.total_paid) || 0;
    const budgetTotal = parseFloat(budget.total) || 0;
    const newPending = budgetTotal - totalPaidAfter;

    // Actualizar pending y, si queda 0, marcar presupuesto como inactivo
    const newIsActive = Number((newPending).toFixed(2)) <= 0 ? 0 : 1;
    try {
      await pool.query(
        'UPDATE treatment_budget SET pending = ?, is_active = ? WHERE id = ?',
        [newPending, newIsActive, budgetId]
      );
    } catch (error) {
      // Si falla por is_active, intentar solo con pending
      if (error.code === 'ER_BAD_FIELD_ERROR') {
        await pool.query(
          'UPDATE treatment_budget SET pending = ? WHERE id = ?',
          [newPending, budgetId]
        );
      } else {
        throw error;
      }
    }

    res.json({
      success: true,
      message: 'Pago eliminado correctamente'
    });
  } catch (error) {
    console.error('Error eliminando pago:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

module.exports = {
  getPayments,
  getPayment,
  createPayment,
  updatePayment,
  deletePayment
};
