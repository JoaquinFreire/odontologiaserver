const fs = require('fs').promises;
const path = require('path');

const treatmentsPath = path.join(__dirname, '..', 'config', 'treatments.json');

const readTreatments = async () => {
  try {
    const raw = await fs.readFile(treatmentsPath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading treatments.json', err);
    return [];
  }
};

const writeTreatments = async (list) => {
  try {
    await fs.writeFile(treatmentsPath, JSON.stringify(list, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing treatments.json', err);
    throw err;
  }
};

exports.getTreatments = async (req, res) => {
  try {
    const list = await readTreatments();
    res.json({ treatments: list });
  } catch (err) { res.status(500).json({ error: 'No se pudieron leer los tratamientos' }); }
};

exports.addTreatment = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string') return res.status(400).json({ error: 'Nombre inválido' });
    const list = await readTreatments();
    if (!list.includes(name)) {
      list.push(name);
      await writeTreatments(list);
    }
    res.json({ treatments: list });
  } catch (err) { res.status(500).json({ error: 'No se pudo agregar tratamiento' }); }
};

exports.removeTreatment = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string') return res.status(400).json({ error: 'Nombre inválido' });
    const list = await readTreatments();
    const updated = list.filter(t => t !== name);
    await writeTreatments(updated);
    res.json({ treatments: updated });
  } catch (err) { res.status(500).json({ error: 'No se pudo eliminar tratamiento' }); }
};
