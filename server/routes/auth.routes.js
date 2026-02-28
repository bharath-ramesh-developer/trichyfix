const router = require('express').Router();
const auth = require('../controllers/auth.controller');
const { authenticateToken } = require('../middleware/auth');

const multer = require('multer');

// Configure multer for memory buffer (so we can pass directly to Supabase S3)
const upload = multer({ storage: multer.memoryStorage() });

router.post('/send-otp', auth.sendOTP);
router.post('/verify-otp', auth.verifyOTP);
router.post('/register/customer', auth.registerCustomer);
router.post('/register/provider', upload.fields([
    { name: 'profilePhoto', maxCount: 1 },
    { name: 'idProof', maxCount: 1 }
]), auth.registerProvider);
router.post('/login', auth.login);
router.post('/login/otp', auth.loginWithOTP);
router.post('/refresh', auth.refreshToken);
router.post('/reset-password', auth.resetPassword);
router.get('/profile', authenticateToken, auth.getProfile);

module.exports = router;
