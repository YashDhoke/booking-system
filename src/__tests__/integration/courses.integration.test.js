/**
 * Integration Tests: Courses Routes
 * POST /api/courses
 * GET  /api/courses/mine
 */
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '1d';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../../app');
const { TEACHER_TOKEN, PARENT_TOKEN, TEACHER } = require('./helpers/testHelpers');

jest.mock('../../utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  http: jest.fn(),
  warn: jest.fn(),
}));

jest.mock('../../config/database', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
  pool: {
    query: jest.fn().mockResolvedValue({ rows: [] }),
    connect: jest.fn().mockImplementation((cb) => cb && cb(null, {}, jest.fn())),
  },
}));

jest.mock('../../modules/courses/course.repository');
const courseRepository = require('../../modules/courses/course.repository');

describe('Courses Integration — /api/courses', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────────
  // POST /api/courses
  // ─────────────────────────────────────────────────────────────────────
  describe('POST /api/courses', () => {
    const validPayload = { title: 'Advanced Math', description: 'Calculus and beyond' };

    test('201 — teacher can create a course', async () => {
      courseRepository.create.mockResolvedValue({
        id: 'course-id-1',
        title: validPayload.title,
        description: validPayload.description,
        teacher_id: TEACHER.id,
      });

      const res = await request(app)
        .post('/api/courses')
        .set('Authorization', `Bearer ${TEACHER_TOKEN}`)
        .send(validPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Advanced Math');
    });

    test('403 — parent cannot create a course', async () => {
      const res = await request(app)
        .post('/api/courses')
        .set('Authorization', `Bearer ${PARENT_TOKEN}`)
        .send(validPayload);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    test('401 — unauthenticated request is rejected', async () => {
      const res = await request(app)
        .post('/api/courses')
        .send(validPayload);

      expect(res.status).toBe(401);
    });

    test('400 — returns validation error when title is missing', async () => {
      const res = await request(app)
        .post('/api/courses')
        .set('Authorization', `Bearer ${TEACHER_TOKEN}`)
        .send({ description: 'No title here' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('400 — returns validation error when title is empty', async () => {
      const res = await request(app)
        .post('/api/courses')
        .set('Authorization', `Bearer ${TEACHER_TOKEN}`)
        .send({ title: '' });

      expect(res.status).toBe(400);
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // GET /api/courses/mine
  // ─────────────────────────────────────────────────────────────────────
  describe('GET /api/courses/mine', () => {
    test('200 — teacher gets their courses', async () => {
      const mockCourses = [
        { id: 'c1', title: 'Math', teacher_id: TEACHER.id },
        { id: 'c2', title: 'Science', teacher_id: TEACHER.id },
      ];
      courseRepository.findByTeacherId.mockResolvedValue(mockCourses);

      const res = await request(app)
        .get('/api/courses/mine')
        .set('Authorization', `Bearer ${TEACHER_TOKEN}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
    });

    test('200 — returns empty array when teacher has no courses', async () => {
      courseRepository.findByTeacherId.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/courses/mine')
        .set('Authorization', `Bearer ${TEACHER_TOKEN}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    test('403 — parent cannot access teacher courses', async () => {
      const res = await request(app)
        .get('/api/courses/mine')
        .set('Authorization', `Bearer ${PARENT_TOKEN}`);

      expect(res.status).toBe(403);
    });

    test('401 — unauthenticated request is rejected', async () => {
      const res = await request(app)
        .get('/api/courses/mine');

      expect(res.status).toBe(401);
    });
  });
});
