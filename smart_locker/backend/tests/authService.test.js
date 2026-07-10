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
    console.log('\n--- Member 1 Test Case 1: Successful Login ---');
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

    console.log('Testing login with input email: "JOHN@example.com", password: "password123"');
    console.log('Mocks Configured: User found in DB, Password compare matches.');

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
    console.log('Result: Login succeeded. JWT token generated. User DTO returned. PASSED.');
  });

  test('should throw 401 error if user is not found', async () => {
    console.log('\n--- Member 1 Test Case 2: User Not Found ---');
    User.findOne.mockResolvedValue(null);

    console.log('Testing login with non-existent email: "nonexistent@example.com"');
    console.log('Mocks Configured: User.findOne returns null.');

    await expect(login({ email: 'nonexistent@example.com', password: 'password123' })).rejects.toThrow('Invalid credentials');
    
    try {
      await login({ email: 'nonexistent@example.com', password: 'password123' });
    } catch (error) {
      expect(error.statusCode).toBe(401);
      console.log('Result: Correctly threw 401 Invalid credentials. PASSED.');
    }
  });

  test('should throw 401 error if password is incorrect', async () => {
    console.log('\n--- Member 1 Test Case 3: Incorrect Password ---');
    const mockUser = {
      _id: 'user123',
      email: 'john@example.com',
      passwordHash: 'hashedpassword'
    };

    User.findOne.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(false);

    console.log('Testing login with correct email but wrong password: "wrongpassword"');
    console.log('Mocks Configured: User found in DB, Password compare returns false.');

    await expect(login({ email: 'john@example.com', password: 'wrongpassword' })).rejects.toThrow('Invalid credentials');
    
    try {
      await login({ email: 'john@example.com', password: 'wrongpassword' });
    } catch (error) {
      expect(error.statusCode).toBe(401);
      console.log('Result: Correctly threw 401 Invalid credentials. PASSED.');
    }
  });
});
