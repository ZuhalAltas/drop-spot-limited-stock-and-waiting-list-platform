import request from 'supertest';
import app from '../src/app';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const TEST_DB_PATH = path.join(__dirname, 'test.db');

describe('Authentication API', () => {
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

  beforeEach(() => {
    // Clear users table before each test
    const db = new Database(TEST_DB_PATH);
    db.exec('DELETE FROM users');
    db.close();
  });

  describe('POST /auth/signup', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.user.role).toBe('user');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('should fail with duplicate email', async () => {
      // Register first user
      await request(app)
        .post('/auth/signup')
        .send({
          email: 'duplicate@example.com',
          password: 'password123',
        });

      // Try to register again with same email
      const response = await request(app)
        .post('/auth/signup')
        .send({
          email: 'duplicate@example.com',
          password: 'password456',
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already registered');
    });

    it('should fail with invalid email', async () => {
      const response = await request(app)
        .post('/auth/signup')
        .send({
          email: 'invalid-email',
          password: 'password123',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should fail with short password', async () => {
      const response = await request(app)
        .post('/auth/signup')
        .send({
          email: 'test@example.com',
          password: '123',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Create a user for login tests
      await request(app)
        .post('/auth/signup')
        .send({
          email: 'login@example.com',
          password: 'password123',
        });
    });

    it('should login successfully with correct credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'login@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('login@example.com');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('should fail with incorrect password', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'login@example.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid');
    });

    it('should fail with non-existent email', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /auth/me', () => {
    let token: string;

    beforeEach(async () => {
      // Create user and get token
      const response = await request(app)
        .post('/auth/signup')
        .send({
          email: 'profile@example.com',
          password: 'password123',
        });

      token = response.body.data.token;
    });

    it('should return user profile with valid token', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe('profile@example.com');
      expect(response.body.data).not.toHaveProperty('password');
    });

    it('should fail without token', async () => {
      const response = await request(app).get('/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should fail with invalid token', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Idempotency', () => {
    it('should not create duplicate users on concurrent signups', async () => {
      const email = 'concurrent@example.com';

      // Send multiple signup requests concurrently
      const requests = Array(3)
        .fill(null)
        .map(() =>
          request(app)
            .post('/auth/signup')
            .send({ email, password: 'password123' })
        );

      const responses = await Promise.all(requests);

      // Only one should succeed
      const successCount = responses.filter((r) => r.status === 201).length;
      const conflictCount = responses.filter((r) => r.status === 409).length;

      expect(successCount).toBe(1);
      expect(conflictCount).toBe(2);
    });
  });
});
