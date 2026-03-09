-- ================================================
-- AI-Powered Freelancing Platform - Database Schema
-- MySQL 8.x
-- ================================================

CREATE DATABASE IF NOT EXISTS freelance_platform;
USE freelance_platform;

-- ------------------------------------------------
-- Users Table
-- ------------------------------------------------
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role ENUM('FREELANCER', 'EMPLOYER') NOT NULL,
    wallet_address VARCHAR(42),
    avatar_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_role (role),
    INDEX idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------
-- Freelancer Profiles
-- ------------------------------------------------
CREATE TABLE freelancer_profiles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    title VARCHAR(200),
    bio TEXT,
    skills JSON,
    portfolio_links JSON,
    hourly_rate DECIMAL(10, 2) DEFAULT 0.00,
    avg_rating DECIMAL(3, 2) DEFAULT 0.00,
    total_earnings DECIMAL(15, 2) DEFAULT 0.00,
    jobs_completed INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------
-- Jobs Table
-- ------------------------------------------------
CREATE TABLE jobs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    employer_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    skills_required JSON,
    budget DECIMAL(12, 2) NOT NULL,
    duration_days INT,
    status ENUM('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') DEFAULT 'OPEN',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employer_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_jobs_status (status),
    INDEX idx_jobs_employer (employer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------
-- Bids Table
-- ------------------------------------------------
CREATE TABLE bids (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    job_id BIGINT NOT NULL,
    freelancer_id BIGINT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    proposal TEXT,
    delivery_days INT,
    status ENUM('PENDING', 'ACCEPTED', 'REJECTED') DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (freelancer_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uq_bid_job_freelancer (job_id, freelancer_id),
    INDEX idx_bids_job (job_id),
    INDEX idx_bids_freelancer (freelancer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------
-- Contracts (Escrow-linked)
-- ------------------------------------------------
CREATE TABLE contracts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    job_id BIGINT NOT NULL,
    freelancer_id BIGINT NOT NULL,
    employer_id BIGINT NOT NULL,
    contract_address VARCHAR(42),
    amount DECIMAL(15, 2) NOT NULL,
    status ENUM('CREATED', 'FUNDED', 'WORK_SUBMITTED', 'APPROVED', 'COMPLETED', 'REFUNDED', 'DISPUTED') DEFAULT 'CREATED',
    funded_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (freelancer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (employer_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_contracts_job (job_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------
-- Reviews Table
-- ------------------------------------------------
CREATE TABLE reviews (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    contract_id BIGINT NOT NULL,
    reviewer_id BIGINT NOT NULL,
    reviewee_id BIGINT NOT NULL,
    rating TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewee_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uq_review_contract_reviewer (contract_id, reviewer_id),
    INDEX idx_reviews_reviewee (reviewee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------
-- Payments Table
-- ------------------------------------------------
CREATE TABLE payments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    contract_id BIGINT NOT NULL,
    tx_hash VARCHAR(66),
    amount DECIMAL(15, 2) NOT NULL,
    payment_type ENUM('DEPOSIT', 'RELEASE', 'REFUND') NOT NULL,
    status ENUM('PENDING', 'CONFIRMED', 'FAILED') DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
    INDEX idx_payments_contract (contract_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ================================================
-- Sample Data
-- ================================================

-- Passwords are bcrypt hash of 'password123'
INSERT INTO users (email, password_hash, full_name, role, wallet_address) VALUES
('alice@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Alice Johnson', 'FREELANCER', '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38'),
('bob@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Bob Smith', 'EMPLOYER', '0x53d284357ec70ce289d6d64134dfac8e511c8a3d'),
('carol@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Carol Williams', 'FREELANCER', '0xab5801a7d398351b8be11c439e05c5b3259aec9b'),
('dave@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Dave Brown', 'EMPLOYER', '0x2b6ed29a95753c3ad948348e3e7b1a251080ffb9');

INSERT INTO freelancer_profiles (user_id, title, bio, skills, hourly_rate, avg_rating, jobs_completed) VALUES
(1, 'Full-Stack Developer', 'Experienced developer specializing in React, Node.js, and blockchain development.', '["React", "Node.js", "Solidity", "Python", "TypeScript"]', 85.00, 4.80, 47),
(3, 'AI/ML Engineer', 'Machine learning specialist with deep expertise in NLP and computer vision.', '["Python", "TensorFlow", "PyTorch", "NLP", "Computer Vision"]', 95.00, 4.90, 32);

INSERT INTO jobs (employer_id, title, description, skills_required, budget, duration_days, status) VALUES
(2, 'Build DeFi Dashboard', 'Create a modern DeFi analytics dashboard with real-time data visualization.', '["React", "Web3.js", "TypeScript", "Chart.js"]', 5000.00, 30, 'OPEN'),
(2, 'Smart Contract Audit', 'Audit our ERC-20 token smart contract for security vulnerabilities.', '["Solidity", "Security", "Ethereum"]', 3000.00, 14, 'OPEN'),
(4, 'ML Pipeline Development', 'Build an end-to-end machine learning pipeline for text classification.', '["Python", "TensorFlow", "NLP", "Docker"]', 8000.00, 45, 'OPEN'),
(4, 'React Native Mobile App', 'Develop a cross-platform mobile app for our marketplace.', '["React Native", "TypeScript", "Firebase"]', 12000.00, 60, 'IN_PROGRESS');
