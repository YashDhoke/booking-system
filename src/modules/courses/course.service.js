const { z } = require('zod');
const courseRepository = require('./course.repository');
const AppError = require('../../utils/AppError');

const courseSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
});

const createCourse = async (courseData, teacherId) => {
  const validatedData = courseSchema.parse(courseData);
  return await courseRepository.create({
    ...validatedData,
    teacher_id: teacherId,
  });
};

const getTeacherCourses = async (teacherId) => {
  return await courseRepository.findByTeacherId(teacherId);
};

module.exports = {
  createCourse,
  getTeacherCourses,
};
