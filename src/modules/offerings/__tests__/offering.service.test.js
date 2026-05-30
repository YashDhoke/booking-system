const offeringService = require('../offering.service');
const offeringRepository = require('../offering.repository');
const courseRepository = require('../../courses/course.repository');
const AppError = require('../../../utils/AppError');

jest.mock('../offering.repository');
jest.mock('../../courses/course.repository');

describe('offering.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createOffering', () => {
    const teacherId = '550e8400-e29b-41d4-a716-446655440001';
    const courseId = '550e8400-e29b-41d4-a716-446655440002';
    const validData = { course_id: courseId, title: 'Offering A', description: 'Desc' };
    const mockCourse = { id: courseId, teacher_id: teacherId, title: 'Math' };
    const mockOffering = { id: 'offering-id', ...validData, teacher_id: teacherId };

    test('should create an offering successfully', async () => {
      courseRepository.findById.mockResolvedValue(mockCourse);
      offeringRepository.create.mockResolvedValue(mockOffering);

      const result = await offeringService.createOffering(validData, teacherId);

      expect(result).toEqual(mockOffering);
      expect(courseRepository.findById).toHaveBeenCalledWith(courseId);
      expect(offeringRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        course_id: courseId,
        teacher_id: teacherId,
        title: 'Offering A',
      }));
    });

    test('should throw 404 if course does not exist', async () => {
      courseRepository.findById.mockResolvedValue(null);

      await expect(offeringService.createOffering(validData, teacherId))
        .rejects.toMatchObject({ statusCode: 404, message: 'Course not found' });
      expect(offeringRepository.create).not.toHaveBeenCalled();
    });

    test('should throw 403 if teacher does not own the course', async () => {
      courseRepository.findById.mockResolvedValue({ ...mockCourse, teacher_id: 'other-teacher-id' });

      await expect(offeringService.createOffering(validData, teacherId))
        .rejects.toMatchObject({ statusCode: 403 });
      expect(offeringRepository.create).not.toHaveBeenCalled();
    });

    test('should throw ZodError for invalid course_id (not a UUID)', async () => {
      await expect(offeringService.createOffering({ course_id: 'not-a-uuid', title: 'X' }, teacherId))
        .rejects.toThrow();
      expect(courseRepository.findById).not.toHaveBeenCalled();
    });

    test('should throw ZodError when title is missing', async () => {
      await expect(offeringService.createOffering({ course_id: courseId }, teacherId))
        .rejects.toThrow();
      expect(courseRepository.findById).not.toHaveBeenCalled();
    });
  });

  describe('getTeacherOfferings', () => {
    const teacherId = '550e8400-e29b-41d4-a716-446655440001';

    test('should return offerings with session_stats label', async () => {
      const mockOfferings = [
        { id: 'o1', title: 'Offering 1', upcoming_sessions_count: 3, total_sessions_count: 5 },
        { id: 'o2', title: 'Offering 2', upcoming_sessions_count: 0, total_sessions_count: 2 },
      ];
      offeringRepository.findByTeacherId.mockResolvedValue(mockOfferings);

      const result = await offeringService.getTeacherOfferings(teacherId);

      expect(result).toHaveLength(2);
      expect(result[0].session_stats).toBe('3 upcoming / 5 total');
      expect(result[1].session_stats).toBe('0 upcoming / 2 total');
    });

    test('should pass includeAll=false for default "upcoming" filter', async () => {
      offeringRepository.findByTeacherId.mockResolvedValue([]);

      await offeringService.getTeacherOfferings(teacherId, 'upcoming');

      expect(offeringRepository.findByTeacherId).toHaveBeenCalledWith(teacherId, false);
    });

    test('should pass includeAll=true for "all" filter', async () => {
      offeringRepository.findByTeacherId.mockResolvedValue([]);

      await offeringService.getTeacherOfferings(teacherId, 'all');

      expect(offeringRepository.findByTeacherId).toHaveBeenCalledWith(teacherId, true);
    });

    test('should return empty array when teacher has no offerings', async () => {
      offeringRepository.findByTeacherId.mockResolvedValue([]);

      const result = await offeringService.getTeacherOfferings(teacherId);

      expect(result).toEqual([]);
    });
  });

  describe('getAllOfferings', () => {
    const userTimezone = 'Asia/Kolkata';

    test('should filter out offerings with no sessions', async () => {
      const mockOfferings = [
        { id: 'o1', title: 'Has sessions', sessions: [{ id: 's1', offering_id: 'o1', start_time: '2025-06-07T12:30:00.000Z', end_time: '2025-06-07T13:30:00.000Z' }] },
        { id: 'o2', title: 'No sessions', sessions: [] },
        { id: 'o3', title: 'Null sessions', sessions: null },
      ];
      offeringRepository.findAllWithSessions.mockResolvedValue(mockOfferings);

      const result = await offeringService.getAllOfferings(userTimezone);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('o1');
    });

    test('should format sessions into the user timezone', async () => {
      const mockOfferings = [
        {
          id: 'o1',
          sessions: [{ id: 's1', offering_id: 'o1', start_time: '2025-06-07T12:30:00.000Z', end_time: '2025-06-07T13:30:00.000Z' }]
        }
      ];
      offeringRepository.findAllWithSessions.mockResolvedValue(mockOfferings);

      const result = await offeringService.getAllOfferings('Asia/Kolkata');

      expect(result[0].sessions[0].timezone).toBe('Asia/Kolkata');
      expect(result[0].sessions[0].start_time).toBe('2025-06-07 18:00:00');
    });

    test('should pass includeAll=false by default', async () => {
      offeringRepository.findAllWithSessions.mockResolvedValue([]);

      await offeringService.getAllOfferings(userTimezone);

      expect(offeringRepository.findAllWithSessions).toHaveBeenCalledWith(false);
    });

    test('should pass includeAll=true for "all" filter', async () => {
      offeringRepository.findAllWithSessions.mockResolvedValue([]);

      await offeringService.getAllOfferings(userTimezone, 'all');

      expect(offeringRepository.findAllWithSessions).toHaveBeenCalledWith(true);
    });
  });
});
