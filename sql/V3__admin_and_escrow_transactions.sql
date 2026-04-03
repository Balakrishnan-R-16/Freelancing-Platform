-- ================================================
-- V3: Add ADMIN role & escrow_transactions table
-- ================================================

USE freelance_platform;

-- 1. Expand the role ENUM to include ADMIN
ALTER TABLE users MODIFY COLUMN role ENUM('FREELANCER', 'EMPLOYER', 'ADMIN') NOT NULL;

-- 2. Add version column for optimistic locking (if not exists)
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'freelance_platform' AND TABLE_NAME = 'contracts' AND COLUMN_NAME = 'version');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE contracts ADD COLUMN version INT DEFAULT 0', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. Create escrow_transactions table
CREATE TABLE IF NOT EXISTS escrow_transactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    contract_id BIGINT NOT NULL,
    type ENUM('FUND', 'RELEASE', 'REFUND') NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    status ENUM('PENDING', 'SUCCESS', 'FAILED') NOT NULL,
    razorpay_order_id VARCHAR(255) UNIQUE,
    razorpay_payment_id VARCHAR(255),
    razorpay_signature VARCHAR(512),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (contract_id) REFERENCES contracts(id),
    INDEX idx_escrow_tx_status (status),
    INDEX idx_escrow_tx_contract (contract_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
