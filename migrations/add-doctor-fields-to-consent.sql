-- Agregar campos doctorName y doctorMatricula a la tabla consent
ALTER TABLE consent ADD COLUMN doctorName VARCHAR(255) DEFAULT '' AFTER accepted;
ALTER TABLE consent ADD COLUMN doctorMatricula VARCHAR(100) DEFAULT '' AFTER doctorName;
