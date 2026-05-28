const offeringService = require('./offering.service');
const { sendSuccess } = require('../../utils/response.util');

const createOffering = async (req, res, next) => {
  try {
    const offering = await offeringService.createOffering(req.body, req.user.id);
    sendSuccess(res, offering, 'Offering created successfully', 201);
  } catch (error) {
    next(error);
  }
};

const getMyOfferings = async (req, res, next) => {
  try {
    const offerings = await offeringService.getTeacherOfferings(req.user.id);
    sendSuccess(res, offerings, 'Offerings retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const getAllOfferings = async (req, res, next) => {
  try {
    // req.user contains the parent's timezone from their JWT
    const offerings = await offeringService.getAllOfferings(req.user.timezone);
    sendSuccess(res, offerings, 'All offerings retrieved successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOffering,
  getMyOfferings,
  getAllOfferings,
};
