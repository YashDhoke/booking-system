const errorHandler = require('../error.middleware');
const AppError = require('../../utils/AppError');

// Silence logger during tests
jest.mock('../../utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  http: jest.fn(),
}));

describe('error.middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { method: 'GET', originalUrl: '/test' };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('in development mode', () => {
    const originalEnv = process.env.NODE_ENV;

    beforeAll(() => { process.env.NODE_ENV = 'development'; });
    afterAll(() => { process.env.NODE_ENV = originalEnv; });

    test('should include stack trace in dev mode for AppError', () => {
      const err = new AppError('Test error', 400);
      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      const jsonCall = res.json.mock.calls[0][0];
      
      // Ensure stack exists and object matches structure
      expect(jsonCall).toHaveProperty('stack');
      expect(jsonCall.message).toBe('Test error');
    });
  });

  describe('in production mode', () => {
    const originalEnv = process.env.NODE_ENV;

    beforeAll(() => { process.env.NODE_ENV = 'production'; });
    afterAll(() => { process.env.NODE_ENV = originalEnv; });

    test('should handle operational AppError and return correct status/message', () => {
      const err = new AppError('Not found', 404);
      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Not found',
      }));
    });

    test('should return 500 for non-operational errors', () => {
      const err = new Error('Something unexpected');
      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Something went very wrong!',
      }));
    });

    test('should handle ZodError and return 400 with field-level errors', () => {
      const zodErr = {
        name: 'ZodError',
        issues: [
          { path: ['email'], message: 'Invalid email format' },
          { path: ['password'], message: 'Password too short' },
        ],
      };
      errorHandler(zodErr, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      const jsonCall = res.json.mock.calls[0][0];
      expect(jsonCall.success).toBe(false);
      expect(jsonCall.errors).toEqual(
        expect.arrayContaining([
          { field: 'email', message: 'Invalid email format' },
          { field: 'password', message: 'Password too short' },
        ])
      );
    });

    test('should handle PostgreSQL unique violation (code 23505) as 409', () => {
      const pgErr = { code: '23505' };
      errorHandler(pgErr, req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Resource already exists',
      }));
    });

    test('should handle PostgreSQL foreign key violation (code 23503) as 404', () => {
      const pgErr = { code: '23503' };
      errorHandler(pgErr, req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Related resource not found',
      }));
    });
  });
});