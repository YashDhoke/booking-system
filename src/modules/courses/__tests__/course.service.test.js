const courseService = require('../course.service');
const courseRepository = require('../course.repository');
const AppError = require('../../../utils/AppError');

jest.mock('../course.repository');

describe('course.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createCourse', () => {
    const teacherId = '550e8400-e29b-41d4-a716-446655440000';
    const validData = { title: 'Mathematics 101', description: 'Intro to math' };

    test('should create a course successfully', async () => {
      const mockCourse = { id: 'course-id', title: 'Mathematics 101', description: 'Intro to math', teacher_id: teacherId };
      courseRepository.create.mockResolvedValue(mockCourse);

      const result = await courseService.createCourse(validData, teacherId);

      expect(result).toEqual(mockCourse);
      expect(courseRepository.create).toHaveBeenCalledWith({
        title: 'Mathematics 101',
        description: 'Intro to math',
        teacher_id: teacherId,
      });
    });

    test('should create a course without description', async () => {
      const mockCourse = { id: 'course-id', title: 'Math', description: undefined, teacher_id: teacherId };
      courseRepository.create.mockResolvedValue(mockCourse);

      const result = await courseService.createCourse({ title: 'Math' }, teacherId);

      expect(result).toEqual(mockCourse);
      expect(courseRepository.create).toHaveBeenCalledWith(expect.objectContaining({ title: 'Math', teacher_id: teacherId }));
    });

    test('should throw ZodError when title is missing', async () => {
      await expect(courseService.createCourse({ description: 'No title' }, teacherId))
        .rejects.toThrow();
      expect(courseRepository.create).not.toHaveBeenCalled();
    });

    test('should throw ZodError when title is empty string', async () => {
      await expect(courseService.createCourse({ title: '' }, teacherId))
        .rejects.toThrow();
      expect(courseRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('getTeacherCourses', () => {
    const teacherId = '550e8400-e29b-41d4-a716-446655440000';

    test('should return list of courses for a teacher', async () => {
      const mockCourses = [
        { id: 'c1', title: 'Math', teacher_id: teacherId },
        { id: 'c2', title: 'Science', teacher_id: teacherId },
      ];
      courseRepository.findByTeacherId.mockResolvedValue(mockCourses);

      const result = await courseService.getTeacherCourses(teacherId);

      expect(result).toEqual(mockCourses);
      expect(courseRepository.findByTeacherId).toHaveBeenCalledWith(teacherId);
    });

    test('should return empty array when teacher has no courses', async () => {
      courseRepository.findByTeacherId.mockResolvedValue([]);

      const result = await courseService.getTeacherCourses(teacherId);

      expect(result).toEqual([]);
    });
  });
});
