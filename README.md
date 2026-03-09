# AI-Powered Freelancing Platform with Blockchain Smart Contracts

A production-ready full-stack web application combining **React**, **Spring Boot**, **Python AI**, and **Ethereum Smart Contracts** for a decentralized freelancing marketplace.

---

## 🏗 Architecture

```
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│   React Frontend │──▶│  Spring Boot API  │──▶│   MySQL Database │
│   (Vite + React) │   │  (REST + JWT)     │   │   (8 tables)     │
└───────┬──────────┘   └───────┬──────────┘   └──────────────────┘
        │                      │
        │                      ▼
        │              ┌──────────────────┐
        │              │ Python AI Service │
        │              │   (FastAPI + ML)  │
        │              └──────────────────┘
        ▼
┌──────────────────┐
│ Ethereum Network │
│ (Escrow Contract)│
└──────────────────┘
```

## 📁 Project Structure

```
├── frontend/          # React (Vite) — Modern UI with dark/light mode
├── backend/           # Spring Boot — REST APIs with JWT auth
├── ai-service/        # Python FastAPI — ML-powered recommendations
├── blockchain/        # Solidity — Escrow smart contracts + tests
├── sql/               # MySQL schema + sample data
├── docker-compose.yml # Multi-container orchestration
└── README.md
```

## ✨ Features

### Core Platform
- **User Authentication** — JWT-based login/register for Freelancers & Employers
- **Job Marketplace** — Post, search, filter, and bid on projects
- **Bidding System** — Freelancers submit proposals, employers accept/reject
- **Ratings & Reviews** — Post-contract reviews with auto-computed averages
- **Portfolio Profiles** — Skills, bio, hourly rate, portfolio links

### AI Modules
- **Job Recommendations** — TF-IDF cosine similarity + skill overlap scoring
- **Skill Gap Analysis** — NLP-based gap detection with fuzzy matching
- **Freelancer Matching** — Multi-factor compatibility (skills, rate, experience, content)
- **Analytics Dashboard** — Market demand, supply gaps, budget analysis

### Blockchain
- **Escrow Smart Contract** — Solidity contract with state machine pattern
- **Flow**: `deposit()` → `submitWork()` → `approveWork()` → `releasePayment()`
- **Safety**: `refund()` available before approval

### UI
- 🌙 Dark/light mode toggle
- 🎨 Glassmorphism, gradients, micro-animations
- 📱 Fully responsive design
- ⚡ Premium Inter font, smooth transitions

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Java 17+
- Python 3.10+
- MySQL 8.0+
- MetaMask (for blockchain features)

### 1. Database Setup
```bash
mysql -u root -p < sql/schema.sql
```

### 2. Backend (Spring Boot)
```bash
cd backend
./mvnw spring-boot:run
# API available at http://localhost:8080
# Swagger UI at http://localhost:8080/swagger-ui.html
```

### 3. AI Service (Python)
```bash
cd ai-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# Docs at http://localhost:8000/docs
```

### 4. Frontend (React)
```bash
cd frontend
npm install
npm run dev
# App at http://localhost:5173
```

### 5. Blockchain (Hardhat)
```bash
cd blockchain
npm install
npx hardhat test          # Run tests
npx hardhat node          # Start local node
npx hardhat run scripts/deploy.js --network localhost
```

### Docker (All-in-One)
```bash
docker-compose up --build
# Frontend: http://localhost:5173
# Backend:  http://localhost:8080
# AI:       http://localhost:8000
```

---

## 🔑 Demo Credentials

| Email              | Password      | Role       |
|-------------------|---------------|------------|
| alice@example.com | password123   | Freelancer |
| bob@example.com   | password123   | Employer   |
| carol@example.com | password123   | Freelancer |
| dave@example.com  | password123   | Employer   |

---

## 📡 API Endpoints

### Auth
| Method | Endpoint           | Description       |
|--------|-------------------|--------------------|
| POST   | /api/auth/register | Register new user  |
| POST   | /api/auth/login    | Login + get JWT    |

### Jobs
| Method | Endpoint                      | Description          |
|--------|------------------------------|----------------------|
| GET    | /api/jobs                     | List open jobs       |
| GET    | /api/jobs/{id}                | Get job by ID        |
| POST   | /api/jobs                     | Create job (Employer)|
| DELETE | /api/jobs/{id}                | Delete job           |

### Bids
| Method | Endpoint                  | Description           |
|--------|--------------------------|------------------------|
| POST   | /api/bids                 | Place a bid           |
| PUT    | /api/bids/{id}/accept     | Accept bid (Employer) |
| PUT    | /api/bids/{id}/reject     | Reject bid (Employer) |

### Reviews
| Method | Endpoint                  | Description           |
|--------|--------------------------|------------------------|
| GET    | /api/reviews/user/{id}    | Get user reviews      |
| POST   | /api/reviews              | Create review         |

### Dashboard
| Method | Endpoint                  | Description           |
|--------|--------------------------|------------------------|
| GET    | /api/dashboard/stats      | Platform stats        |
| GET    | /api/dashboard/employer   | Employer stats        |
| GET    | /api/dashboard/freelancer | Freelancer stats      |

### AI Service
| Method | Endpoint     | Description                         |
|--------|-------------|--------------------------------------|
| POST   | /recommend   | Job recommendations (TF-IDF + skill)|
| POST   | /skill-gap   | Skill gap analysis (NLP)            |
| POST   | /match       | Freelancer matching (multi-factor)  |
| POST   | /analytics   | Platform analytics                  |

---

## 🧪 Testing

```bash
# Blockchain (Hardhat)
cd blockchain && npx hardhat test

# AI Service (Pytest)
cd ai-service && python -m pytest test_main.py -v

# Backend (Maven)
cd backend && ./mvnw test
```

---

## 📜 Smart Contract

The Escrow contract (`blockchain/contracts/Escrow.sol`) implements:
- **State Machine**: AWAITING_DEPOSIT → FUNDED → WORK_SUBMITTED → APPROVED → COMPLETED/REFUNDED
- **Role-based Access**: Only employer can deposit/approve/refund, only freelancer can submit
- **Event Logging**: All state transitions emit events for frontend tracking
- **Safety**: Refund possible before work approval

---

## 🛠 Tech Stack

| Layer      | Technology                           |
|-----------|--------------------------------------|
| Frontend  | React 18, Vite, React Router, ethers.js |
| Backend   | Spring Boot 3.2, Spring Security, JPA   |
| Database  | MySQL 8.0                            |
| AI        | Python, FastAPI, scikit-learn, TF-IDF    |
| Blockchain| Solidity 0.8.19, Hardhat, ethers.js      |
| DevOps    | Docker, Docker Compose, Nginx            |

---

**Built with ❤️ using AI, Blockchain, and Modern Web Technologies**
