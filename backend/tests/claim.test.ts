import request from 'supertest';
import app from '../src/app';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const TEST_DB_PATH = path.join(__dirname, 'test-claim.db');

describe('Claim API', () => {
  let authToken: string;
  let userId: number;
  let testDropId: number;

  beforeAll(() => {
    process.env.DATABASE_PATH = TEST_DB_PATH;

    const db = new Database(TEST_DB_PATH);
    db.pragma('foreign_keys = ON');

    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schema);
    db.close();
  });

  afterAll(() => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  beforeEach(async () => {
    const db = new Database(TEST_DB_PATH);
    db.exec('DELETE FROM claims');
    db.exec('DELETE FROM waitlist');
    db.exec('DELETE FROM drops');
    db.exec('DELETE FROM users');
    db.close();

    // Create user
    const signupResponse = await request(app)
      .post('/auth/signup')
      .send({
        email: 'test@example.com',
        password: 'password123',
      });

    authToken = signupResponse.body.data.token;
    userId = signupResponse.body.data.user.id;

    // Create active drop with limited stock
    const db2 = new Database(TEST_DB_PATH);
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const result = db2.prepare(`
      INSERT INTO drops (title, description, stock, claim_window_start, claim_window_end)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      'Test Drop',
      'Limited stock drop',
      3, // Only 3 stock
      now.toISOString(),
      tomorrow.toISOString()
    );

    testDropId = Number(result.lastInsertRowid);
    db2.close();

    // Join waitlist (required for claiming)
    await request(app)
      .post(`/drops/${testDropId}/join`)
      .set('Authorization', `Bearer ${authToken}`);
  });

  describe('POST /drops/:id/claim', () => {
    it('should claim drop successfully', async () => {
      const response = await request(app)
        .post(`/drops/${testDropId}/claim`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.claim).toHaveProperty('claim_code');
      expect(response.body.data.claim.claim_code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
      expect(response.body.data.is_new).toBe(true);
    });

    it('should be idempotent - multiple claims return same claim code', async () => {
      // First claim
      const response1 = await request(app)
        .post(`/drops/${testDropId}/claim`)
        .set('Authorization', `Bearer ${authToken}`);

      const claimCode1 = response1.body.data.claim.claim_code;

      // Second claim
      const response2 = await request(app)
        .post(`/drops/${testDropId}/claim`)
        .set('Authorization', `Bearer ${authToken}`);

      const claimCode2 = response2.body.data.claim.claim_code;

      expect(response2.status).toBe(200); // Not 201 for existing claim
      expect(response2.body.data.is_new).toBe(false);
      expect(claimCode1).toBe(claimCode2);

      // Verify only one claim exists
      const db = new Database(TEST_DB_PATH);
      const count = db.prepare('SELECT COUNT(*) as count FROM claims WHERE user_id = ? AND drop_id = ?')
        .get(userId, testDropId) as { count: number };
      expect(count.count).toBe(1);
      db.close();
    });

    it('should remove user from waitlist after claiming', async () => {
      await request(app)
        .post(`/drops/${testDropId}/claim`)
        .set('Authorization', `Bearer ${authToken}`);

      // Check waitlist
      const db = new Database(TEST_DB_PATH);
      const waitlistCount = db.prepare('SELECT COUNT(*) as count FROM waitlist WHERE user_id = ? AND drop_id = ?')
        .get(userId, testDropId) as { count: number };
      expect(waitlistCount.count).toBe(0);
      db.close();
    });

    it('should fail if not in waitlist', async () => {
      // Leave waitlist first
      await request(app)
        .post(`/drops/${testDropId}/leave`)
        .set('Authorization', `Bearer ${authToken}`);

      // Try to claim
      const response = await request(app)
        .post(`/drops/${testDropId}/claim`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('waitlist');
    });

    it('should fail without authentication', async () => {
      const response = await request(app).post(`/drops/${testDropId}/claim`);

      expect(response.status).toBe(401);
    });

    it('should fail for non-existent drop', async () => {
      const response = await request(app)
        .post('/drops/99999/claim')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should fail if claim window not open', async () => {
      // Create future drop
      const db = new Database(TEST_DB_PATH);
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const nextWeekEnd = new Date(nextWeek.getTime() + 24 * 60 * 60 * 1000);

      const result = db.prepare(`
        INSERT INTO drops (title, description, stock, claim_window_start, claim_window_end)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        'Future Drop',
        'Not yet claimable',
        10,
        nextWeek.toISOString(),
        nextWeekEnd.toISOString()
      );

      const futureDropId = Number(result.lastInsertRowid);
      db.close();

      // Join waitlist
      await request(app)
        .post(`/drops/${futureDropId}/join`)
        .set('Authorization', `Bearer ${authToken}`);

      // Try to claim
      const response = await request(app)
        .post(`/drops/${futureDropId}/claim`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('not started');
    });
  });

  describe('Stock Management', () => {
    it('should prevent claiming when stock is depleted', async () => {
      // Create 3 users and claim all stock
      for (let i = 0; i < 3; i++) {
        const signup = await request(app)
          .post('/auth/signup')
          .send({
            email: `user${i}@example.com`,
            password: 'password123',
          });

        const token = signup.body.data.token;

        // Join waitlist
        await request(app)
          .post(`/drops/${testDropId}/join`)
          .set('Authorization', `Bearer ${token}`);

        // Claim
        const claimResponse = await request(app)
          .post(`/drops/${testDropId}/claim`)
          .set('Authorization', `Bearer ${token}`);

        expect(claimResponse.status).toBe(201);
      }

      // Try to claim with 4th user (no stock left)
      const signup4 = await request(app)
        .post('/auth/signup')
        .send({
          email: 'user4@example.com',
          password: 'password123',
        });

      await request(app)
        .post(`/drops/${testDropId}/join`)
        .set('Authorization', `Bearer ${signup4.body.data.token}`);

      const response = await request(app)
        .post(`/drops/${testDropId}/claim`)
        .set('Authorization', `Bearer ${signup4.body.data.token}`);

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('sold out');
    });

    it('should handle concurrent claims without overselling', async () => {
      // Create multiple users
      const users = [];
      for (let i = 0; i < 10; i++) {
        const signup = await request(app)
          .post('/auth/signup')
          .send({
            email: `user${i}@example.com`,
            password: 'password123',
          });

        users.push(signup.body.data.token);

        // Join waitlist
        await request(app)
          .post(`/drops/${testDropId}/join`)
          .set('Authorization', `Bearer ${signup.body.data.token}`);
      }

      // All try to claim concurrently
      const claimRequests = users.map((token) =>
        request(app)
          .post(`/drops/${testDropId}/claim`)
          .set('Authorization', `Bearer ${token}`)
      );

      const responses = await Promise.all(claimRequests);

      // Count successes
      const successCount = responses.filter((r) => r.status === 201).length;
      const soldOutCount = responses.filter((r) => r.status === 409).length;

      // Only 3 should succeed (stock = 3)
      expect(successCount).toBe(3);
      expect(soldOutCount).toBe(7);

      // Verify database
      const db = new Database(TEST_DB_PATH);
      const claimCount = db.prepare('SELECT COUNT(*) as count FROM claims WHERE drop_id = ?')
        .get(testDropId) as { count: number };
      expect(claimCount.count).toBe(3);
      db.close();
    });
  });

  describe('GET /drops/:id/claims', () => {
    it('should return all claims for a drop', async () => {
      // Create claim
      await request(app)
        .post(`/drops/${testDropId}/claim`)
        .set('Authorization', `Bearer ${authToken}`);

      // Get claims
      const response = await request(app).get(`/drops/${testDropId}/claims`);

      expect(response.status).toBe(200);
      expect(response.body.data.total_claims).toBe(1);
      expect(response.body.data.remaining_stock).toBe(2);
      expect(response.body.data.claims).toHaveLength(1);
    });
  });

  describe('Claim Code Uniqueness', () => {
    it('should generate unique claim codes', async () => {
      const codes = new Set<string>();

      // Create 3 users and claim
      for (let i = 0; i < 3; i++) {
        const signup = await request(app)
          .post('/auth/signup')
          .send({
            email: `user${i}@example.com`,
            password: 'password123',
          });

        await request(app)
          .post(`/drops/${testDropId}/join`)
          .set('Authorization', `Bearer ${signup.body.data.token}`);

        const claimResponse = await request(app)
          .post(`/drops/${testDropId}/claim`)
          .set('Authorization', `Bearer ${signup.body.data.token}`);

        const claimCode = claimResponse.body.data.claim.claim_code;
        codes.add(claimCode);
      }

      // All codes should be unique
      expect(codes.size).toBe(3);
    });
  });
});
