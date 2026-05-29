const offeringService = require('./offering.service');
const { sendSuccess } = require('../../utils/response.util');
const catchAsync = require('../../utils/catchAsync');

const createOffering = catchAsync(async (req, res) => {
  const offering = await offeringService.createOffering(req.body, req.user.id);
  sendSuccess(res, offering, 'Offering created successfully', 201);
});

const getMyOfferings = catchAsync(async (req, res) => {
  const { filter } = req.query;
  const offerings = await offeringService.getTeacherOfferings(req.user.id, filter);
  sendSuccess(res, offerings, 'Offerings retrieved successfully');
});

const getAllOfferings = catchAsync(async (req, res) => {
  const { filter } = req.query;
  // req.user contains the parent's timezone from their JWT
  const offerings = await offeringService.getAllOfferings(req.user.timezone, filter);
  sendSuccess(res, offerings, 'All offerings retrieved successfully');
});

module.exports = {
  createOffering,
  getMyOfferings,
  getAllOfferings,
};

