# DropSpot - Limited Stock & Waitlist Platform

**Project Start Time:** 2025-01-17 14:30

---

## 📋 Project Overview

DropSpot is a platform for managing limited stock product drops with a fair waitlist and claim system. Users can join waitlists for exclusive drops and claim their spots during designated time windows.

---

## 🏗️ Architecture

### Technology Stack

**Backend:**
- Node.js + TypeScript
- Express.js
- SQLite (with better-sqlite3)
- JWT Authentication

**Frontend:**
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Zustand (State Management)

**Testing:**
- Jest (Backend Unit & Integration)
- React Testing Library (Frontend Component)
- Supertest (API Integration)

**DevOps:**
- GitHub Actions (CI/CD)
- Docker Compose

---

## 📊 Data Model

### Users
```sql
id          INTEGER PRIMARY KEY
email       TEXT UNIQUE NOT NULL
password    TEXT NOT NULL
role        TEXT DEFAULT 'user'
created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
```

### Drops
```sql
id                   INTEGER PRIMARY KEY
title                TEXT NOT NULL
description          TEXT
stock                INTEGER NOT NULL
claim_window_start   DATETIME NOT NULL
claim_window_end     DATETIME NOT NULL
created_at           DATETIME DEFAULT CURRENT_TIMESTAMP
```

### Waitlist
```sql
id              INTEGER PRIMARY KEY
user_id         INTEGER NOT NULL
drop_id         INTEGER NOT NULL
priority_score  INTEGER NOT NULL
joined_at       DATETIME DEFAULT CURRENT_TIMESTAMP
UNIQUE(user_id, drop_id)
```

### Claims
```sql
id          INTEGER PRIMARY KEY
user_id     INTEGER NOT NULL
drop_id     INTEGER NOT NULL
claim_code  TEXT UNIQUE NOT NULL
claimed_at  DATETIME DEFAULT CURRENT_TIMESTAMP
```

---

## 🔌 API Endpoints

### Authentication
- `POST /auth/signup` - User registration
- `POST /auth/login` - User login

### Drops (Public)
- `GET /drops` - List active drops
- `GET /drops/:id` - Get drop details
- `POST /drops/:id/join` - Join waitlist
- `POST /drops/:id/leave` - Leave waitlist
- `POST /drops/:id/claim` - Claim during window

### Admin
- `POST /admin/drops` - Create new drop
- `PUT /admin/drops/:id` - Update drop
- `DELETE /admin/drops/:id` - Delete drop

---

## 🔒 Idempotency Strategy

All critical operations (join/leave/claim) use:
- Database transactions with locks
- Unique constraints (user_id, drop_id)
- Idempotency checks to prevent duplicate operations
- Proper error handling with meaningful HTTP status codes

---

## 🌱 Seed Generation Method

**Purpose:** Generate unique priority scores for waitlist fairness.

**Generation Steps:**
1. Capture project start time: `YYYYMMDDHHmm`
2. Get git remote URL: `git config --get remote.origin.url`
3. Get first commit timestamp: `git log --reverse --format=%ct | head -n1`
4. Combine: `<remote>|<epoch>|<start_time>`
5. SHA256 hash → first 12 characters = seed

**Priority Score Formula:**
```
A = 7 + (int(seed[0:2], 16) % 5)
B = 13 + (int(seed[2:4], 16) % 7)
C = 3 + (int(seed[4:6], 16) % 3)

priority_score = base + (signup_latency_ms % A) + (account_age_days % B) - (rapid_actions % C)
```

See `/backend/src/utils/seed.ts` for implementation.

---

## 🚀 Installation

### Prerequisites
- Node.js 18+
- npm or yarn

### Backend Setup
```bash
cd backend
npm install
npm run migrate
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 🧪 Testing

### Backend
```bash
cd backend
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

### Frontend
```bash
cd frontend
npm test              # Run component tests
npm run test:e2e      # End-to-end tests
```

---

## 📸 Screenshots

(Screenshots will be added after UI implementation)

---

## 🎨 Technical Decisions & Personal Contributions

### Key Architectural Choices:
1. **Repository Pattern:** Separation of data access logic for maintainability
2. **Service Layer:** Business logic isolated from controllers
3. **Idempotent Transactions:** Using SQLite's IMMEDIATE transactions with row-level locking
4. **Priority Score Algorithm:** Custom seed-based scoring for fair waitlist ordering

### Personal Touches:
- (To be added during development)

---

## 🤖 AI Integration (Bonus)

AI-powered drop description generator in admin panel using OpenAI API.
- Analyzes drop title and suggests compelling descriptions
- Helps admins create engaging content quickly

---

## 📦 Project Structure

```
drop-spot/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── middleware/
│   │   ├── utils/
│   │   └── app.ts
│   ├── tests/
│   ├── database/
│   └── package.json
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── public/
│   └── package.json
└── README.md
```

---

## 👨‍💻 Development Workflow

This project follows a structured Git workflow:
- Feature branches for each major component
- Pull Requests with detailed descriptions
- Meaningful commit messages
- Progressive implementation (no big-bang commits)

---

## 📝 License

This project is created as a technical assessment for Alpaco.

---

**Alpaco Full Stack Developer Case**
Contact: hr@alpacotech.com
Website: www.alpacotech.com
