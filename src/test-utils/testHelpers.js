/**
 * Integration test helpers — shared JWT generator and mock setup utilities.
 * All integration tests mock DB at the module level; no real DB connection needed.
 */
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'test-secret';

// Set env for tests
process.env.JWT_SECRET = JWT_SECRET;
process.env.JWT_EXPIRES_IN = '1d';
process.env.NODE_ENV = 'test';

/**
 * Generates a signed JWT for a given user payload.
 * Uses the same JWT_SECRET set above so auth.middleware will accept it.
 */
const generateToken = (payload) => jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });

const TEACHER = {
  id: 'teacher-uuid-0001',
  email: 'teacher@test.com',
  role: 'teacher',
  timezone: 'UTC',
};

const PARENT = {
  id: 'parent-uuid-0001',
  email: 'parent@test.com',
  role: 'parent',
  timezone: 'Asia/Kolkata',
};

const TEACHER_TOKEN = generateToken(TEACHER);
const PARENT_TOKEN = generateToken(PARENT);

module.exports = {
  generateToken,
  TEACHER,
  PARENT,
  TEACHER_TOKEN,
  PARENT_TOKEN,
};
