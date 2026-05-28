const { z } = require('zod');
const sessionRepository = require('./session.repository');
const offeringRepository = require('../offerings/offering.repository');
const AppError = require('../../utils/AppError');
const { convertToUTC, formatSessionForUser } = require('../../utils/timezone.util');

const sessionInputSchema = z.object({
  start_time: z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/, 'Format must be YYYY-MM-DD HH:mm'),
  end_time: z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/, 'Format must be YYYY-MM-DD HH:mm'),
});

const sessionsArraySchema = z.array(sessionInputSchema).min(1, 'At least one session is required');

const addSessions = async (offeringId, sessionsData, teacher) => {
  // 1. Validate Input
  const validatedSessions = sessionsArraySchema.parse(sessionsData);

  // 2. Verify Offering belongs to teacher
  const offering = await offeringRepository.findById(offeringId);
  if (!offering) {
    throw new AppError('Offering not found', 404);
  }
  if (offering.teacher_id !== teacher.id) {
    throw new AppError('You do not have permission to add sessions to this offering', 403);
  }

  // 3. Convert times to UTC and validate
  const sessionsToCreate = [];
  
  for (const session of validatedSessions) {
    const startUTC = convertToUTC(session.start_time, teacher.timezone);
    const endUTC = convertToUTC(session.end_time, teacher.timezone);

    const startTime = new Date(startUTC).getTime();
    const endTime = new Date(endUTC).getTime();

    // Check if in the past
    if (startTime < Date.now()) {
      throw new AppError(`Cannot add sessions in the past: ${session.start_time}`, 400);
    }

    if (endTime <= startTime) {
      throw new AppError(`Invalid time range: End time must be after start time for session starting at ${session.start_time}`, 400);
    }

    // Check for internal overlaps in the same request
    for (const existing of sessionsToCreate) {
      const eStart = new Date(existing.start_time).getTime();
      const eEnd = new Date(existing.end_time).getTime();

      if (startTime < eEnd && endTime > eStart) {
        throw new AppError(`Sessions within the same request cannot overlap each other: ${session.start_time} conflicts with another session in this request.`, 400);
      }
    }

    sessionsToCreate.push({
      offering_id: offeringId,
      teacher_id: teacher.id,
      start_time: startUTC,
      end_time: endUTC
    });
  }

  // 4. Bulk Create
  return await sessionRepository.bulkCreate(sessionsToCreate);
};

const getOfferingSessions = async (offeringId, userTimezone, filter = 'upcoming') => {
  const includeAll = filter === 'all';
  const sessions = await sessionRepository.findByOfferingId(offeringId, includeAll);
  return sessions.map(session => formatSessionForUser(session, userTimezone));
};

module.exports = {
  addSessions,
  getOfferingSessions,
};
