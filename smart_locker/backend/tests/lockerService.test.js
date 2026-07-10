const { commandLocker } = require('../src/services/lockerService');
const Locker = require('../src/models/Locker');
const { publishLockerCommand, logEvent } = require('../src/services/mqttService');
const { LockerStates } = require('../src/constants/enums');

jest.mock('../src/models/Locker');
jest.mock('../src/models/Station');
jest.mock('../src/services/mqttService');

describe('lockerService - commandLocker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should throw 404 if locker is not found', async () => {
    console.log('\n--- Member 3 Test Case 1: Locker Not Found ---');
    Locker.findById.mockResolvedValue(null);

    console.log('Testing: commandLocker for non-existent lockerId: "locker123"');
    console.log('Mocks Configured: Locker.findById returns null.');

    await expect(commandLocker({ role: 'USER' }, 'locker123', 'UNLOCK')).rejects.toThrow('Locker not found');
    try {
      await commandLocker({ role: 'USER' }, 'locker123', 'UNLOCK');
    } catch (error) {
      expect(error.statusCode).toBe(404);
      console.log('Result: Correctly threw 404 Locker not found. PASSED.');
    }
  });

  test('should allow regular USER to command their own locker', async () => {
    console.log('\n--- Member 3 Test Case 2: User Commands Own Locker ---');
    const mockSave = jest.fn().mockResolvedValue(true);
    const mockLocker = {
      _id: 'locker123',
      currentUserId: 'user123',
      stationId: 'station456',
      lockState: LockerStates.LOCKED,
      save: mockSave
    };

    Locker.findById.mockResolvedValue(mockLocker);

    const user = { _id: 'user123', role: 'USER' };
    console.log('Testing: commandLocker "UNLOCK" for locker: "locker123" by user: "user123"');
    console.log('Mocks Configured: Locker currentUserId matches commanding user._id.');

    const result = await commandLocker(user, 'locker123', 'UNLOCK');

    expect(publishLockerCommand).toHaveBeenCalledWith(mockLocker, 'UNLOCK');
    expect(mockLocker.lockState).toBe(LockerStates.UNLOCKED);
    expect(mockSave).toHaveBeenCalled();
    expect(logEvent).toHaveBeenCalledWith(mockLocker, 'UNLOCK', 'UNLOCK command sent', { byUserId: 'user123' });
    expect(result).toBe(mockLocker);
    console.log('Result: Lock state updated to UNLOCKED, MQTT command sent, event logged. PASSED.');
  });

  test('should deny access if regular USER tries to command another user\'s locker', async () => {
    console.log('\n--- Member 3 Test Case 3: Deny User commanding Another User\'s Locker ---');
    const mockLocker = {
      _id: 'locker123',
      currentUserId: 'anotherUser',
      stationId: 'station456'
    };

    Locker.findById.mockResolvedValue(mockLocker);

    const user = { _id: 'user123', role: 'USER' };
    console.log('Testing: commandLocker "UNLOCK" for locker: "locker123" owned by "anotherUser"');
    console.log('Mocks Configured: Locker currentUserId does not match user._id.');

    await expect(commandLocker(user, 'locker123', 'UNLOCK')).rejects.toThrow('Locker access denied');
    try {
      await commandLocker(user, 'locker123', 'UNLOCK');
    } catch (error) {
      expect(error.statusCode).toBe(403);
      console.log('Result: Correctly threw 403 Locker access denied. PASSED.');
    }
  });

  test('should allow SUPER_ADMIN to command any locker', async () => {
    console.log('\n--- Member 3 Test Case 4: SUPER_ADMIN Commands Any Locker ---');
    const mockSave = jest.fn().mockResolvedValue(true);
    const mockLocker = {
      _id: 'locker123',
      currentUserId: 'user123',
      stationId: 'station456',
      lockState: LockerStates.UNLOCKED,
      save: mockSave
    };

    Locker.findById.mockResolvedValue(mockLocker);

    const admin = { _id: 'admin123', role: 'SUPER_ADMIN' };
    console.log('Testing: commandLocker "LOCK" by SUPER_ADMIN');
    console.log('Mocks Configured: User role is SUPER_ADMIN.');

    await commandLocker(admin, 'locker123', 'LOCK');

    expect(publishLockerCommand).toHaveBeenCalledWith(mockLocker, 'LOCK');
    expect(mockLocker.lockState).toBe(LockerStates.LOCKED);
    expect(mockSave).toHaveBeenCalled();
    console.log('Result: Locker successfully commanded by SUPER_ADMIN. PASSED.');
  });

  test('should allow SUB_ADMIN to command locker at their assigned station', async () => {
    console.log('\n--- Member 3 Test Case 5: SUB_ADMIN Commands Assigned Station Locker ---');
    const mockSave = jest.fn().mockResolvedValue(true);
    const mockLocker = {
      _id: 'locker123',
      currentUserId: 'user123',
      stationId: 'station456',
      lockState: LockerStates.UNLOCKED,
      save: mockSave
    };

    Locker.findById.mockResolvedValue(mockLocker);

    const subAdmin = {
      _id: 'subAdmin123',
      role: 'SUB_ADMIN',
      stationIds: ['station456', 'station789']
    };
    console.log('Testing: commandLocker "LOCK" by SUB_ADMIN for locker at station: "station456"');
    console.log('Mocks Configured: SUB_ADMIN stationIds contains the locker\'s stationId.');

    await commandLocker(subAdmin, 'locker123', 'LOCK');

    expect(publishLockerCommand).toHaveBeenCalledWith(mockLocker, 'LOCK');
    expect(mockSave).toHaveBeenCalled();
    console.log('Result: Locker successfully commanded by authorized SUB_ADMIN. PASSED.');
  });

  test('should deny access if SUB_ADMIN commands locker at a station they do not own', async () => {
    console.log('\n--- Member 3 Test Case 6: Deny SUB_ADMIN for Unassigned Station Locker ---');
    const mockLocker = {
      _id: 'locker123',
      stationId: 'station999'
    };

    Locker.findById.mockResolvedValue(mockLocker);

    const subAdmin = {
      _id: 'subAdmin123',
      role: 'SUB_ADMIN',
      stationIds: ['station456']
    };
    console.log('Testing: commandLocker "LOCK" by SUB_ADMIN for locker at unassigned station: "station999"');
    console.log('Mocks Configured: SUB_ADMIN stationIds does not contain "station999".');

    await expect(commandLocker(subAdmin, 'locker123', 'LOCK')).rejects.toThrow('Station access denied');
    try {
      await commandLocker(subAdmin, 'locker123', 'LOCK');
    } catch (error) {
      expect(error.statusCode).toBe(403);
      console.log('Result: Correctly threw 403 Station access denied. PASSED.');
    }
  });
});
