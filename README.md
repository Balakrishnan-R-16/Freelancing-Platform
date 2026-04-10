# Zyntra - AI-Powered Freelancing Platform

A production-ready full-stack web application combining **React**, **Spring Boot**, and **Python AI** for a modern real-time freelancing marketplace.

---

## 🏗 Architecture

```
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│   React Frontend │──▶│  Spring Boot API  │──▶│   MySQL Database │
│   (Vite + React) │   │  (REST + JWT)     │   │   (Tables)       │
└───────┬──────────┘   └───────┬──────────┘   └──────────────────┘
        │                      │
        │                      ▼
        │              ┌──────────────────┐
        │              │ Python AI Service │
        │              │   (FastAPI + ML)  │
        │              └──────────────────┘
        ▼
┌──────────────────┐
│  Server-Sent     │
│  Events (SSE)    │
└──────────────────┘
```

## 📁 Project Structure

```
├── frontend/          # React (Vite) — Modern UI with sleek grey-scale design
├── backend/           # Spring Boot — REST APIs with JWT auth and Smart Escrow
├── ai-service/        # Python FastAPI — ML-powered recommendations
├── sql/               # MySQL schema + sample data
└── README.md
```

## ✨ Features

### Core Platform
- **User Authentication** — JWT-based login/register for Freelancers & Employers
- **Job Marketplace** — Post, search, filter, and bid on projects
- **Bidding System** — Freelancers submit proposals, employers accept/reject
- **Smart Escrow System** — Secure, backend-driven payment lifecycle management
- **Real-Time Dashboards** — Server-Sent Events (SSE) automatically sync job statuses without manual refreshes

### AI Modules
- **Job Recommendations** — TF-IDF cosine similarity + skill overlap scoring
- **Skill Gap Analysis** — NLP-based gap detection with fuzzy matching
- **Freelancer Matching** — Multi-factor compatibility (skills, rate, experience, content)
- **Analytics Dashboard** — Market demand, supply gaps, budget analysis

### UI
- 🎨 Sleek, premium grey-scale design aesthetic
- 📱 Fully responsive web application
- ⚡ Real-time status updates and smooth animations

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Java 17+
- Python 3.10+
- MySQL 8.0+

### 1. Database Setup
```bash
mysql -u root -p < sql/schema.sql
```

### 2. Backend (Spring Boot)
```bash
cd backend
./mvnw spring-boot:run
# API available at http://localhost:8080
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

### Dashboard & Analytics
| Method | Endpoint                      | Description          |
|--------|------------------------------|----------------------|
| GET    | /api/dashboard/stats      | Platform stats        |
| GET    | /api/dashboard/employer   | Employer stats        |
| GET    | /api/dashboard/freelancer | Freelancer stats      |

### AI Service
| Method | Endpoint     | Description                         |
|--------|-------------|--------------------------------------|
| POST   | /recommend   | Job recommendations (TF-IDF + skill)|
| POST   | /skill-gap   | Skill gap analysis (NLP)            |
| POST   | /match       | Freelancer matching (multi-factor)  |

---

## 🛠 Tech Stack

| Layer      | Technology                           |
|-----------|--------------------------------------|
| Frontend  | React 18, Vite, React Router            |
| Backend   | Spring Boot 3.2, Spring Security, JPA   |
| Database  | MySQL 8.0                            |
| AI        | Python, FastAPI, scikit-learn, TF-IDF    |

---

**Built with ❤️ using AI and Modern Web Technologies**
