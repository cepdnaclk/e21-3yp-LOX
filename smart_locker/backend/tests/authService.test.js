const { login } = require('../src/services/authService');
const User = require('../src/models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

jest.mock('../src/models/User');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../src/config/env', () => ({
  env: {
    jwtSecret: 'testsecret'
  }
}));

describe('authService - login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should login user successfully with valid credentials', async () => {
    const mockUser = {
      _id: 'user123',
      name: 'John Doe',
      email: 'john@example.com',
      passwordHash: 'hashedpassword',
      role: 'USER',
      avatarUrl: '',
      homeBackgroundUrl: '',
      phone: '',
      jobTitle: '',
      bio: '',
      stationIds: []
    };

    User.findOne.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue('mocktoken');

    const result = await login({ email: 'JOHN@example.com', password: 'password123' });

    expect(User.findOne).toHaveBeenCalledWith({ email: 'john@example.com' });
    expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedpassword');
    expect(jwt.sign).toHaveBeenCalled();
    expect(result).toEqual({
      token: 'mocktoken',
      user: {
        id: 'user123',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'USER',
        avatarUrl: '',
        homeBackgroundUrl: '',
        phone: '',
        jobTitle: '',
        bio: '',
        stationIds: []
      }
    });
  });

  test('should throw 401 error if user is not found', async () => {
    User.findOne.mockResolvedValue(null);

    await expect(login({ email: 'nonexistent@example.com', password: 'password123' })).rejects.toThrow('Invalid credentials');
    
    try {
      await login({ email: 'nonexistent@example.com', password: 'password123' });
    } catch (error) {
      expect(error.statusCode).toBe(401);
    }
  });

  test('should throw 401 error if password is incorrect', async () => {
    const mockUser = {
      _id: 'user123',
      email: 'john@example.com',
      passwordHash: 'hashedpassword'
    };

    User.findOne.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(false);

    await expect(login({ email: 'john@example.com', password: 'wrongpassword' })).rejects.toThrow('Invalid credentials');
    
    try {
      await login({ email: 'john@example.com', password: 'wrongpassword' });
    } catch (error) {
      expect(error.statusCode).toBe(401);
    }
  });
});
