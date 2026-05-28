const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const userRepository = require('./user.repository');
const AppError = require('../../utils/AppError');
const { isValidTimezone } = require('../../utils/timezone.util');

// Validation Schemas
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['teacher', 'parent'], { errorMap: () => ({ message: 'Role must be either teacher or parent' }) }),
  timezone: z.string().refine(isValidTimezone, { message: 'Invalid IANA timezone' }),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

const register = async (userData) => {
  // 1. Validate input
  const validatedData = registerSchema.parse(userData);

  // 2. Check if email exists
  const existingUser = await userRepository.findByEmail(validatedData.email);
  if (existingUser) {
    throw new AppError('Email already in use', 409);
  }

  // 3. Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(validatedData.password, salt);

  // 4. Create user
  const newUser = await userRepository.createUser({
    ...validatedData,
    password: hashedPassword,
  });

  return newUser;
};

const login = async (loginData) => {
  // 1. Validate input
  const validatedData = loginSchema.parse(loginData);

  // 2. Find user
  const user = await userRepository.findByEmail(validatedData.email);
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  // 3. Check password
  const isMatch = await bcrypt.compare(validatedData.password, user.password);
  if (!isMatch) {
    throw new AppError('Invalid email or password', 401);
  }

  // 4. Generate JWT
  const token = jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role, 
      timezone: user.timezone 
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  // 5. Remove password from response
  const { password, ...userWithoutPassword } = user;

  return { user: userWithoutPassword, token };
};

module.exports = {
  register,
  login,
};
