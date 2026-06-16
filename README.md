# FraudGuard — AI-Powered Fraud Detection Platform

A production-grade credit card fraud detection platform featuring real-time ML inference, analyst review workflows, audit logging, and compliance reporting.

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │────▶│   NestJS API │────▶│  PostgreSQL  │
│  React + TS  │     │   (Port 3000)│     │  (Port 5432) │
│  (Port 5173) │     └──────┬───────┘     └──────────────┘
└──────────────┘            │
                            ▼
                   ┌──────────────┐
                   │  FastAPI ML  │
                   │  (Port 8000) │
                   └──────────────┘
```

## Tech Stack

| Layer        | Technology                          |
|-------------|-------------------------------------|
| Frontend    | React 18 + TypeScript + Vite        |
| Styling     | Tailwind CSS + CSS Custom Properties|
| Backend API | NestJS + TypeORM + Swagger          |
| ML Service  | FastAPI + XGBoost + SMOTE           |
| Database    | PostgreSQL 15                       |
| Auth        | JWT + bcrypt + role-based access     |
| Deployment  | Docker Compose                      |

## Features

### Core Fraud Detection
- **Real-time ML scoring** — XGBoost model trained on 284,807 credit card transactions
- **Multi-model comparison** — XGBoost, Random Forest, Logistic Regression evaluated
- **SMOTE oversampling** — handles the 0.17% fraud class imbalance
- **Configurable thresholds** — per-user fraud probability alert levels

### Operations Platform
- **Analyst Review Queue** — flagged transactions ranked by probability
- **Case Notes** — per-transaction comment threads for shift handoffs
- **Audit Trail** — PSD2/GDPR-compliant activity logging
- **SLA Monitoring** — tracks time from scoring to analyst decision
- **CSV Export** — bulk transaction data export for regulators

### Production ML Monitoring
- **Initial vs Production metrics** — compare test-set accuracy with real verdicts
- **Daily fraud rate tracking** — detect model drift over time
- **Model comparison dashboard** — all evaluated models with metrics

### Compliance & Reporting
- **Fraud Summary Reports** — printable summaries for management
- **Transaction Audit Export** — complete data with predictions and reviews
- **Role-based access control** — Admin, Analyst, Manager roles
- **Account approval workflow** — new accounts require admin activation

## Database Schema (7 tables, 3NF)

```
users                    → auth, roles, account status
  ↓ 1:N
transactions             → raw transactions + features
  ↓ 1:1
predictions              → ML scoring results
  ↓ 1:1
reviews                  → analyst decisions

users → 1:N → transaction_comments   (case notes)
users → 1:1 → alert_settings         (per-user thresholds)
users → 1:N → audit_logs             (activity trail)
```

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Python 3.10+

### 1. Clone & Install

```bash
git clone https://github.com/AliFarajollah/fraudguard.git
cd fraudguard
```

### 2. Backend API

```bash
cd api
cp .env.example .env
# Edit .env with your PostgreSQL credentials
npm install
npm run start:dev
```

The API runs on `http://localhost:3000` with Swagger docs at `/api-docs`.

### 3. ML Service

```bash
cd ml-service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The ML API runs on `http://localhost:8000` with docs at `/docs`.

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:5173`.

### 5. Streamlit Dashboard (optional)

```bash
cd ml-service
streamlit run streamlit_app.py
```

## Docker Compose (Alternative)

```bash
docker-compose up --build
```

Services:
- **frontend** → `http://localhost:5173`
- **api** → `http://localhost:3000`
- **ml-service** → `http://localhost:8000`
- **postgres** → `localhost:5432`

## API Endpoints (35+)

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Get JWT token |
| GET | `/auth/me` | Current user profile |

### Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/transactions` | Score a transaction |
| POST | `/transactions/bulk` | Bulk score |
| GET | `/transactions` | List (paginated, filterable) |
| GET | `/transactions/stats` | Aggregate counts |
| GET | `/transactions/export` | CSV download |
| GET | `/transactions/:id` | Transaction detail |

### Predictions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/predictions` | All predictions |
| GET | `/predictions/flagged` | Unreviewed fraud |
| GET | `/predictions/performance` | Production metrics |
| GET | `/predictions/trends` | Daily trend data |
| GET | `/predictions/risk-distribution` | Risk histogram |
| GET | `/predictions/stats` | Aggregate stats |

### Reviews
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/reviews` | Submit review decision |
| GET | `/reviews` | All reviews |
| GET | `/reviews/sla` | Time-to-review stats |
| GET | `/reviews/stats` | Decision counts |

### Comments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/transactions/:id/comments` | Add case note |
| GET | `/transactions/:id/comments` | Get case notes |
| DELETE | `/comments/:id` | Delete comment |

### Audit
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/audit` | Activity feed (admin) |
| GET | `/audit/my` | Own activity |
| GET | `/audit/entity/:type/:id` | Entity history |

### Alert Settings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/alert-settings/me` | Get own settings |
| PUT | `/alert-settings/me` | Update settings |
| GET | `/alert-settings/global` | Platform defaults (admin) |
| PUT | `/alert-settings/global` | Update defaults (admin) |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users/me` | Own profile |
| PATCH | `/users/me` | Change password |
| GET | `/users/me/activity` | Own audit log |
| GET | `/users` | All users (admin) |
| PATCH | `/users/:id/role` | Update role (admin) |
| PATCH | `/users/:id/status` | Approve/reject (admin) |

## Frontend Pages (14)

| Page | Route | Access |
|------|-------|--------|
| Login | `/login` | Public |
| Register | `/register` | Public |
| Pending Approval | `/pending-approval` | Public |
| Dashboard | `/dashboard` | All users |
| Transactions | `/transactions` | All users |
| Transaction Detail | `/transactions/:id` | All users |
| Score Transaction | `/score` | Analyst, Admin |
| Review Queue | `/reviews` | All users |
| Analytics | `/analytics` | All users |
| Profile | `/profile` | All users |
| Reports | `/reports` | All users |
| Model Monitor | `/model/performance` | All users |
| Admin Users | `/admin/users` | Admin only |
| Audit Log | `/audit` | Admin only |

## ML Model Details

- **Dataset**: European Credit Card Transactions (Kaggle, 284,807 records)
- **Class Imbalance**: 0.17% fraud — handled via SMOTE oversampling
- **Selected Model**: XGBoost (best PR-AUC on imbalanced data)
- **Comparison**: XGBoost vs Random Forest vs Logistic Regression
- **Inference**: FastAPI REST endpoint, ~5ms per prediction

## License

This project was developed as a licență (bachelor's thesis) project at CSIE.

---

Built with ❤️ by Ali Farajollah
