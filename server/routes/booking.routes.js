const router = require('express').Router();
const booking = require('../controllers/booking.controller');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

router.post('/', authenticateToken, authorizeRole('customer'), booking.createBooking);
router.get('/customer', authenticateToken, authorizeRole('customer'), booking.getCustomerBookings);
router.get('/provider', authenticateToken, authorizeRole('provider'), booking.getProviderBookings);
router.patch('/:id/status', authenticateToken, booking.updateBookingStatus);
router.post('/:id/rate', authenticateToken, authorizeRole('customer'), booking.rateBooking);

module.exports = router;
