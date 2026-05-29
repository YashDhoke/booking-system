const { convertToUTC, convertFromUTC, isValidTimezone } = require('../timezone.util');

describe('timezone.util', () => {
  describe('convertToUTC', () => {
    test('should convert Asia/Kolkata time to UTC correctly', () => {
      const result = convertToUTC('2025-06-07 18:00', 'Asia/Kolkata');
      expect(result).toBe('2025-06-07T12:30:00.000Z');
    });

    test('should convert America/New_York time to UTC correctly', () => {
      const result = convertToUTC('2025-06-07 18:00', 'America/New_York');
      expect(result).toBe('2025-06-07T22:00:00.000Z');
    });

    test('should convert UTC time to UTC correctly', () => {
      const result = convertToUTC('2025-06-07 18:00', 'UTC');
      expect(result).toBe('2025-06-07T18:00:00.000Z');
    });
  });

  describe('convertFromUTC', () => {
    test('should convert UTC to Asia/Kolkata correctly', () => {
      const result = convertFromUTC('2025-06-07T12:30:00.000Z', 'Asia/Kolkata');
      expect(result).toBe('2025-06-07 18:00:00');
    });

    test('should convert UTC to America/New_York correctly', () => {
      const result = convertFromUTC('2025-06-07T12:30:00.000Z', 'America/New_York');
      expect(result).toBe('2025-06-07 08:30:00');
    });
  });

  describe('isValidTimezone', () => {
    test('should return true for valid IANA timezones', () => {
      expect(isValidTimezone('Asia/Kolkata')).toBe(true);
      expect(isValidTimezone('America/New_York')).toBe(true);
    });

    test('should return false for invalid timezones', () => {
      expect(isValidTimezone('Invalid/Zone')).toBe(false);
      expect(isValidTimezone('randomstring')).toBe(false);
      expect(isValidTimezone('')).toBe(false);
    });
  });
});
