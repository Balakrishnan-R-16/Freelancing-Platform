-- ================================================
-- Migration V2: Remove Blockchain and Web3 Fields
-- ================================================

-- 1. Safely remove wallet_address from users
SET @col_exists_wa = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'freelance_platform' 
    AND TABLE_NAME = 'users' 
    AND COLUMN_NAME = 'wallet_address');

SET @query_wa = IF(@col_exists_wa > 0, 
    'ALTER TABLE users DROP COLUMN wallet_address', 
    'SELECT "Column wallet_address does not exist."');

PREPARE stmt_wa FROM @query_wa;
EXECUTE stmt_wa;
DEALLOCATE PREPARE stmt_wa;


-- 2. Safely remove contract_address from contracts
SET @col_exists_ca = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'freelance_platform' 
    AND TABLE_NAME = 'contracts' 
    AND COLUMN_NAME = 'contract_address');

SET @query_ca = IF(@col_exists_ca > 0, 
    'ALTER TABLE contracts DROP COLUMN contract_address', 
    'SELECT "Column contract_address does not exist."');

PREPARE stmt_ca FROM @query_ca;
EXECUTE stmt_ca;
DEALLOCATE PREPARE stmt_ca;


-- 3. Safely remove tx_hash from payments
SET @col_exists_tx = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'freelance_platform' 
    AND TABLE_NAME = 'payments' 
    AND COLUMN_NAME = 'tx_hash');

SET @query_tx = IF(@col_exists_tx > 0, 
    'ALTER TABLE payments DROP COLUMN tx_hash', 
    'SELECT "Column tx_hash does not exist."');

PREPARE stmt_tx FROM @query_tx;
EXECUTE stmt_tx;
DEALLOCATE PREPARE stmt_tx;
