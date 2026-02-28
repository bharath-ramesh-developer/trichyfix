const router = require('express').Router();
const admin = require('../controllers/admin.controller');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// All admin routes require authentication and 'admin' role
router.use(authenticateToken);
router.use(authorizeRole('admin'));

router.get('/stats', admin.getStats);
router.get('/users', admin.getAllUsers);
router.get('/bookings', admin.getAllBookings);
router.get('/providers', admin.getAllProviders);
router.patch('/providers/:id/status', admin.updateProviderStatus);

module.exports = router;
