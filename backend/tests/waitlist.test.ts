import request from 'supertest';
import app from '../src/app';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const TEST_DB_PATH = path.join(__dirname, 'test-waitlist.db');

describe('Waitlist API', () => {
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

    // Create user and get token
    const signupResponse = await request(app)
      .post('/auth/signup')
      .send({
        email: 'test@example.com',
        password: 'password123',
      });

    authToken = signupResponse.body.data.token;
    userId = signupResponse.body.data.user.id;

    // Create active drop
    const db2 = new Database(TEST_DB_PATH);
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const result = db2.prepare(`
      INSERT INTO drops (title, description, stock, claim_window_start, claim_window_end)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      'Test Drop',
      'Test Description',
      10,
      now.toISOString(),
      tomorrow.toISOString()
    );

    testDropId = Number(result.lastInsertRowid);
    db2.close();
  });

  describe('POST /drops/:id/join', () => {
    it('should join waitlist successfully', async () => {
      const response = await request(app)
        .post(`/drops/${testDropId}/join`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.entry).toHaveProperty('id');
      expect(response.body.data.entry.user_id).toBe(userId);
      expect(response.body.data.entry.drop_id).toBe(testDropId);
      expect(response.body.data).toHaveProperty('position');
      expect(response.body.data).toHaveProperty('total_waitlist');
    });

    it('should be idempotent - multiple joins return same entry', async () => {
      // First join
      const response1 = await request(app)
        .post(`/drops/${testDropId}/join`)
        .set('Authorization', `Bearer ${authToken}`);

      const entryId1 = response1.body.data.entry.id;

      // Second join (should return same entry)
      const response2 = await request(app)
        .post(`/drops/${testDropId}/join`)
        .set('Authorization', `Bearer ${authToken}`);

      const entryId2 = response2.body.data.entry.id;

      expect(response2.status).toBe(201);
      expect(entryId1).toBe(entryId2);

      // Verify only one entry exists
      const db = new Database(TEST_DB_PATH);
      const count = db.prepare('SELECT COUNT(*) as count FROM waitlist WHERE user_id = ? AND drop_id = ?')
        .get(userId, testDropId) as { count: number };
      expect(count.count).toBe(1);
      db.close();
    });

    it('should handle concurrent join requests (race condition test)', async () => {
      // Send 5 concurrent join requests
      const requests = Array(5)
        .fill(null)
        .map(() =>
          request(app)
            .post(`/drops/${testDropId}/join`)
            .set('Authorization', `Bearer ${authToken}`)
        );

      const responses = await Promise.all(requests);

      // All should succeed (idempotent)
      responses.forEach((response) => {
        expect(response.status).toBe(201);
      });

      // Verify only one entry exists
      const db = new Database(TEST_DB_PATH);
      const count = db.prepare('SELECT COUNT(*) as count FROM waitlist WHERE user_id = ? AND drop_id = ?')
        .get(userId, testDropId) as { count: number };
      expect(count.count).toBe(1);
      db.close();
    });

    it('should fail without authentication', async () => {
      const response = await request(app).post(`/drops/${testDropId}/join`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should fail for non-existent drop', async () => {
      const response = await request(app)
        .post('/drops/99999/join')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should calculate priority score', async () => {
      const response = await request(app)
        .post(`/drops/${testDropId}/join`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.body.data.entry.priority_score).toBeGreaterThan(0);
    });
  });

  describe('POST /drops/:id/leave', () => {
    beforeEach(async () => {
      // Join waitlist first
      await request(app)
        .post(`/drops/${testDropId}/join`)
        .set('Authorization', `Bearer ${authToken}`);
    });

    it('should leave waitlist successfully', async () => {
      const response = await request(app)
        .post(`/drops/${testDropId}/leave`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.removed).toBe(true);

      // Verify entry is removed
      const db = new Database(TEST_DB_PATH);
      const count = db.prepare('SELECT COUNT(*) as count FROM waitlist WHERE user_id = ? AND drop_id = ?')
        .get(userId, testDropId) as { count: number };
      expect(count.count).toBe(0);
      db.close();
    });

    it('should be idempotent - multiple leave requests succeed', async () => {
      // First leave
      const response1 = await request(app)
        .post(`/drops/${testDropId}/leave`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response1.body.data.removed).toBe(true);

      // Second leave (not in waitlist anymore)
      const response2 = await request(app)
        .post(`/drops/${testDropId}/leave`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response2.status).toBe(200);
      expect(response2.body.data.removed).toBe(false);
      expect(response2.body.data.message).toContain('not in the waitlist');
    });

    it('should handle concurrent leave requests', async () => {
      const requests = Array(3)
        .fill(null)
        .map(() =>
          request(app)
            .post(`/drops/${testDropId}/leave`)
            .set('Authorization', `Bearer ${authToken}`)
        );

      const responses = await Promise.all(requests);

      // All should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });

      // Verify entry is removed
      const db = new Database(TEST_DB_PATH);
      const count = db.prepare('SELECT COUNT(*) as count FROM waitlist WHERE user_id = ? AND drop_id = ?')
        .get(userId, testDropId) as { count: number };
      expect(count.count).toBe(0);
      db.close();
    });
  });

  describe('GET /drops/:id/waitlist', () => {
    it('should return waitlist for a drop', async () => {
      // Join waitlist
      await request(app)
        .post(`/drops/${testDropId}/join`)
        .set('Authorization', `Bearer ${authToken}`);

      // Get waitlist
      const response = await request(app).get(`/drops/${testDropId}/waitlist`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.total_waitlist).toBe(1);
      expect(response.body.data.entries).toBeInstanceOf(Array);
      expect(response.body.data.entries[0]).toHaveProperty('position');
    });

    it('should work without authentication', async () => {
      const response = await request(app).get(`/drops/${testDropId}/waitlist`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return empty waitlist for drop with no entries', async () => {
      const response = await request(app).get(`/drops/${testDropId}/waitlist`);

      expect(response.status).toBe(200);
      expect(response.body.data.total_waitlist).toBe(0);
      expect(response.body.data.entries).toEqual([]);
    });
  });

  describe('Priority Score and Position', () => {
    it('should assign positions based on priority score', async () => {
      // Create multiple users and join waitlist
      const users = [];

      for (let i = 0; i < 3; i++) {
        const signup = await request(app)
          .post('/auth/signup')
          .send({
            email: `user${i}@example.com`,
            password: 'password123',
          });

        users.push({
          token: signup.body.data.token,
          id: signup.body.data.user.id,
        });

        // Small delay to ensure different join times
        await new Promise((resolve) => setTimeout(resolve, 10));

        await request(app)
          .post(`/drops/${testDropId}/join`)
          .set('Authorization', `Bearer ${signup.body.data.token}`);
      }

      // Get waitlist
      const response = await request(app).get(`/drops/${testDropId}/waitlist`);

      expect(response.body.data.total_waitlist).toBe(3);
      expect(response.body.data.entries).toHaveLength(3);

      // Verify positions are sequential
      const positions = response.body.data.entries.map((e: any) => e.position);
      expect(positions).toEqual([1, 2, 3]);
    });
  });
});
