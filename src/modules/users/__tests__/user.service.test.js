const userService = require('../user.service');
const userRepository = require('../user.repository');
const AppError = require('../../../utils/AppError');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Mock dependencies
jest.mock('../user.repository');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('user.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const userData = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      role: 'parent',
      timezone: 'Asia/Kolkata'
    };

    test('should register a new user successfully', async () => {
      // Setup
      userRepository.findByEmail.mockResolvedValue(null);
      bcrypt.genSalt.mockResolvedValue('salt');
      bcrypt.hash.mockResolvedValue('hashedPassword');
      userRepository.createUser.mockResolvedValue({
        id: 'user-id',
        name: userData.name,
        email: userData.email.toLowerCase(),
        role: userData.role,
        timezone: userData.timezone
      });

      // Execute
      const result = await userService.register(userData);

      // Verify
      expect(result.email).toBe('john@example.com');
      expect(result.password).toBeUndefined();
      expect(userRepository.createUser).toHaveBeenCalledWith(expect.objectContaining({
        email: 'john@example.com',
        password: 'hashedPassword'
      }));
    });

    test('should throw 409 if email is already taken', async () => {
      userRepository.findByEmail.mockResolvedValue({ id: 'exists' });

      await expect(userService.register(userData)).rejects.toThrow('Email already registered');
      await expect(userService.register(userData)).rejects.toMatchObject({ statusCode: 409 });
    });

    test('should throw 400 for invalid timezone', async () => {
      const invalidData = { ...userData, timezone: 'Invalid/Zone' };
      await expect(userService.register(invalidData)).rejects.toThrow(); // Zod or manual check
    });
  });

  describe('login', () => {
    const loginData = { email: 'john@example.com', password: 'password123' };
    const mockUser = {
      id: 'user-id',
      email: 'john@example.com',
      password: 'hashedPassword',
      role: 'parent',
      timezone: 'Asia/Kolkata'
    };

    test('should login successfully with valid credentials', async () => {
      // Setup
      userRepository.findByEmail.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('mock-token');

      // Execute
      const result = await userService.login(loginData);

      // Verify
      expect(result.token).toBe('mock-token');
      expect(result.user.email).toBe('john@example.com');
      expect(result.user.password).toBeUndefined();
    });

    test('should throw 401 for incorrect password', async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false);

      await expect(userService.login(loginData)).rejects.toThrow('Invalid email or password');
      await expect(userService.login(loginData)).rejects.toMatchObject({ statusCode: 401 });
    });

    test('should throw 401 if user is not found', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      await expect(userService.login(loginData)).rejects.toThrow('Invalid email or password');
      await expect(userService.login(loginData)).rejects.toMatchObject({ statusCode: 401 });
    });
  });
});
