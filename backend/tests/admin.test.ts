import request from 'supertest';
import app from '../src/app';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const TEST_DB_PATH = path.join(__dirname, 'test-admin.db');

describe('Admin API', () => {
  let adminToken: string;
  let userToken: string;
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

    // Create admin user
    const db2 = new Database(TEST_DB_PATH);
    const bcrypt = require('bcryptjs');
    const hashedPassword = bcrypt.hashSync('admin123', 10);

    db2.prepare(`
      INSERT INTO users (email, password, role)
      VALUES (?, ?, ?)
    `).run('admin@dropspot.com', hashedPassword, 'admin');
    db2.close();

    // Login as admin
    const adminLogin = await request(app)
      .post('/auth/login')
      .send({
        email: 'admin@dropspot.com',
        password: 'admin123',
      });

    adminToken = adminLogin.body.data.token;

    // Create regular user
    const userSignup = await request(app)
      .post('/auth/signup')
      .send({
        email: 'user@example.com',
        password: 'password123',
      });

    userToken = userSignup.body.data.token;
  });

  describe('POST /admin/drops', () => {
    it('should create drop as admin', async () => {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const response = await request(app)
        .post('/admin/drops')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'New Drop',
          description: 'Test description',
          stock: 50,
          claim_window_start: now.toISOString(),
          claim_window_end: tomorrow.toISOString(),
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('New Drop');
      expect(response.body.data.stock).toBe(50);
    });

    it('should fail without admin role', async () => {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const response = await request(app)
        .post('/admin/drops')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'New Drop',
          stock: 50,
          claim_window_start: now.toISOString(),
          claim_window_end: tomorrow.toISOString(),
        });

      expect(response.status).toBe(403);
    });

    it('should fail with invalid dates', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const response = await request(app)
        .post('/admin/drops')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'New Drop',
          stock: 50,
          claim_window_start: now.toISOString(),
          claim_window_end: yesterday.toISOString(), // End before start
        });

      expect(response.status).toBe(400);
    });

    it('should fail with zero or negative stock', async () => {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const response = await request(app)
        .post('/admin/drops')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'New Drop',
          stock: 0,
          claim_window_start: now.toISOString(),
          claim_window_end: tomorrow.toISOString(),
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /admin/drops', () => {
    beforeEach(async () => {
      // Create test drop
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      await request(app)
        .post('/admin/drops')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Test Drop',
          stock: 10,
          claim_window_start: now.toISOString(),
          claim_window_end: tomorrow.toISOString(),
        });
    });

    it('should list all drops with stats', async () => {
      const response = await request(app)
        .get('/admin/drops')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('remaining_stock');
      expect(response.body.data[0]).toHaveProperty('claim_count');
    });

    it('should fail without admin role', async () => {
      const response = await request(app)
        .get('/admin/drops')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('PUT /admin/drops/:id', () => {
    beforeEach(async () => {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const createResponse = await request(app)
        .post('/admin/drops')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Test Drop',
          stock: 10,
          claim_window_start: now.toISOString(),
          claim_window_end: tomorrow.toISOString(),
        });

      testDropId = createResponse.body.data.id;
    });

    it('should update drop successfully', async () => {
      const response = await request(app)
        .put(`/admin/drops/${testDropId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Updated Title',
          stock: 20,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.title).toBe('Updated Title');
      expect(response.body.data.stock).toBe(20);
    });

    it('should fail to reduce stock below claims', async () => {
      // Create claim first
      const db = new Database(TEST_DB_PATH);
      const userId = db.prepare('SELECT id FROM users WHERE email = ?').get('user@example.com') as { id: number };

      // Join waitlist
      db.prepare('INSERT INTO waitlist (user_id, drop_id, priority_score) VALUES (?, ?, ?)')
        .run(userId.id, testDropId, 1000);

      // Create claim
      db.prepare('INSERT INTO claims (user_id, drop_id, claim_code) VALUES (?, ?, ?)')
        .run(userId.id, testDropId, 'TEST-CODE-0001');
      db.close();

      // Try to reduce stock to 0
      const response = await request(app)
        .put(`/admin/drops/${testDropId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          stock: 0, // But we have 1 claim
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('below current claims');
    });

    it('should fail without admin role', async () => {
      const response = await request(app)
        .put(`/admin/drops/${testDropId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Updated Title',
        });

      expect(response.status).toBe(403);
    });

    it('should fail for non-existent drop', async () => {
      const response = await request(app)
        .put('/admin/drops/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Updated Title',
        });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /admin/drops/:id', () => {
    beforeEach(async () => {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const createResponse = await request(app)
        .post('/admin/drops')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Test Drop',
          stock: 10,
          claim_window_start: now.toISOString(),
          claim_window_end: tomorrow.toISOString(),
        });

      testDropId = createResponse.body.data.id;
    });

    it('should delete drop successfully', async () => {
      const response = await request(app)
        .delete(`/admin/drops/${testDropId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.success).toBe(true);

      // Verify deletion
      const db = new Database(TEST_DB_PATH);
      const drop = db.prepare('SELECT * FROM drops WHERE id = ?').get(testDropId);
      expect(drop).toBeUndefined();
      db.close();
    });

    it('should fail to delete drop with claims', async () => {
      // Create claim
      const db = new Database(TEST_DB_PATH);
      const userId = db.prepare('SELECT id FROM users WHERE email = ?').get('user@example.com') as { id: number };

      db.prepare('INSERT INTO waitlist (user_id, drop_id, priority_score) VALUES (?, ?, ?)')
        .run(userId.id, testDropId, 1000);

      db.prepare('INSERT INTO claims (user_id, drop_id, claim_code) VALUES (?, ?, ?)')
        .run(userId.id, testDropId, 'TEST-CODE-0001');
      db.close();

      // Try to delete
      const response = await request(app)
        .delete(`/admin/drops/${testDropId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('active claims');
    });

    it('should fail without admin role', async () => {
      const response = await request(app)
        .delete(`/admin/drops/${testDropId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
    });

    it('should cascade delete waitlist entries', async () => {
      // Add waitlist entry
      const db = new Database(TEST_DB_PATH);
      const userId = db.prepare('SELECT id FROM users WHERE email = ?').get('user@example.com') as { id: number };

      db.prepare('INSERT INTO waitlist (user_id, drop_id, priority_score) VALUES (?, ?, ?)')
        .run(userId.id, testDropId, 1000);
      db.close();

      // Delete drop
      await request(app)
        .delete(`/admin/drops/${testDropId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Verify waitlist entry is deleted
      const db2 = new Database(TEST_DB_PATH);
      const waitlistEntry = db2.prepare('SELECT * FROM waitlist WHERE drop_id = ?').get(testDropId);
      expect(waitlistEntry).toBeUndefined();
      db2.close();
    });
  });
});
