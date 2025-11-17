import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import dotenv from 'dotenv';
import { SeedGenerator } from '../src/utils/seed';

dotenv.config();

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'dropspot.db');

async function seed() {
  console.log('🌱 Starting database seeding...');

  try {
    const db = new Database(dbPath);
    db.pragma('foreign_keys = ON');

    // Generate and display seed
    const seed = SeedGenerator.getSeed();
    const coefficients = SeedGenerator.getCoefficients();
    console.log('\n🔑 Seed Information:');
    console.log(`   Seed: ${seed}`);
    console.log(`   Coefficients: A=${coefficients.A}, B=${coefficients.B}, C=${coefficients.C}`);

    // Clear existing data (in development)
    console.log('\n🗑️  Clearing existing data...');
    db.exec('DELETE FROM claims');
    db.exec('DELETE FROM waitlist');
    db.exec('DELETE FROM drops');
    db.exec('DELETE FROM users');

    // Seed users
    console.log('\n👥 Seeding users...');
    const hashedPassword = bcrypt.hashSync('password123', 10);

    const insertUser = db.prepare(`
      INSERT INTO users (email, password, role)
      VALUES (?, ?, ?)
    `);

    insertUser.run('admin@dropspot.com', hashedPassword, 'admin');
    insertUser.run('user1@example.com', hashedPassword, 'user');
    insertUser.run('user2@example.com', hashedPassword, 'user');
    insertUser.run('user3@example.com', hashedPassword, 'user');

    console.log('   ✅ Created 4 users (1 admin, 3 regular users)');

    // Seed drops
    console.log('\n📦 Seeding drops...');
    const insertDrop = db.prepare(`
      INSERT INTO drops (title, description, stock, claim_window_start, claim_window_end)
      VALUES (?, ?, ?, ?, ?)
    `);

    // Drop 1: Active drop (claim window open)
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    insertDrop.run(
      'Limited Edition Sneakers',
      'Exclusive drop of premium sneakers. Limited to 50 pairs only!',
      50,
      yesterday.toISOString(),
      tomorrow.toISOString()
    );

    // Drop 2: Upcoming drop
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const nextWeekEnd = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000);

    insertDrop.run(
      'Designer Jacket Pre-Order',
      'Get early access to our new designer jacket collection.',
      30,
      nextWeek.toISOString(),
      nextWeekEnd.toISOString()
    );

    // Drop 3: Past drop (closed)
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastWeekEnd = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);

    insertDrop.run(
      'Vintage Watch Collection',
      'Rare vintage watches from the 90s.',
      10,
      lastWeek.toISOString(),
      lastWeekEnd.toISOString()
    );

    console.log('   ✅ Created 3 drops (1 active, 1 upcoming, 1 past)');

    console.log('\n✅ Seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log('   - Users: 4 (admin@dropspot.com / user1-3@example.com)');
    console.log('   - Default password: password123');
    console.log('   - Drops: 3');
    console.log(`   - Database: ${dbPath}`);

    db.close();
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
