const express = require('express');
const sessionController = require('./session.controller');
const auth = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/role.middleware');

const router = express.Router({ mergeParams: true });

router.use(auth);

// Teacher creates sessions
router.post('/', requireRole('teacher'), sessionController.addSessions);

// Both can view sessions
router.get('/', sessionController.getSessions);

module.exports = router;
