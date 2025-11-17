-- DropSpot Database Schema
-- SQLite Database

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Drops table
CREATE TABLE IF NOT EXISTS drops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    stock INTEGER NOT NULL CHECK(stock >= 0),
    claim_window_start DATETIME NOT NULL,
    claim_window_end DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CHECK(claim_window_end > claim_window_start)
);

-- Waitlist table
CREATE TABLE IF NOT EXISTS waitlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    drop_id INTEGER NOT NULL,
    priority_score INTEGER NOT NULL,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (drop_id) REFERENCES drops(id) ON DELETE CASCADE,
    UNIQUE(user_id, drop_id)
);

-- Claims table
CREATE TABLE IF NOT EXISTS claims (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    drop_id INTEGER NOT NULL,
    claim_code TEXT UNIQUE NOT NULL,
    claimed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (drop_id) REFERENCES drops(id) ON DELETE CASCADE,
    UNIQUE(user_id, drop_id)
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_waitlist_drop_priority ON waitlist(drop_id, priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_waitlist_user ON waitlist(user_id);
CREATE INDEX IF NOT EXISTS idx_claims_drop ON claims(drop_id);
CREATE INDEX IF NOT EXISTS idx_claims_user ON claims(user_id);
CREATE INDEX IF NOT EXISTS idx_drops_claim_window ON drops(claim_window_start, claim_window_end);
