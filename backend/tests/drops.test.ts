import request from 'supertest';
import app from '../src/app';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const TEST_DB_PATH = path.join(__dirname, 'test-drops.db');

describe('Drops API', () => {
  let authToken: string;
  let testDropId: number;

  beforeAll(() => {
    // Create test database
    process.env.DATABASE_PATH = TEST_DB_PATH;

    const db = new Database(TEST_DB_PATH);
    db.pragma('foreign_keys = ON');

    // Create schema
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schema);
    db.close();
  });

  afterAll(() => {
    // Clean up test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  beforeEach(async () => {
    // Clear database
    const db = new Database(TEST_DB_PATH);
    db.exec('DELETE FROM claims');
    db.exec('DELETE FROM waitlist');
    db.exec('DELETE FROM drops');
    db.exec('DELETE FROM users');
    db.close();

    // Create test user and get token
    const signupResponse = await request(app)
      .post('/auth/signup')
      .send({
        email: 'test@example.com',
        password: 'password123',
      });

    authToken = signupResponse.body.data.token;

    // Create test drops
    const db2 = new Database(TEST_DB_PATH);
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Active drop
    const activeStmt = db2.prepare(`
      INSERT INTO drops (title, description, stock, claim_window_start, claim_window_end)
      VALUES (?, ?, ?, ?, ?)
    `);
    const activeResult = activeStmt.run(
      'Active Drop',
      'This drop is currently active',
      10,
      yesterday.toISOString(),
      tomorrow.toISOString()
    );
    testDropId = Number(activeResult.lastInsertRowid);

    // Upcoming drop
    activeStmt.run(
      'Upcoming Drop',
      'This drop is upcoming',
      20,
      nextWeek.toISOString(),
      new Date(nextWeek.getTime() + 24 * 60 * 60 * 1000).toISOString()
    );

    // Past drop
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    activeStmt.run(
      'Past Drop',
      'This drop is over',
      5,
      lastWeek.toISOString(),
      new Date(lastWeek.getTime() + 24 * 60 * 60 * 1000).toISOString()
    );

    db2.close();
  });

  describe('GET /drops', () => {
    it('should return active and upcoming drops by default', async () => {
      const response = await request(app).get('/drops');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(2); // Active + Upcoming, not Past

      // Check enriched data
      expect(response.body.data[0]).toHaveProperty('remaining_stock');
      expect(response.body.data[0]).toHaveProperty('is_claim_window_open');
    });

    it('should filter active drops only', async () => {
      const response = await request(app).get('/drops?filter=active');

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].title).toBe('Active Drop');
      expect(response.body.data[0].is_claim_window_open).toBe(true);
    });

    it('should filter upcoming drops only', async () => {
      const response = await request(app).get('/drops?filter=upcoming');

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].title).toBe('Upcoming Drop');
      expect(response.body.data[0].is_claim_window_open).toBe(false);
    });

    it('should return all drops when filter=all', async () => {
      const response = await request(app).get('/drops?filter=all');

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should work without authentication', async () => {
      const response = await request(app).get('/drops');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /drops/:id', () => {
    it('should return drop details by ID', async () => {
      const response = await request(app).get(`/drops/${testDropId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testDropId);
      expect(response.body.data.title).toBe('Active Drop');
      expect(response.body.data).toHaveProperty('remaining_stock');
      expect(response.body.data).toHaveProperty('is_claim_window_open');
    });

    it('should include user-specific info when authenticated', async () => {
      const response = await request(app)
        .get(`/drops/${testDropId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('user_has_claimed');
      expect(response.body.data.user_has_claimed).toBe(false);
    });

    it('should return 404 for non-existent drop', async () => {
      const response = await request(app).get('/drops/99999');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });

    it('should calculate remaining stock correctly', async () => {
      // Create a claim to reduce stock
      const db = new Database(TEST_DB_PATH);
      const userId = db.prepare('SELECT id FROM users LIMIT 1').get() as { id: number };

      db.prepare(`
        INSERT INTO claims (user_id, drop_id, claim_code)
        VALUES (?, ?, ?)
      `).run(userId.id, testDropId, 'TEST-CODE-0001');
      db.close();

      const response = await request(app).get(`/drops/${testDropId}`);

      expect(response.status).toBe(200);
      expect(response.body.data.stock).toBe(10);
      expect(response.body.data.remaining_stock).toBe(9); // 10 - 1 claimed
    });
  });

  describe('Performance', () => {
    it('should handle multiple concurrent requests', async () => {
      const requests = Array(10)
        .fill(null)
        .map(() => request(app).get('/drops'));

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });
});
