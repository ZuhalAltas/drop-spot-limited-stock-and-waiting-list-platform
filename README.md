# DropSpot - Limited Stock & Waitlist Platform

Project Start Time: 2025.11.17 05.30

A full-stack platform for managing limited stock product drops with a fair waitlist and claim system. Users can join waitlists for exclusive drops and claim their spots during designated time windows.

---

## 📋 Project Overview

DropSpot enables fair distribution of limited stock items through:

- **Waitlist System:** Priority-based queue using unique seed algorithm
- **Claim Windows:** Time-limited claiming periods
- **Idempotent Operations:** Transaction-safe, duplicate-proof actions
- **Admin Management:** Full CRUD for drop management
- **Real-time Updates:** Live stock and waitlist status

---

## 🏗️ Architecture

### Technology Stack

**Backend:**

- Node.js + TypeScript
- Express.js
- SQLite (better-sqlite3)
- JWT Authentication
- Bcrypt password hashing

**Frontend:**

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Zustand (State Management)
- Axios (API Client)

**Testing:**

- Jest (Backend Unit & Integration)
- Supertest (API Integration)
- Comprehensive test coverage

---

## 📊 Data Model

### Tables

**Users**

```sql
id          INTEGER PRIMARY KEY
email       TEXT UNIQUE NOT NULL
password    TEXT NOT NULL
role        TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin'))
created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
```

**Drops**

```sql
id                   INTEGER PRIMARY KEY
title                TEXT NOT NULL
description          TEXT
stock                INTEGER NOT NULL CHECK(stock >= 0)
claim_window_start   DATETIME NOT NULL
claim_window_end     DATETIME NOT NULL
created_at           DATETIME DEFAULT CURRENT_TIMESTAMP
CHECK(claim_window_end > claim_window_start)
```

**Waitlist**

```sql
id              INTEGER PRIMARY KEY
user_id         INTEGER NOT NULL
drop_id         INTEGER NOT NULL
priority_score  INTEGER NOT NULL
joined_at       DATETIME DEFAULT CURRENT_TIMESTAMP
UNIQUE(user_id, drop_id)
FOREIGN KEY (user_id) REFERENCES users(id)
FOREIGN KEY (drop_id) REFERENCES drops(id)
```

**Claims**

```sql
id          INTEGER PRIMARY KEY
user_id     INTEGER NOT NULL
drop_id     INTEGER NOT NULL
claim_code  TEXT UNIQUE NOT NULL
claimed_at  DATETIME DEFAULT CURRENT_TIMESTAMP
UNIQUE(user_id, drop_id)
FOREIGN KEY (user_id) REFERENCES users(id)
FOREIGN KEY (drop_id) REFERENCES drops(id)
```

---

## 🔌 API Endpoints

### Authentication

- `POST /auth/signup` - User registration
- `POST /auth/login` - User login
- `GET /auth/me` - Get current user profile

### Drops (Public)

- `GET /drops` - List drops (filter: active, upcoming, all)
- `GET /drops/:id` - Get drop details
- `GET /drops/:id/waitlist` - View waitlist for drop
- `GET /drops/:id/claims` - View claims for drop

### Waitlist (Protected)

- `POST /drops/:id/join` - Join waitlist (idempotent)
- `POST /drops/:id/leave` - Leave waitlist (idempotent)

### Claim (Protected)

- `POST /drops/:id/claim` - Claim drop during window (idempotent)

### Admin (Protected - Admin Only)

- `GET /admin/drops` - List all drops with stats
- `POST /admin/drops` - Create new drop
- `PUT /admin/drops/:id` - Update drop
- `DELETE /admin/drops/:id` - Delete drop

---

## 🔒 Idempotency Strategy

All critical operations use idempotency to prevent duplicate actions:

**Join Waitlist:**

- Uses `UNIQUE(user_id, drop_id)` constraint
- Returns existing entry if already joined
- IMMEDIATE transaction for write lock

**Leave Waitlist:**

- Multiple leave requests return success
- Only first removes entry

**Claim Drop:**

- Returns existing claim if already claimed
- Transaction-safe stock checking
- Prevents overselling through locks

**Implementation:**

```typescript
const transaction = db.transaction(() => {
  // Check existing
  const existing = db.prepare('SELECT * FROM table WHERE...').get();
  if (existing) return existing;

  // Perform operation
  const result = db.prepare('INSERT INTO...').run();
  return result;
});

return transaction(); // Execute atomically
```

---

## 🌱 Seed Generation Method

**Purpose:** Generate unique, deterministic seed for priority score calculation.

**Generation Steps:**

1. Get git remote URL: `git config --get remote.origin.url`
2. Get first commit timestamp: `git log --reverse --format=%ct | head -n1`
3. Capture start time: `YYYYMMDDHHmm`
4. Combine: `${remote}|${epoch}|${start_time}`
5. SHA256 hash → first 12 characters = seed

**Coefficient Derivation:**

```typescript
A = 7 + (parseInt(seed.substring(0, 2), 16) % 5)
B = 13 + (parseInt(seed.substring(2, 4), 16) % 7)
C = 3 + (parseInt(seed.substring(4, 6), 16) % 3)
```

**Priority Score Formula:**

```typescript
priority_score = 1000 +
  (signup_latency_ms % A) +
  (account_age_days % B) -
  (rapid_actions % C)
```

This ensures:

- **Fairness:** No gaming the system
- **Uniqueness:** Each project has different coefficients
- **Reproducibility:** Same seed generates same scores

See `backend/src/utils/seed.ts` for implementation.

 Our Seed Information:
   Seed: 2474bee4e249
   Coefficients: A=8, B=17, C=4

---

## 🚀 Installation & Setup

### Prerequisites

- Node.js 18+
- npm or yarn

### Quick Start

**1. Clone Repository**

```bash
git clone <repository-url>
cd drop-spot-limited-stock-and-waiting-list-platform
```

**2. Backend Setup**

```bash
cd backend
npm install
cp .env.example .env
npm run migrate
npm run seed
npm run dev
```

Backend runs on: `http://localhost:3001`

**3. Frontend Setup**

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Frontend runs on: `http://localhost:3000`

### Environment Variables

**Backend (.env)**

```
PORT=3001
NODE_ENV=development
DATABASE_PATH=./database/dropspot.db
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3000
```

**Frontend (.env.local)**

```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## 🧪 Testing

### Backend Tests

```bash
cd backend

# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

**Test Suites:**

- `tests/auth.test.ts` - Authentication, signup, login
- `tests/drops.test.ts` - Drop listing, filtering
- `tests/waitlist.test.ts` - Waitlist operations, race conditions
- `tests/claim.test.ts` - Claim operations, stock depletion
- `tests/admin.test.ts` - Admin CRUD, authorization

**Coverage:** >70% (unit + integration)

### Test Highlights

- **Idempotency Tests:** Concurrent requests handled correctly
- **Race Condition Tests:** Stock never oversold
- **Transaction Tests:** Database consistency verified
- **Edge Cases:** Invalid inputs, expired windows, sold out scenarios

---

## 📸 Screenshots

### 1. Login Page

![](C:\Users\Bilgisayar\AppData\Roaming\marktext\images\2025-11-18-22-51-24-image.png)

### 2. Drops Listing

![](C:\Users\Bilgisayar\AppData\Roaming\marktext\images\2025-11-18-22-52-51-image.png)

### 3. Drop Detail & Claim

![](C:\Users\Bilgisayar\AppData\Roaming\marktext\images\2025-11-18-22-54-23-image.png)

![](C:\Users\Bilgisayar\AppData\Roaming\marktext\images\2025-11-18-22-57-37-image.png)

### 4. Claim Success

![](C:\Users\Bilgisayar\AppData\Roaming\marktext\images\2025-11-18-22-58-05-image.png)

### 5. Admin Panel

![](C:\Users\Bilgisayar\AppData\Roaming\marktext\images\2025-11-18-22-59-07-image.png)

---

## 🎨 Technical Decisions & Personal Contributions

### Key Architectural Choices

**1. Repository Pattern**

- Separates data access from business logic
- Makes testing easier with mock repositories
- Centralizes database queries

**2. Service Layer**

- Business logic isolated from HTTP layer
- Reusable across different controllers
- Easier to test complex workflows

**3. Transaction-Safe Operations**

- SQLite IMMEDIATE transactions prevent race conditions
- Row-level locking ensures stock consistency
- Idempotent operations prevent duplicate claims

**4. Seed-Based Priority Algorithm**

- Unique per project (git metadata)
- Prevents gaming the system
- Fair distribution based on account age and signup speed

**5. Modular Frontend with Zustand**

- Lightweight state management
- Persistent auth state
- Clean separation of concerns

### Personal Contributions

**Backend Optimizations:**

- Custom idempotency checks in all critical paths
- Database indexes for common queries
- Error handling with descriptive messages
- Comprehensive validation using Zod

**Frontend Features:**

- Real-time stock and status updates
- Responsive design (mobile-first)
- Loading states and error boundaries
- Clean gradient UI design

**Testing Strategy:**

- Isolated test database per suite
- Concurrent request testing
- Edge case coverage
- Idempotency verification

---

## 🔍 Code Quality

### Linting & Formatting

- ESLint configured for TypeScript
- Strict mode enabled
- Type safety enforced

### Commit Strategy

- Feature branches for each component
- Descriptive commit messages
- Progressive development (24 commits)
- No "big bang" commits

### Project Structure

```
drop-spot/
├── backend/
│   ├── src/
│   │   ├── controllers/      # HTTP request handlers
│   │   ├── models/           # Database repositories
│   │   ├── routes/           # Route definitions
│   │   ├── services/         # Business logic
│   │   ├── middleware/       # Auth, error handling
│   │   ├── utils/            # Helpers, validators
│   │   └── app.ts            # Express app
│   ├── tests/                # Test suites
│   ├── database/             # Migrations, seeds
│   └── package.json
├── frontend/
│   ├── app/                  # Next.js pages (App Router)
│   │   ├── auth/            # Login, signup
│   │   ├── drops/           # Drop list, detail
│   │   └── admin/           # Admin panel
│   ├── lib/
│   │   ├── store/           # Zustand stores
│   │   ├── api.ts           # Axios instance
│   │   └── types.ts         # TypeScript types
│   └── package.json
└── README.md
```

---

## 🚀 Deployment

### Backend

```bash
cd backend
npm run build
npm start
```

### Frontend

```bash
cd frontend
npm run build
npm start
```

### Production Considerations

- Use PostgreSQL instead of SQLite for production
- Configure proper CORS origins
- Set strong JWT_SECRET
- Enable HTTPS
- Add rate limiting
- Setup monitoring (e.g., Sentry)

---
