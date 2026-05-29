const bookingService = require('./booking.service');
const { sendSuccess } = require('../../utils/response.util');
const catchAsync = require('../../utils/catchAsync');

const bookOffering = catchAsync(async (req, res) => {
  const { offering_id } = req.body;
  const booking = await bookingService.bookOffering(offering_id, req.user.id);
  sendSuccess(res, booking, 'Offering booked successfully', 201);
});

const getMyBookings = catchAsync(async (req, res) => {
  const bookings = await bookingService.getParentBookings(req.user.id, req.user.timezone);
  sendSuccess(res, bookings, 'Bookings retrieved successfully');
});

const cancelBooking = catchAsync(async (req, res) => {
  const { bookingId } = req.params;
  const booking = await bookingService.cancelBooking(bookingId, req.user.id);
  sendSuccess(res, booking, 'Booking cancelled successfully');
});

module.exports = {
  bookOffering,
  getMyBookings,
  cancelBooking,
};

