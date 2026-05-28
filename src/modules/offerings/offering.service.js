const { z } = require('zod');
const offeringRepository = require('./offering.repository');
const courseRepository = require('../courses/course.repository');
const AppError = require('../../utils/AppError');
const { formatSessionForUser } = require('../../utils/timezone.util');

const offeringSchema = z.object({
  course_id: z.string().uuid('Invalid course ID'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
});

const createOffering = async (offeringData, teacherId) => {
  const validatedData = offeringSchema.parse(offeringData);

  // Verify course belongs to teacher
  const course = await courseRepository.findById(validatedData.course_id);
  if (!course) {
    throw new AppError('Course not found', 404);
  }
  if (course.teacher_id !== teacherId) {
    throw new AppError('You do not have permission to create an offering for this course', 403);
  }

  return await offeringRepository.create({
    ...validatedData,
    teacher_id: teacherId,
  });
};

const getTeacherOfferings = async (teacherId) => {
  return await offeringRepository.findByTeacherId(teacherId);
};

const getAllOfferings = async (userTimezone) => {
  const offerings = await offeringRepository.findAllWithSessions();
  
  // Convert session times to user's timezone
  return offerings.map(offering => ({
    ...offering,
    sessions: offering.sessions.map(session => formatSessionForUser(session, userTimezone))
  }));
};

module.exports = {
  createOffering,
  getTeacherOfferings,
  getAllOfferings,
};
