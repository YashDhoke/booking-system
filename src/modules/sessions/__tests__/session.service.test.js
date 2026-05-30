const sessionService = require('../session.service');
const sessionRepository = require('../session.repository');
const offeringRepository = require('../../offerings/offering.repository');
const AppError = require('../../../utils/AppError');

jest.mock('../session.repository');
jest.mock('../../offerings/offering.repository');

// Use a fixed "now" so past-session checks are deterministic
const FUTURE = '2099-01-01 10:00';
const FUTURE_END = '2099-01-01 11:00';
const FUTURE_2 = '2099-01-01 12:00';
const FUTURE_2_END = '2099-01-01 13:00';

describe('session.service', () => {
  const teacher = { id: 'teacher-id', timezone: 'UTC' };
  const offeringId = '550e8400-e29b-41d4-a716-446655440010';
  const mockOffering = { id: offeringId, teacher_id: teacher.id };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addSessions', () => {
    test('should add a single valid future session', async () => {
      offeringRepository.findById.mockResolvedValue(mockOffering);
      const mockSessions = [
        { id: 's1', offering_id: offeringId, teacher_id: teacher.id, start_time: new Date(FUTURE).toISOString(), end_time: new Date(FUTURE_END).toISOString() }
      ];
      sessionRepository.bulkCreate.mockResolvedValue(mockSessions);

      const result = await sessionService.addSessions(offeringId, [{ start_time: FUTURE, end_time: FUTURE_END }], teacher);

      expect(result).toEqual(mockSessions);
      expect(sessionRepository.bulkCreate).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ offering_id: offeringId, teacher_id: teacher.id })])
      );
    });

    test('should bulk add multiple valid non-overlapping sessions', async () => {
      offeringRepository.findById.mockResolvedValue(mockOffering);
      sessionRepository.bulkCreate.mockResolvedValue([{ id: 's1' }, { id: 's2' }]);

      const result = await sessionService.addSessions(
        offeringId,
        [
          { start_time: FUTURE, end_time: FUTURE_END },
          { start_time: FUTURE_2, end_time: FUTURE_2_END },
        ],
        teacher
      );

      expect(sessionRepository.bulkCreate).toHaveBeenCalledWith(expect.any(Array));
      expect(result).toHaveLength(2);
    });

    test('should throw 404 if offering is not found', async () => {
      offeringRepository.findById.mockResolvedValue(null);

      await expect(
        sessionService.addSessions(offeringId, [{ start_time: FUTURE, end_time: FUTURE_END }], teacher)
      ).rejects.toMatchObject({ statusCode: 404, message: 'Offering not found' });
    });

    test('should throw 403 if teacher does not own the offering', async () => {
      offeringRepository.findById.mockResolvedValue({ ...mockOffering, teacher_id: 'other-teacher' });

      await expect(
        sessionService.addSessions(offeringId, [{ start_time: FUTURE, end_time: FUTURE_END }], teacher)
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    test('should throw 400 if session is in the past', async () => {
      offeringRepository.findById.mockResolvedValue(mockOffering);

      await expect(
        sessionService.addSessions(offeringId, [{ start_time: '2020-01-01 10:00', end_time: '2020-01-01 11:00' }], teacher)
      ).rejects.toMatchObject({ statusCode: 400, message: expect.stringContaining('past') });
    });

    test('should throw 400 if end_time is before start_time', async () => {
      offeringRepository.findById.mockResolvedValue(mockOffering);

      await expect(
        sessionService.addSessions(offeringId, [{ start_time: FUTURE_END, end_time: FUTURE }], teacher)
      ).rejects.toMatchObject({ statusCode: 400, message: expect.stringContaining('End time') });
    });

    test('should throw 400 if two sessions in the same request overlap', async () => {
      offeringRepository.findById.mockResolvedValue(mockOffering);

      await expect(
        sessionService.addSessions(
          offeringId,
          [
            { start_time: '2099-01-01 10:00', end_time: '2099-01-01 12:00' },
            { start_time: '2099-01-01 11:00', end_time: '2099-01-01 13:00' }, // overlaps
          ],
          teacher
        )
      ).rejects.toMatchObject({ statusCode: 400, message: expect.stringContaining('overlap') });
    });

    test('should throw ZodError for invalid time format', async () => {
      offeringRepository.findById.mockResolvedValue(mockOffering);

      await expect(
        sessionService.addSessions(offeringId, [{ start_time: '2099/01/01', end_time: '2099/01/01' }], teacher)
      ).rejects.toThrow();
    });

    test('should throw ZodError for empty sessions array', async () => {
      offeringRepository.findById.mockResolvedValue(mockOffering);

      await expect(sessionService.addSessions(offeringId, [], teacher)).rejects.toThrow();
    });
  });

  describe('getOfferingSessions', () => {
    test('should return sessions formatted in user timezone', async () => {
      const rawSessions = [
        {
          id: 's1',
          offering_id: offeringId,
          start_time: '2025-06-07T12:30:00.000Z',
          end_time: '2025-06-07T13:30:00.000Z',
        }
      ];
      sessionRepository.findByOfferingId.mockResolvedValue(rawSessions);

      const result = await sessionService.getOfferingSessions(offeringId, 'Asia/Kolkata');

      expect(result).toHaveLength(1);
      expect(result[0].timezone).toBe('Asia/Kolkata');
      expect(result[0].start_time).toBe('2025-06-07 18:00:00');
      expect(result[0].start_time_utc).toBe('2025-06-07T12:30:00.000Z');
    });

    test('should call findByOfferingId with includeAll=false for default filter', async () => {
      sessionRepository.findByOfferingId.mockResolvedValue([]);

      await sessionService.getOfferingSessions(offeringId, 'UTC', 'upcoming');

      expect(sessionRepository.findByOfferingId).toHaveBeenCalledWith(offeringId, false);
    });

    test('should call findByOfferingId with includeAll=true for "all" filter', async () => {
      sessionRepository.findByOfferingId.mockResolvedValue([]);

      await sessionService.getOfferingSessions(offeringId, 'UTC', 'all');

      expect(sessionRepository.findByOfferingId).toHaveBeenCalledWith(offeringId, true);
    });

    test('should return empty array when no sessions exist', async () => {
      sessionRepository.findByOfferingId.mockResolvedValue([]);

      const result = await sessionService.getOfferingSessions(offeringId, 'UTC');

      expect(result).toEqual([]);
    });
  });
});
