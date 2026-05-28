const express = require('express');
const offeringController = require('./offering.controller');
const auth = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/role.middleware');

const router = express.Router();

// Teacher routes
router.post('/', auth, requireRole('teacher'), offeringController.createOffering);
router.get('/mine', auth, requireRole('teacher'), offeringController.getMyOfferings);

// Parent routes
router.get('/', auth, requireRole('parent'), offeringController.getAllOfferings);

module.exports = router;
