const { z } = require('zod');
const bookingRepository = require('./booking.repository');
const { getClient } = require('../../config/database');
const AppError = require('../../utils/AppError');
const { formatSessionForUser } = require('../../utils/timezone.util');

const bookOfferingSchema = z.object({
  offering_id: z.string().uuid('Invalid offering ID'),
});

const bookOffering = async (offeringId, parentId) => {
  // 1. Validate Input
  bookOfferingSchema.parse({ offering_id: offeringId });

  const { client, query, release } = await getClient();

  try {
    await query('BEGIN');

    // Step 1: Check if parent already booked this offering (Read inside transaction)
    const existingBooking = await bookingRepository.findBookingByParentAndOffering(parentId, offeringId);
    if (existingBooking && existingBooking.status === 'confirmed') {
      throw new AppError('You have already booked this offering', 409);
    }

    // Step 2: Lock parent's existing bookings (prevents concurrent conflict)
    const existingSessions = await bookingRepository.getParentBookedSessions(parentId, client);

    // Step 3: Get sessions of the offering being booked
    const newSessions = await bookingRepository.getOfferingSessions(offeringId, client);

    if (newSessions.length === 0) {
      throw new AppError('Offering not found or has no sessions available', 404);
    }

    // Step 4: Conflict detection logic
    for (const newSession of newSessions) {
      const newStart = new Date(newSession.start_time).getTime();
      const newEnd = new Date(newSession.end_time).getTime();

      for (const existingSession of existingSessions) {
        const existingStart = new Date(existingSession.start_time).getTime();
        const existingEnd = new Date(existingSession.end_time).getTime();

        // Check for overlap: (StartA < EndB) AND (EndA > StartB)
        if (newStart < existingEnd && newEnd > existingStart) {
          const dateLabel = new Date(newSession.start_time).toDateString();
          throw new AppError(`Booking conflict: A session on ${dateLabel} overlaps with your existing bookings`, 409);
        }
      }
    }

    // Step 5: If no conflicts, create the booking
    const booking = await bookingRepository.createBooking({ 
      parent_id: parentId, 
      offering_id: offeringId 
    }, client);

    await query('COMMIT');
    return booking;

  } catch (error) {
    await query('ROLLBACK');
    throw error;
  } finally {
    release();
  }
};

const getParentBookings = async (parentId, userTimezone) => {
  const bookings = await bookingRepository.findParentBookings(parentId);
  
  // Format sessions for each booking according to parent's timezone
  return bookings.map(booking => ({
    ...booking,
    sessions: booking.sessions.map(session => formatSessionForUser(session, userTimezone))
  }));
};

const cancelBooking = async (bookingId, parentId) => {
  const booking = await bookingRepository.findById(bookingId);

  if (!booking || booking.parent_id !== parentId) {
    throw new AppError('Booking not found', 404);
  }

  if (booking.status === 'cancelled') {
    throw new AppError('Booking is already cancelled', 409);
  }

  return await bookingRepository.cancelBooking(bookingId, parentId);
};

module.exports = {
  bookOffering,
  getParentBookings,
  cancelBooking,
};
