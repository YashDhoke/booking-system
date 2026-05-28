const express = require('express');
const bookingController = require('./booking.controller');
const auth = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/role.middleware');

const router = express.Router();

router.use(auth);
router.use(requireRole('parent'));

router.post('/', bookingController.bookOffering);
router.get('/mine', bookingController.getMyBookings);
router.patch('/:bookingId/cancel', bookingController.cancelBooking);

module.exports = router;
