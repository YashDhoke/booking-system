/**
 * Integration Tests: Offerings Routes
 * POST /api/offerings
 * GET  /api/offerings/mine
 * GET  /api/offerings
 */
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '1d';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../../app');
const { TEACHER_TOKEN, PARENT_TOKEN, TEACHER, PARENT } = require('../../test-utils/testHelpers');

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

jest.mock('../../modules/offerings/offering.repository');
jest.mock('../../modules/courses/course.repository');

const offeringRepository = require('../../modules/offerings/offering.repository');
const courseRepository = require('../../modules/courses/course.repository');

const COURSE_ID = '550e8400-e29b-41d4-a716-446655440100';
const OFFERING_ID = '550e8400-e29b-41d4-a716-446655440200';

describe('Offerings Integration — /api/offerings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────────
  // POST /api/offerings
  // ─────────────────────────────────────────────────────────────────────
  describe('POST /api/offerings', () => {
    const validPayload = {
      course_id: COURSE_ID,
      title: 'Advanced Calculus Offering',
      description: 'For bright students',
    };

    test('201 — teacher creates an offering for their own course', async () => {
      courseRepository.findById.mockResolvedValue({ id: COURSE_ID, teacher_id: TEACHER.id });
      offeringRepository.create.mockResolvedValue({
        id: OFFERING_ID,
        ...validPayload,
        teacher_id: TEACHER.id,
      });

      const res = await request(app)
        .post('/api/offerings')
        .set('Authorization', `Bearer ${TEACHER_TOKEN}`)
        .send(validPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Advanced Calculus Offering');
    });

    test('404 — returns error when course does not exist', async () => {
      courseRepository.findById.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/offerings')
        .set('Authorization', `Bearer ${TEACHER_TOKEN}`)
        .send(validPayload);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    test('403 — returns error when teacher does not own the course', async () => {
      courseRepository.findById.mockResolvedValue({ id: COURSE_ID, teacher_id: 'another-teacher-id' });

      const res = await request(app)
        .post('/api/offerings')
        .set('Authorization', `Bearer ${TEACHER_TOKEN}`)
        .send(validPayload);

      expect(res.status).toBe(403);
    });

    test('403 — parent cannot create an offering', async () => {
      const res = await request(app)
        .post('/api/offerings')
        .set('Authorization', `Bearer ${PARENT_TOKEN}`)
        .send(validPayload);

      expect(res.status).toBe(403);
    });

    test('401 — unauthenticated request is rejected', async () => {
      const res = await request(app)
        .post('/api/offerings')
        .send(validPayload);

      expect(res.status).toBe(401);
    });

    test('400 — returns validation error for invalid course_id (not UUID)', async () => {
      const res = await request(app)
        .post('/api/offerings')
        .set('Authorization', `Bearer ${TEACHER_TOKEN}`)
        .send({ ...validPayload, course_id: 'not-a-uuid' });

      expect(res.status).toBe(400);
    });

    test('400 — returns validation error when title is missing', async () => {
      const res = await request(app)
        .post('/api/offerings')
        .set('Authorization', `Bearer ${TEACHER_TOKEN}`)
        .send({ course_id: COURSE_ID });

      expect(res.status).toBe(400);
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // GET /api/offerings/mine
  // ─────────────────────────────────────────────────────────────────────
  describe('GET /api/offerings/mine', () => {
    test('200 — teacher gets their offerings with session_stats', async () => {
      offeringRepository.findByTeacherId.mockResolvedValue([
        { id: OFFERING_ID, title: 'Offering 1', upcoming_sessions_count: 2, total_sessions_count: 4 },
      ]);

      const res = await request(app)
        .get('/api/offerings/mine')
        .set('Authorization', `Bearer ${TEACHER_TOKEN}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data[0].session_stats).toBe('2 upcoming / 4 total');
    });

    test('200 — returns empty array when teacher has no offerings', async () => {
      offeringRepository.findByTeacherId.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/offerings/mine')
        .set('Authorization', `Bearer ${TEACHER_TOKEN}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    test('403 — parent cannot access teacher offerings', async () => {
      const res = await request(app)
        .get('/api/offerings/mine')
        .set('Authorization', `Bearer ${PARENT_TOKEN}`);

      expect(res.status).toBe(403);
    });

    test('401 — unauthenticated request is rejected', async () => {
      const res = await request(app).get('/api/offerings/mine');

      expect(res.status).toBe(401);
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // GET /api/offerings
  // ─────────────────────────────────────────────────────────────────────
  describe('GET /api/offerings', () => {
    test('200 — parent gets all offerings (with sessions formatted in their timezone)', async () => {
      offeringRepository.findAllWithSessions.mockResolvedValue([
        {
          id: OFFERING_ID,
          title: 'Offering 1',
          teacher: { id: TEACHER.id, name: 'Teacher Name' },
          sessions: [
            { id: 's1', offering_id: OFFERING_ID, start_time: '2025-06-07T12:30:00.000Z', end_time: '2025-06-07T13:30:00.000Z' }
          ],
        },
      ]);

      const res = await request(app)
        .get('/api/offerings')
        .set('Authorization', `Bearer ${PARENT_TOKEN}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].sessions[0].timezone).toBe(PARENT.timezone);
    });

    test('200 — offerings with no sessions are excluded from results', async () => {
      offeringRepository.findAllWithSessions.mockResolvedValue([
        { id: 'o1', title: 'Has sessions', sessions: [{ id: 's1', offering_id: 'o1', start_time: '2025-06-07T12:30:00.000Z', end_time: '2025-06-07T13:30:00.000Z' }] },
        { id: 'o2', title: 'No sessions', sessions: [] },
      ]);

      const res = await request(app)
        .get('/api/offerings')
        .set('Authorization', `Bearer ${PARENT_TOKEN}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe('o1');
    });

    test('403 — teacher cannot access all offerings (parent-only route)', async () => {
      const res = await request(app)
        .get('/api/offerings')
        .set('Authorization', `Bearer ${TEACHER_TOKEN}`);

      expect(res.status).toBe(403);
    });

    test('401 — unauthenticated request is rejected', async () => {
      const res = await request(app).get('/api/offerings');

      expect(res.status).toBe(401);
    });
  });
});
