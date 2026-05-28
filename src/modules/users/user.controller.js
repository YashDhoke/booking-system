const userService = require('./user.service');
const { sendSuccess } = require('../../utils/response.util');

const register = async (req, res, next) => {
  try {
    const user = await userService.register(req.body);
    sendSuccess(res, user, 'User registered successfully', 201);
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const result = await userService.login(req.body);
    sendSuccess(res, result, 'Login successful', 200);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
};
