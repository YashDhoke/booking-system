const { bookOffering } = require('../booking.service');
const bookingRepository = require('../booking.repository');
const { getClient, query } = require('../../../config/database');
const AppError = require('../../../utils/AppError');

// Mock dependencies
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
      // Setup
      bookingRepository.findBookingByParentAndOffering.mockResolvedValue(null);
      bookingRepository.getParentBookedSessions.mockResolvedValue([
        { start_time: "2025-06-07T10:00:00Z", end_time: "2025-06-07T11:00:00Z" }
      ]);
      bookingRepository.getOfferingSessions.mockResolvedValue([
        { start_time: "2025-06-07T12:00:00Z", end_time: "2025-06-07T13:00:00Z" }
      ]);
      bookingRepository.createBooking.mockResolvedValue({ id: '660e8400-e29b-41d4-a716-446655440002' });

      // Execute
      const result = await bookOffering(offeringId, parentId);

      // Verify
      expect(result.id).toBe('660e8400-e29b-41d4-a716-446655440002');
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    test('should throw 409 when there is a direct overlap', async () => {
      // Setup
      bookingRepository.findBookingByParentAndOffering.mockResolvedValue(null);
      bookingRepository.getParentBookedSessions.mockResolvedValue([
        { start_time: "2025-06-07T10:00:00Z", end_time: "2025-06-07T11:00:00Z" }
      ]);
      bookingRepository.getOfferingSessions.mockResolvedValue([
        { start_time: "2025-06-07T10:30:00Z", end_time: "2025-06-07T11:30:00Z" }
      ]);

      // Execute & Verify
      await expect(bookOffering(offeringId, parentId)).rejects.toThrow(AppError);
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    test('should succeed when sessions are exactly back-to-back', async () => {
      // Setup
      bookingRepository.findBookingByParentAndOffering.mockResolvedValue(null);
      bookingRepository.getParentBookedSessions.mockResolvedValue([
        { start_time: "2025-06-07T10:00:00Z", end_time: "2025-06-07T11:00:00Z" }
      ]);
      bookingRepository.getOfferingSessions.mockResolvedValue([
        { start_time: "2025-06-07T11:00:00Z", end_time: "2025-06-07T12:00:00Z" }
      ]);
      bookingRepository.createBooking.mockResolvedValue({ id: '660e8400-e29b-41d4-a716-446655440002' });

      // Execute
      await bookOffering(offeringId, parentId);

      // Verify
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    test('should throw 409 if offering is already booked by the parent', async () => {
      // Setup
      bookingRepository.findBookingByParentAndOffering.mockResolvedValue({ id: '660e8400-e29b-41d4-a716-446655440002', status: 'confirmed' });

      // Execute & Verify
      await expect(bookOffering(offeringId, parentId)).rejects.toThrow('already booked');
    });

    test('should throw 422 if offering has no sessions', async () => {
      // Setup
      bookingRepository.findBookingByParentAndOffering.mockResolvedValue(null);
      bookingRepository.getParentBookedSessions.mockResolvedValue([]);
      bookingRepository.getOfferingSessions.mockResolvedValue([]);

      // Execute & Verify
      await expect(bookOffering(offeringId, parentId)).rejects.toMatchObject({ statusCode: 422 });
    });
  });
});
