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
    Locker.findById.mockResolvedValue(null);

    await expect(commandLocker({ role: 'USER' }, 'locker123', 'UNLOCK')).rejects.toThrow('Locker not found');
    try {
      await commandLocker({ role: 'USER' }, 'locker123', 'UNLOCK');
    } catch (error) {
      expect(error.statusCode).toBe(404);
    }
  });

  test('should allow regular USER to command their own locker', async () => {
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
    const result = await commandLocker(user, 'locker123', 'UNLOCK');

    expect(publishLockerCommand).toHaveBeenCalledWith(mockLocker, 'UNLOCK');
    expect(mockLocker.lockState).toBe(LockerStates.UNLOCKED);
    expect(mockSave).toHaveBeenCalled();
    expect(logEvent).toHaveBeenCalledWith(mockLocker, 'UNLOCK', 'UNLOCK command sent', { byUserId: 'user123' });
    expect(result).toBe(mockLocker);
  });

  test('should deny access if regular USER tries to command another user\'s locker', async () => {
    const mockLocker = {
      _id: 'locker123',
      currentUserId: 'anotherUser',
      stationId: 'station456'
    };

    Locker.findById.mockResolvedValue(mockLocker);

    const user = { _id: 'user123', role: 'USER' };
    await expect(commandLocker(user, 'locker123', 'UNLOCK')).rejects.toThrow('Locker access denied');
    try {
      await commandLocker(user, 'locker123', 'UNLOCK');
    } catch (error) {
      expect(error.statusCode).toBe(403);
    }
  });

  test('should allow SUPER_ADMIN to command any locker', async () => {
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
    await commandLocker(admin, 'locker123', 'LOCK');

    expect(publishLockerCommand).toHaveBeenCalledWith(mockLocker, 'LOCK');
    expect(mockLocker.lockState).toBe(LockerStates.LOCKED);
    expect(mockSave).toHaveBeenCalled();
  });

  test('should allow SUB_ADMIN to command locker at their assigned station', async () => {
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
    await commandLocker(subAdmin, 'locker123', 'LOCK');

    expect(publishLockerCommand).toHaveBeenCalledWith(mockLocker, 'LOCK');
    expect(mockSave).toHaveBeenCalled();
  });

  test('should deny access if SUB_ADMIN commands locker at a station they do not own', async () => {
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

    await expect(commandLocker(subAdmin, 'locker123', 'LOCK')).rejects.toThrow('Station access denied');
    try {
      await commandLocker(subAdmin, 'locker123', 'LOCK');
    } catch (error) {
      expect(error.statusCode).toBe(403);
    }
  });
});
