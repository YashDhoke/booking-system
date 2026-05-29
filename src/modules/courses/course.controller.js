const courseService = require('./course.service');
const { sendSuccess } = require('../../utils/response.util');
const catchAsync = require('../../utils/catchAsync');

const createCourse = catchAsync(async (req, res) => {
  const course = await courseService.createCourse(req.body, req.user.id);
  sendSuccess(res, course, 'Course created successfully', 201);
});

const getMyCourses = catchAsync(async (req, res) => {
  const courses = await courseService.getTeacherCourses(req.user.id);
  sendSuccess(res, courses, 'Courses retrieved successfully');
});

module.exports = {
  createCourse,
  getMyCourses,
};

