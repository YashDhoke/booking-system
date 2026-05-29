const userService = require('./user.service');
const { sendSuccess } = require('../../utils/response.util');
const catchAsync = require('../../utils/catchAsync');

const register = catchAsync(async (req, res) => {
  const user = await userService.register(req.body);
  sendSuccess(res, user, 'User registered successfully', 201);
});

const login = catchAsync(async (req, res) => {
  const result = await userService.login(req.body);
  sendSuccess(res, result, 'Login successful', 200);
});

module.exports = {
  register,
  login,
};

