/**
 * Integration Tests: Bookings Routes
 * POST   /api/bookings
 * GET    /api/bookings/mine
 * PATCH  /api/bookings/:bookingId/cancel
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

const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

jest.mock('../../config/database', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
  pool: {
    query: jest.fn().mockResolvedValue({ rows: [] }),
    connect: jest.fn().mockImplementation((cb) => cb && cb(null, {}, jest.fn())),
  },
}));

jest.mock('../../modules/bookings/booking.repository');

const db = require('../../config/database');
const bookingRepository = require('../../modules/bookings/booking.repository');

const OFFERING_ID = '550e8400-e29b-41d4-a716-446655440400';
const BOOKING_ID  = '550e8400-e29b-41d4-a716-446655440500';

describe('Bookings Integration — /api/bookings', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default: getClient returns a mock transaction client
    mockClient.query.mockImplementation((q) => {
      if (q === 'BEGIN' || q === 'COMMIT' || q === 'ROLLBACK') return Promise.resolve();
      if (typeof q === 'string' && q.includes('SELECT * FROM offerings')) {
        return Promise.resolve({ rows: [{ id: OFFERING_ID }] });
      }
      return Promise.resolve({ rows: [] });
    });
    mockClient.release.mockReturnValue(undefined);

    db.getClient.mockResolvedValue({
      client: mockClient,
      query: mockClient.query,
      release: mockClient.release,
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // POST /api/bookings
  // ─────────────────────────────────────────────────────────────────────
  describe('POST /api/bookings', () => {
    test('201 — parent books an offering with no conflicts', async () => {
      bookingRepository.findBookingByParentAndOffering.mockResolvedValue(null);
      bookingRepository.getParentBookedSessions.mockResolvedValue([]);
      bookingRepository.getOfferingSessions.mockResolvedValue([
        { start_time: '2099-06-07T10:00:00Z', end_time: '2099-06-07T11:00:00Z' }
      ]);
      bookingRepository.createBooking.mockResolvedValue({
        id: BOOKING_ID,
        parent_id: PARENT.id,
        offering_id: OFFERING_ID,
        status: 'confirmed',
      });

      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${PARENT_TOKEN}`)
        .send({ offering_id: OFFERING_ID });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('confirmed');
    });

    test('409 — returns conflict when offering is already booked by the parent', async () => {
      bookingRepository.findBookingByParentAndOffering.mockResolvedValue({
        id: BOOKING_ID,
        status: 'confirmed',
      });

      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${PARENT_TOKEN}`)
        .send({ offering_id: OFFERING_ID });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    test('409 — returns conflict when there is a schedule clash', async () => {
      bookingRepository.findBookingByParentAndOffering.mockResolvedValue(null);
      bookingRepository.getParentBookedSessions.mockResolvedValue([
        { start_time: '2099-06-07T10:00:00Z', end_time: '2099-06-07T11:00:00Z' }
      ]);
      bookingRepository.getOfferingSessions.mockResolvedValue([
        { start_time: '2099-06-07T10:30:00Z', end_time: '2099-06-07T11:30:00Z' } // overlaps
      ]);

      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${PARENT_TOKEN}`)
        .send({ offering_id: OFFERING_ID });

      expect(res.status).toBe(409);
    });

    test('422 — returns error when offering has no sessions', async () => {
      bookingRepository.findBookingByParentAndOffering.mockResolvedValue(null);
      bookingRepository.getParentBookedSessions.mockResolvedValue([]);
      bookingRepository.getOfferingSessions.mockResolvedValue([]);

      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${PARENT_TOKEN}`)
        .send({ offering_id: OFFERING_ID });

      expect(res.status).toBe(422);
    });

    test('404 — returns error when offering does not exist', async () => {
      bookingRepository.findBookingByParentAndOffering.mockResolvedValue(null);
      mockClient.query.mockImplementation((q) => {
        if (q === 'BEGIN' || q === 'COMMIT' || q === 'ROLLBACK') return Promise.resolve();
        if (typeof q === 'string' && q.includes('SELECT * FROM offerings')) {
          return Promise.resolve({ rows: [] }); // offering not found
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${PARENT_TOKEN}`)
        .send({ offering_id: OFFERING_ID });

      expect(res.status).toBe(404);
    });

    test('403 — teacher cannot book an offering (parent-only)', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${TEACHER_TOKEN}`)
        .send({ offering_id: OFFERING_ID });

      expect(res.status).toBe(403);
    });

    test('401 — unauthenticated request is rejected', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .send({ offering_id: OFFERING_ID });

      expect(res.status).toBe(401);
    });

    test('400 — returns validation error for non-UUID offering_id', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${PARENT_TOKEN}`)
        .send({ offering_id: 'not-a-uuid' });

      expect(res.status).toBe(400);
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // GET /api/bookings/mine
  // ─────────────────────────────────────────────────────────────────────
  describe('GET /api/bookings/mine', () => {
    test('200 — parent gets their bookings with timezone-formatted sessions', async () => {
      bookingRepository.findParentBookings.mockResolvedValue([
        {
          id: BOOKING_ID,
          status: 'confirmed',
          offering: {
            id: OFFERING_ID,
            title: 'Offering 1',
            sessions: [
              { id: 's1', offering_id: OFFERING_ID, start_time: '2025-06-07T12:30:00.000Z', end_time: '2025-06-07T13:30:00.000Z' }
            ],
          },
        }
      ]);

      const res = await request(app)
        .get('/api/bookings/mine')
        .set('Authorization', `Bearer ${PARENT_TOKEN}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data[0].offering.sessions[0].timezone).toBe(PARENT.timezone);
    });

    test('200 — returns empty array when parent has no bookings', async () => {
      bookingRepository.findParentBookings.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/bookings/mine')
        .set('Authorization', `Bearer ${PARENT_TOKEN}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    test('403 — teacher cannot access booking list (parent-only)', async () => {
      const res = await request(app)
        .get('/api/bookings/mine')
        .set('Authorization', `Bearer ${TEACHER_TOKEN}`);

      expect(res.status).toBe(403);
    });

    test('401 — unauthenticated request is rejected', async () => {
      const res = await request(app).get('/api/bookings/mine');

      expect(res.status).toBe(401);
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // PATCH /api/bookings/:bookingId/cancel
  // ─────────────────────────────────────────────────────────────────────
  describe('PATCH /api/bookings/:bookingId/cancel', () => {
    const mockBooking = { id: BOOKING_ID, parent_id: PARENT.id, status: 'confirmed' };

    test('200 — parent cancels their own confirmed booking', async () => {
      bookingRepository.findById.mockResolvedValue(mockBooking);
      bookingRepository.cancelBooking.mockResolvedValue({ ...mockBooking, status: 'cancelled' });

      const res = await request(app)
        .patch(`/api/bookings/${BOOKING_ID}/cancel`)
        .set('Authorization', `Bearer ${PARENT_TOKEN}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('cancelled');
    });

    test('409 — returns error when booking is already cancelled', async () => {
      bookingRepository.findById.mockResolvedValue({ ...mockBooking, status: 'cancelled' });

      const res = await request(app)
        .patch(`/api/bookings/${BOOKING_ID}/cancel`)
        .set('Authorization', `Bearer ${PARENT_TOKEN}`);

      expect(res.status).toBe(409);
    });

    test('404 — returns error when booking does not exist', async () => {
      bookingRepository.findById.mockResolvedValue(null);

      const res = await request(app)
        .patch(`/api/bookings/${BOOKING_ID}/cancel`)
        .set('Authorization', `Bearer ${PARENT_TOKEN}`);

      expect(res.status).toBe(404);
    });

    test('404 — returns error when booking belongs to a different parent', async () => {
      bookingRepository.findById.mockResolvedValue({ ...mockBooking, parent_id: 'another-parent-id' });

      const res = await request(app)
        .patch(`/api/bookings/${BOOKING_ID}/cancel`)
        .set('Authorization', `Bearer ${PARENT_TOKEN}`);

      expect(res.status).toBe(404);
    });

    test('403 — teacher cannot cancel bookings (parent-only)', async () => {
      const res = await request(app)
        .patch(`/api/bookings/${BOOKING_ID}/cancel`)
        .set('Authorization', `Bearer ${TEACHER_TOKEN}`);

      expect(res.status).toBe(403);
    });

    test('401 — unauthenticated request is rejected', async () => {
      const res = await request(app)
        .patch(`/api/bookings/${BOOKING_ID}/cancel`);

      expect(res.status).toBe(401);
    });
  });
});
