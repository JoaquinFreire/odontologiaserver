-- Crear base de datos
CREATE DATABASE IF NOT EXISTS odontologia;
USE odontologia;

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  lastname VARCHAR(100) NOT NULL,
  tuition VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de pacientes
CREATE TABLE IF NOT EXISTS patients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  lastname VARCHAR(100) NOT NULL,
  dni VARCHAR(20),
  birthdate DATE,
  tel VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  occupation VARCHAR(100),
  affiliate_number VARCHAR(100),
  holder BOOLEAN DEFAULT FALSE,
  user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabla de anamnesis
CREATE TABLE IF NOT EXISTS anamnesis_answers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  alergico BOOLEAN DEFAULT FALSE,
  medico_cabecera VARCHAR(255),
  medico_tel VARCHAR(20),
  servicio_cabecera VARCHAR(255),
  alergias_descripcion TEXT,
  tratamiento_medico BOOLEAN DEFAULT FALSE,
  hospitalizado_ultimo_anio BOOLEAN DEFAULT FALSE,
  hospitalizacion_motivo TEXT,
  problemas_cicatrizacion BOOLEAN DEFAULT FALSE,
  grupo_sanguineo VARCHAR(10),
  rh VARCHAR(5),
  embarazada BOOLEAN DEFAULT FALSE,
  tiempo_gestacional VARCHAR(50),
  obstetra VARCHAR(255),
  obstetra_tel VARCHAR(20),
  medicamento BOOLEAN DEFAULT FALSE,
  medicamento_detalles TEXT,
  antecedentes JSON,
  observaciones TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Tabla de consentimiento
CREATE TABLE IF NOT EXISTS consent (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  text TEXT NOT NULL,
  datetime DATETIME NOT NULL,
  accepted BOOLEAN DEFAULT FALSE,
  doctorName VARCHAR(255) DEFAULT '',
  doctorMatricula VARCHAR(100) DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Tabla de odontograma
CREATE TABLE IF NOT EXISTS odontograma (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  formato JSON,
  formato_nino JSON,
  observaciones TEXT,
  elementos_dentarios TEXT,
  version INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Tabla de tratamientos
CREATE TABLE IF NOT EXISTS treatments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  date DATE,
  code VARCHAR(50),
  tooth_elements VARCHAR(255),
  faces VARCHAR(255),
  observations TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Tabla de turnos/citas
CREATE TABLE IF NOT EXISTS shifts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  datetime DATETIME NOT NULL,
  dni VARCHAR(20),
  type VARCHAR(100),
  status BOOLEAN DEFAULT FALSE,
  user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Insertar usuario de prueba (contraseña: password123)
INSERT INTO users (email, password, name, lastname, tuition) VALUES
('test@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Juan', 'Pérez', 'MP12345')
ON DUPLICATE KEY UPDATE email=email;