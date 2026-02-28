const router = require('express').Router();
const provider = require('../controllers/provider.controller');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

router.get('/', provider.getProviders);
router.get('/categories', provider.getCategories);
router.get('/areas', provider.getAreas);
router.get('/dashboard', authenticateToken, authorizeRole('provider'), provider.getDashboard);
router.get('/:id', provider.getProviderById);

module.exports = router;
