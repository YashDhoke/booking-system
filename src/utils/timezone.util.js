const { DateTime, IANAZone } = require('luxon');

/**
 * Converts a localized datetime string to UTC ISO string
 * @param {string} dateTimeString - e.g. "2025-06-07 18:00"
 * @param {string} fromTimezone - e.g. "Asia/Kolkata"
 * @returns {string} - UTC ISO string
 */
const convertToUTC = (dateTimeString, fromTimezone) => {
  return DateTime.fromFormat(dateTimeString, 'yyyy-MM-dd HH:mm', { zone: fromTimezone })
    .toUTC()
    .toISO();
};

/**
 * Converts a UTC string to a localized datetime string
 * @param {string} utcDateTimeString - UTC ISO string
 * @param {string} toTimezone - e.g. "Asia/Kolkata"
 * @returns {string} - Formatted as "yyyy-MM-dd HH:mm:ss"
 */
const convertFromUTC = (utcDateTimeString, toTimezone) => {
  return DateTime.fromISO(utcDateTimeString)
    .setZone(toTimezone)
    .toFormat('yyyy-MM-dd HH:mm:ss');
};

/**
 * Validates if the string is a valid IANA timezone
 * @param {string} timezone 
 * @returns {boolean}
 */
const isValidTimezone = (timezone) => {
  return IANAZone.isValidZone(timezone);
};

/**
 * Formats session times for a specific user timezone
 * @param {Object} session - { start_time, end_time }
 * @param {string} userTimezone 
 * @returns {Object}
 */
const formatSessionForUser = (session, userTimezone) => {
  return {
    ...session,
    start_time: convertFromUTC(session.start_time, userTimezone),
    end_time: convertFromUTC(session.end_time, userTimezone),
    timezone_label: userTimezone
  };
};

module.exports = {
  convertToUTC,
  convertFromUTC,
  isValidTimezone,
  formatSessionForUser,
};
