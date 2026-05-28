const express = require('express');
const courseController = require('./course.controller');
const auth = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/role.middleware');

const router = express.Router();

router.use(auth);
router.use(requireRole('teacher'));

router.post('/', courseController.createCourse);
router.get('/mine', courseController.getMyCourses);

module.exports = router;
