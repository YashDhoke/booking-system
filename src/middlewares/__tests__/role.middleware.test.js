const { requireRole } = require('../role.middleware');
const AppError = require('../../utils/AppError');

describe('role.middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {};
    next = jest.fn();
  });

  test('should call next() when user has the required role', () => {
    req.user = { id: 'user-id', role: 'teacher' };
    const middleware = requireRole('teacher');

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(); // no error
  });

  test('should call next() when user has one of the allowed roles (multi-role)', () => {
    req.user = { id: 'user-id', role: 'parent' };
    const middleware = requireRole('teacher', 'parent');

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  test('should call next with 403 AppError when user has wrong role', () => {
    req.user = { id: 'user-id', role: 'parent' };
    const middleware = requireRole('teacher');

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect(next.mock.calls[0][0].statusCode).toBe(403);
    expect(next.mock.calls[0][0].message).toMatch(/permission/i);
  });

  test('should call next with 403 AppError when req.user is missing', () => {
    req.user = undefined;
    const middleware = requireRole('teacher');

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect(next.mock.calls[0][0].statusCode).toBe(403);
  });

  test('should return a function (middleware factory)', () => {
    const middleware = requireRole('teacher');
    expect(typeof middleware).toBe('function');
  });
});
