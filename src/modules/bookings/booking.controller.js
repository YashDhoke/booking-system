const bookingService = require('./booking.service');
const { sendSuccess } = require('../../utils/response.util');

const bookOffering = async (req, res, next) => {
  try {
    const { offering_id } = req.body;
    const booking = await bookingService.bookOffering(offering_id, req.user.id);
    sendSuccess(res, booking, 'Offering booked successfully', 201);
  } catch (error) {
    next(error);
  }
};

const getMyBookings = async (req, res, next) => {
  try {
    const bookings = await bookingService.getParentBookings(req.user.id, req.user.timezone);
    sendSuccess(res, bookings, 'Bookings retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const cancelBooking = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const booking = await bookingService.cancelBooking(bookingId, req.user.id);
    sendSuccess(res, booking, 'Booking cancelled successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  bookOffering,
  getMyBookings,
  cancelBooking,
};
