const jwt = require('jsonwebtoken');
const auth = require('../auth.middleware');
const AppError = require('../../utils/AppError');

jest.mock('jsonwebtoken');

describe('auth.middleware', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { headers: {} };
    res = {};
    next = jest.fn();
  });

  test('should call next with 401 AppError when no authorization header is present', async () => {
    await auth(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect(next.mock.calls[0][0].statusCode).toBe(401);
    expect(next.mock.calls[0][0].message).toMatch(/not logged in/i);
  });

  test('should call next with 401 AppError when Authorization header does not start with Bearer', async () => {
    req.headers.authorization = 'Basic sometoken';

    await auth(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect(next.mock.calls[0][0].statusCode).toBe(401);
  });

  test('should call next with 401 AppError when token is invalid', async () => {
    req.headers.authorization = 'Bearer invalidtoken';
    jwt.verify.mockImplementation(() => { throw new Error('invalid signature'); });

    await auth(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect(next.mock.calls[0][0].statusCode).toBe(401);
    expect(next.mock.calls[0][0].message).toMatch(/invalid token/i);
  });

  test('should attach decoded user to req and call next() on valid token', async () => {
    const decodedUser = { id: 'user-id', email: 'user@test.com', role: 'parent', timezone: 'UTC' };
    req.headers.authorization = 'Bearer validtoken';
    jwt.verify.mockReturnValue(decodedUser);

    await auth(req, res, next);

    expect(req.user).toEqual(decodedUser);
    expect(next).toHaveBeenCalledWith(); // called with no args means success
  });

  test('should extract token correctly from "Bearer <token>" format', async () => {
    const decodedUser = { id: 'user-id', role: 'teacher' };
    req.headers.authorization = 'Bearer my.jwt.token';
    jwt.verify.mockReturnValue(decodedUser);

    await auth(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith('my.jwt.token', process.env.JWT_SECRET);
  });
});
