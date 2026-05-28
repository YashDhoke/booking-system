const courseService = require('./course.service');
const { sendSuccess } = require('../../utils/response.util');

const createCourse = async (req, res, next) => {
  try {
    const course = await courseService.createCourse(req.body, req.user.id);
    sendSuccess(res, course, 'Course created successfully', 201);
  } catch (error) {
    next(error);
  }
};

const getMyCourses = async (req, res, next) => {
  try {
    const courses = await courseService.getTeacherCourses(req.user.id);
    sendSuccess(res, courses, 'Courses retrieved successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCourse,
  getMyCourses,
};
