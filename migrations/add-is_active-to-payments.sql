-- Añadir columna is_active a la tabla payments para soportar borrado suave
ALTER TABLE payments ADD COLUMN is_active TINYINT(1) DEFAULT 1 AFTER payment_method;