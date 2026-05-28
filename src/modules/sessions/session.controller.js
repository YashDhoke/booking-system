const sessionService = require('./session.service');
const { sendSuccess } = require('../../utils/response.util');

const addSessions = async (req, res, next) => {
  try {
    const { offeringId } = req.params;
    const sessions = await sessionService.addSessions(offeringId, req.body, req.user);
    sendSuccess(res, sessions, 'Sessions added successfully', 201);
  } catch (error) {
    next(error);
  }
};

const getSessions = async (req, res, next) => {
  try {
    const { offeringId } = req.params;
    // We always use req.user.timezone from the JWT
    // If teacher: it shows in their timezone
    // If parent: it shows in their timezone
    const sessions = await sessionService.getOfferingSessions(offeringId, req.user.timezone);
    sendSuccess(res, sessions, 'Sessions retrieved successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addSessions,
  getSessions,
};
