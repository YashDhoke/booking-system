const bookingService = require('../booking.service');
const bookingRepository = require('../booking.repository');
const { getClient } = require('../../../config/database');
const AppError = require('../../../utils/AppError');

jest.mock('../booking.repository');
jest.mock('../../../config/database', () => ({
  getClient: jest.fn(),
  query: jest.fn(),
}));

describe('booking.service', () => {
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };
    getClient.mockResolvedValue({
      client: mockClient,
      query: mockClient.query,
      release: mockClient.release,
    });
  });

  describe('bookOffering', () => {
    const parentId = '550e8400-e29b-41d4-a716-446655440000';
    const offeringId = '660e8400-e29b-41d4-a716-446655440001';

    beforeEach(() => {
      mockClient.query.mockImplementation((q) => {
        if (q === 'BEGIN' || q === 'COMMIT' || q === 'ROLLBACK') return Promise.resolve();
        if (q.includes('SELECT * FROM offerings')) return Promise.resolve({ rows: [{ id: offeringId }] });
        return Promise.resolve({ rows: [] });
      });
    });

    test('should succeed when there are no conflicts', async () => {
      bookingRepository.findBookingByParentAndOffering.mockResolvedValue(null);
      bookingRepository.getParentBookedSessions.mockResolvedValue([
        { start_time: '2025-06-07T10:00:00Z', end_time: '2025-06-07T11:00:00Z' }
      ]);
      bookingRepository.getOfferingSessions.mockResolvedValue([
        { start_time: '2025-06-07T12:00:00Z', end_time: '2025-06-07T13:00:00Z' }
      ]);
      bookingRepository.createBooking.mockResolvedValue({ id: '660e8400-e29b-41d4-a716-446655440002' });

      const result = await bookingService.bookOffering(offeringId, parentId);

      expect(result.id).toBe('660e8400-e29b-41d4-a716-446655440002');
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    test('should throw 409 when there is a direct overlap', async () => {
      bookingRepository.findBookingByParentAndOffering.mockResolvedValue(null);
      bookingRepository.getParentBookedSessions.mockResolvedValue([
        { start_time: '2025-06-07T10:00:00Z', end_time: '2025-06-07T11:00:00Z' }
      ]);
      bookingRepository.getOfferingSessions.mockResolvedValue([
        { start_time: '2025-06-07T10:30:00Z', end_time: '2025-06-07T11:30:00Z' }
      ]);

      await expect(bookingService.bookOffering(offeringId, parentId)).rejects.toThrow(AppError);
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    test('should succeed when sessions are exactly back-to-back', async () => {
      bookingRepository.findBookingByParentAndOffering.mockResolvedValue(null);
      bookingRepository.getParentBookedSessions.mockResolvedValue([
        { start_time: '2025-06-07T10:00:00Z', end_time: '2025-06-07T11:00:00Z' }
      ]);
      bookingRepository.getOfferingSessions.mockResolvedValue([
        { start_time: '2025-06-07T11:00:00Z', end_time: '2025-06-07T12:00:00Z' }
      ]);
      bookingRepository.createBooking.mockResolvedValue({ id: '660e8400-e29b-41d4-a716-446655440002' });

      await bookingService.bookOffering(offeringId, parentId);

      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    test('should throw 409 if offering is already booked by the parent', async () => {
      bookingRepository.findBookingByParentAndOffering.mockResolvedValue({ id: 'existing', status: 'confirmed' });

      await expect(bookingService.bookOffering(offeringId, parentId)).rejects.toThrow('already booked');
    });

    test('should throw 422 if offering has no sessions', async () => {
      bookingRepository.findBookingByParentAndOffering.mockResolvedValue(null);
      bookingRepository.getParentBookedSessions.mockResolvedValue([]);
      bookingRepository.getOfferingSessions.mockResolvedValue([]);

      await expect(bookingService.bookOffering(offeringId, parentId)).rejects.toMatchObject({ statusCode: 422 });
    });

    test('should throw ZodError for invalid offeringId (not UUID)', async () => {
      await expect(bookingService.bookOffering('not-a-uuid', parentId)).rejects.toThrow();
    });

    test('should throw 404 if offering does not exist', async () => {
      bookingRepository.findBookingByParentAndOffering.mockResolvedValue(null);
      mockClient.query.mockImplementation((q) => {
        if (q === 'BEGIN' || q === 'COMMIT' || q === 'ROLLBACK') return Promise.resolve();
        if (q.includes('SELECT * FROM offerings')) return Promise.resolve({ rows: [] }); // no offering
        return Promise.resolve({ rows: [] });
      });

      await expect(bookingService.bookOffering(offeringId, parentId))
        .rejects.toMatchObject({ statusCode: 404, message: 'Offering not found' });
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('getParentBookings', () => {
    const parentId = '550e8400-e29b-41d4-a716-446655440000';

    test('should return bookings with sessions formatted in user timezone', async () => {
      const rawBookings = [
        {
          id: 'b1',
          status: 'confirmed',
          offering: {
            id: 'o1',
            title: 'Offering 1',
            sessions: [
              { id: 's1', offering_id: 'o1', start_time: '2025-06-07T12:30:00.000Z', end_time: '2025-06-07T13:30:00.000Z' }
            ]
          }
        }
      ];
      bookingRepository.findParentBookings.mockResolvedValue(rawBookings);

      const result = await bookingService.getParentBookings(parentId, 'Asia/Kolkata');

      expect(result).toHaveLength(1);
      expect(result[0].offering.sessions[0].timezone).toBe('Asia/Kolkata');
      expect(result[0].offering.sessions[0].start_time).toBe('2025-06-07 18:00:00');
    });

    test('should return empty array when parent has no bookings', async () => {
      bookingRepository.findParentBookings.mockResolvedValue([]);

      const result = await bookingService.getParentBookings(parentId, 'UTC');

      expect(result).toEqual([]);
    });
  });

  describe('cancelBooking', () => {
    const bookingId = '770e8400-e29b-41d4-a716-446655440003';
    const parentId = '550e8400-e29b-41d4-a716-446655440000';

    test('should cancel a booking successfully', async () => {
      const mockBooking = { id: bookingId, parent_id: parentId, status: 'confirmed' };
      bookingRepository.findById.mockResolvedValue(mockBooking);
      bookingRepository.cancelBooking.mockResolvedValue({ ...mockBooking, status: 'cancelled' });

      const result = await bookingService.cancelBooking(bookingId, parentId);

      expect(result.status).toBe('cancelled');
      expect(bookingRepository.cancelBooking).toHaveBeenCalledWith(bookingId, parentId);
    });

    test('should throw 404 if booking does not exist', async () => {
      bookingRepository.findById.mockResolvedValue(null);

      await expect(bookingService.cancelBooking(bookingId, parentId))
        .rejects.toMatchObject({ statusCode: 404 });
    });

    test('should throw 404 if booking belongs to a different parent', async () => {
      bookingRepository.findById.mockResolvedValue({ id: bookingId, parent_id: 'other-parent', status: 'confirmed' });

      await expect(bookingService.cancelBooking(bookingId, parentId))
        .rejects.toMatchObject({ statusCode: 404 });
    });

    test('should throw 409 if booking is already cancelled', async () => {
      bookingRepository.findById.mockResolvedValue({ id: bookingId, parent_id: parentId, status: 'cancelled' });

      await expect(bookingService.cancelBooking(bookingId, parentId))
        .rejects.toMatchObject({ statusCode: 409, message: 'Booking is already cancelled' });
    });
  });
});
