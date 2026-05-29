const sessionService = require('./session.service');
const { sendSuccess } = require('../../utils/response.util');
const catchAsync = require('../../utils/catchAsync');

const addSessions = catchAsync(async (req, res) => {
  const { offeringId } = req.params;
  const sessions = await sessionService.addSessions(offeringId, req.body, req.user);
  sendSuccess(res, sessions, 'Sessions added successfully', 201);
});

const getSessions = catchAsync(async (req, res) => {
  const { offeringId } = req.params;
  const { filter } = req.query;
  // We always use req.user.timezone from the JWT
  // If teacher: it shows in their timezone
  // If parent: it shows in their timezone
  const sessions = await sessionService.getOfferingSessions(offeringId, req.user.timezone, filter);
  sendSuccess(res, sessions, 'Sessions retrieved successfully');
});

module.exports = {
  addSessions,
  getSessions,
};

