const { createRequest } = require('../src/services/requestService');
const AccessRequest = require('../src/models/AccessRequest');
const Locker = require('../src/models/Locker');
const { RequestStatuses } = require('../src/constants/enums');

jest.mock('../src/models/AccessRequest');
jest.mock('../src/models/Locker');
jest.mock('../src/models/Station');
jest.mock('../src/models/QueueEntry');
jest.mock('../src/services/mqttService');
jest.mock('../src/services/notificationService');

describe('requestService - createRequest', () => {
  const mockUser = {
    _id: 'user123',
    role: 'USER'
  };

  const payload = {
    stationId: 'station456',
    note: 'Testing note'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should successfully create a request when no active requests or lockers exist', async () => {
    AccessRequest.findOne
      .mockResolvedValueOnce(null) // Guard 1: no pending/queued
      .mockResolvedValueOnce(null); // Guard 2: no approved

    const mockRequest = {
      _id: 'req789',
      userId: mockUser._id,
      stationId: payload.stationId,
      note: payload.note,
      status: RequestStatuses.PENDING
    };
    AccessRequest.create.mockResolvedValue(mockRequest);

    const result = await createRequest(mockUser, payload);

    expect(AccessRequest.findOne).toHaveBeenNthCalledWith(1, {
      userId: mockUser._id,
      stationId: payload.stationId,
      status: { $in: [RequestStatuses.PENDING, RequestStatuses.QUEUED] }
    });
    expect(AccessRequest.findOne).toHaveBeenNthCalledWith(2, {
      userId: mockUser._id,
      stationId: payload.stationId,
      status: RequestStatuses.APPROVED,
      lockerId: { $ne: null }
    });
    expect(AccessRequest.create).toHaveBeenCalledWith({
      userId: mockUser._id,
      stationId: payload.stationId,
      note: payload.note,
      status: RequestStatuses.PENDING
    });
    expect(result).toEqual(mockRequest);
  });

  test('should throw 409 error when user already has a pending or queued request', async () => {
    AccessRequest.findOne.mockResolvedValueOnce({ _id: 'existingReq', status: RequestStatuses.PENDING });

    await expect(createRequest(mockUser, payload)).rejects.toThrow('You already have an active request for this station.');

    try {
      await createRequest(mockUser, payload);
    } catch (error) {
      expect(error.statusCode).toBe(409);
    }
  });

  test('should throw 409 error when user has an approved request with a locker currently booked', async () => {
    AccessRequest.findOne
      .mockResolvedValueOnce(null) // Guard 1: passes
      .mockResolvedValueOnce({ _id: 'approvedReq', status: RequestStatuses.APPROVED, lockerId: 'locker123' }); // Guard 2: approved request exists

    Locker.findById.mockResolvedValueOnce({
      _id: 'locker123',
      isBooked: true,
      currentUserId: mockUser._id
    });

    await expect(createRequest(mockUser, payload)).rejects.toThrow('You already have an active locker at this station.');

    try {
      await createRequest(mockUser, payload);
    } catch (error) {
      expect(error.statusCode).toBe(409);
    }
  });

  test('should succeed in creating request when an approved request exists but locker is already released', async () => {
    AccessRequest.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ _id: 'approvedReq', status: RequestStatuses.APPROVED, lockerId: 'locker123' });

    Locker.findById.mockResolvedValueOnce({
      _id: 'locker123',
      isBooked: false, // locker released
      currentUserId: null
    });

    const mockRequest = {
      _id: 'newReq789',
      userId: mockUser._id,
      stationId: payload.stationId,
      note: payload.note,
      status: RequestStatuses.PENDING
    };
    AccessRequest.create.mockResolvedValue(mockRequest);

    const result = await createRequest(mockUser, payload);
    expect(result).toEqual(mockRequest);
    expect(AccessRequest.create).toHaveBeenCalled();
  });
});
