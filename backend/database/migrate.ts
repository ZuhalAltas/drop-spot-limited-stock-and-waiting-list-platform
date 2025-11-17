import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'dropspot.db');
const schemaPath = path.join(__dirname, 'schema.sql');

async function migrate() {
  console.log('🔄 Starting database migration...');

  try {
    // Ensure database directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Create database connection
    const db = new Database(dbPath);

    // Enable foreign keys
    db.pragma('foreign_keys = ON');

    // Read schema file
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Execute schema
    db.exec(schema);

    console.log('✅ Migration completed successfully!');
    console.log(`📁 Database location: ${dbPath}`);

    // Verify tables
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('\n📊 Created tables:');
    tables.forEach((table: any) => {
      console.log(`   - ${table.name}`);
    });

    db.close();
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
