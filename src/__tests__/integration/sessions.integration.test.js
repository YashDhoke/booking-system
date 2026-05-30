/**
 * Integration Tests: Sessions Routes
 * POST /api/offerings/:offeringId/sessions
 * GET  /api/offerings/:offeringId/sessions
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

jest.mock('../../modules/sessions/session.repository');
jest.mock('../../modules/offerings/offering.repository');

const sessionRepository = require('../../modules/sessions/session.repository');
const offeringRepository = require('../../modules/offerings/offering.repository');

const OFFERING_ID = '550e8400-e29b-41d4-a716-446655440300';
const mockOffering = { id: OFFERING_ID, teacher_id: TEACHER.id, title: 'Test Offering' };

// Use far-future dates to avoid "past session" rejection
const FUTURE_START = '2099-06-01 10:00';
const FUTURE_END   = '2099-06-01 11:00';

describe('Sessions Integration — /api/offerings/:offeringId/sessions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────────
  // POST /api/offerings/:offeringId/sessions
  // ─────────────────────────────────────────────────────────────────────
  describe('POST /api/offerings/:offeringId/sessions', () => {
    const validPayload = [{ start_time: FUTURE_START, end_time: FUTURE_END }];

    test('201 — teacher adds sessions to their offering', async () => {
      offeringRepository.findById.mockResolvedValue(mockOffering);
      sessionRepository.bulkCreate.mockResolvedValue([
        { id: 's1', offering_id: OFFERING_ID, teacher_id: TEACHER.id, start_time: new Date(FUTURE_START).toISOString(), end_time: new Date(FUTURE_END).toISOString() }
      ]);

      const res = await request(app)
        .post(`/api/offerings/${OFFERING_ID}/sessions`)
        .set('Authorization', `Bearer ${TEACHER_TOKEN}`)
        .send(validPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });

    test('404 — returns error when offering does not exist', async () => {
      offeringRepository.findById.mockResolvedValue(null);

      const res = await request(app)
        .post(`/api/offerings/${OFFERING_ID}/sessions`)
        .set('Authorization', `Bearer ${TEACHER_TOKEN}`)
        .send(validPayload);

      expect(res.status).toBe(404);
    });

    test('403 — returns error when teacher does not own the offering', async () => {
      offeringRepository.findById.mockResolvedValue({ ...mockOffering, teacher_id: 'other-teacher' });

      const res = await request(app)
        .post(`/api/offerings/${OFFERING_ID}/sessions`)
        .set('Authorization', `Bearer ${TEACHER_TOKEN}`)
        .send(validPayload);

      expect(res.status).toBe(403);
    });

    test('403 — parent cannot add sessions', async () => {
      const res = await request(app)
        .post(`/api/offerings/${OFFERING_ID}/sessions`)
        .set('Authorization', `Bearer ${PARENT_TOKEN}`)
        .send(validPayload);

      expect(res.status).toBe(403);
    });

    test('401 — unauthenticated request is rejected', async () => {
      const res = await request(app)
        .post(`/api/offerings/${OFFERING_ID}/sessions`)
        .send(validPayload);

      expect(res.status).toBe(401);
    });

    test('400 — returns validation error for wrong time format', async () => {
      offeringRepository.findById.mockResolvedValue(mockOffering);

      const res = await request(app)
        .post(`/api/offerings/${OFFERING_ID}/sessions`)
        .set('Authorization', `Bearer ${TEACHER_TOKEN}`)
        .send([{ start_time: '2099/06/01', end_time: '2099/06/01' }]);

      expect(res.status).toBe(400);
    });

    test('400 — returns error for session in the past', async () => {
      offeringRepository.findById.mockResolvedValue(mockOffering);

      const res = await request(app)
        .post(`/api/offerings/${OFFERING_ID}/sessions`)
        .set('Authorization', `Bearer ${TEACHER_TOKEN}`)
        .send([{ start_time: '2020-01-01 10:00', end_time: '2020-01-01 11:00' }]);

      expect(res.status).toBe(400);
    });

    test('400 — returns error for empty sessions array', async () => {
      offeringRepository.findById.mockResolvedValue(mockOffering);

      const res = await request(app)
        .post(`/api/offerings/${OFFERING_ID}/sessions`)
        .set('Authorization', `Bearer ${TEACHER_TOKEN}`)
        .send([]);

      expect(res.status).toBe(400);
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // GET /api/offerings/:offeringId/sessions
  // ─────────────────────────────────────────────────────────────────────
  describe('GET /api/offerings/:offeringId/sessions', () => {
    const rawSessions = [
      {
        id: 's1',
        offering_id: OFFERING_ID,
        start_time: '2025-06-07T12:30:00.000Z',
        end_time: '2025-06-07T13:30:00.000Z',
      }
    ];

    test('200 — teacher can view sessions (formatted in their timezone)', async () => {
      sessionRepository.findByOfferingId.mockResolvedValue(rawSessions);

      const res = await request(app)
        .get(`/api/offerings/${OFFERING_ID}/sessions`)
        .set('Authorization', `Bearer ${TEACHER_TOKEN}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data[0].timezone).toBe(TEACHER.timezone);
    });

    test('200 — parent can view sessions (formatted in their timezone)', async () => {
      sessionRepository.findByOfferingId.mockResolvedValue(rawSessions);

      const res = await request(app)
        .get(`/api/offerings/${OFFERING_ID}/sessions`)
        .set('Authorization', `Bearer ${PARENT_TOKEN}`);

      expect(res.status).toBe(200);
      expect(res.body.data[0].timezone).toBe(PARENT.timezone);
      expect(res.body.data[0].start_time).toBe('2025-06-07 18:00:00'); // Asia/Kolkata
    });

    test('200 — returns empty array when no sessions exist', async () => {
      sessionRepository.findByOfferingId.mockResolvedValue([]);

      const res = await request(app)
        .get(`/api/offerings/${OFFERING_ID}/sessions`)
        .set('Authorization', `Bearer ${TEACHER_TOKEN}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    test('401 — unauthenticated request is rejected', async () => {
      const res = await request(app)
        .get(`/api/offerings/${OFFERING_ID}/sessions`);

      expect(res.status).toBe(401);
    });
  });
});
