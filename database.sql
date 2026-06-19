CREATE TABLE IF NOT EXISTS admin_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario VARCHAR(80) UNIQUE NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS orcamentos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  wpp VARCHAR(20) NOT NULL,
  carro VARCHAR(120) NOT NULL,
  ano VARCHAR(10) NULL,
  problema TEXT NOT NULL,
  servico VARCHAR(120) NOT NULL,
  horario VARCHAR(80) NULL,
  midia VARCHAR(120) NULL,
  status ENUM('novo','respondido','aguardando cliente','fechado','perdido') DEFAULT 'novo',
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_orcamentos_status (status),
  INDEX idx_orcamentos_criado_em (criado_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS agendamentos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  tel VARCHAR(20) NOT NULL,
  carro VARCHAR(120) NOT NULL,
  problema VARCHAR(255) NULL,
  data_agendamento DATE NOT NULL,
  hora_agendamento TIME NOT NULL,
  obs TEXT NULL,
  status ENUM('novo','respondido','aguardando cliente','fechado','perdido') DEFAULT 'novo',
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_agendamentos_status (status),
  INDEX idx_agendamentos_data_agendamento (data_agendamento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS feedbacks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  cidade VARCHAR(120) NOT NULL,
  nota TINYINT NOT NULL,
  texto TEXT NOT NULL,
  status ENUM('pendente','aprovado','reprovado') DEFAULT 'pendente',
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_feedbacks_status (status),
  INDEX idx_feedbacks_criado_em (criado_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
