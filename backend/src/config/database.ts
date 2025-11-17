import Database from 'better-sqlite3';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../database/dropspot.db');

export const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Performance optimizations
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

export default db;
