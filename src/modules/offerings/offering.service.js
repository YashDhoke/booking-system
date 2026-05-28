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

const getTeacherOfferings = async (teacherId, filter = 'upcoming') => {
  const includeAll = filter === 'all';
  const offerings = await offeringRepository.findByTeacherId(teacherId, includeAll);
  
  return offerings.map(offering => ({
    ...offering,
    // Add custom label as requested
    session_stats: `${offering.upcoming_sessions_count} upcoming / ${offering.total_sessions_count} total`
  }));
};

const getAllOfferings = async (userTimezone, filter = 'upcoming') => {
  const includeAll = filter === 'all';
  const offerings = await offeringRepository.findAllWithSessions(includeAll);
  
  // Filter out offerings with no sessions
  const validOfferings = offerings.filter(o => o.sessions && o.sessions.length > 0);

  // Convert session times to user's timezone
  return validOfferings.map(offering => ({
    ...offering,
    sessions: offering.sessions.map(session => formatSessionForUser(session, userTimezone))
  }));
};

module.exports = {
  createOffering,
  getTeacherOfferings,
  getAllOfferings,
};
