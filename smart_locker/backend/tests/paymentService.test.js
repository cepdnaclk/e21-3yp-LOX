const { createOverdueCheckoutSession } = require('../src/services/paymentService');
const Locker = require('../src/models/Locker');
const Station = require('../src/models/Station');
const { getReservationPhase } = require('../src/services/overdueService');
const { createOrder, updateOrderById } = require('../src/services/orderService');
const stripeLib = require('stripe');

const mockCreate = jest.fn();
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => {
    return {
      checkout: {
        sessions: {
          create: mockCreate
        }
      }
    };
  });
});

jest.mock('../src/models/Locker');
jest.mock('../src/models/Station');
jest.mock('../src/services/overdueService');
jest.mock('../src/services/orderService');
jest.mock('../src/config/env', () => ({
  env: {
    stripeSecretKey: 'sk_test_123',
    stripeCurrency: 'usd'
  }
}));

describe('paymentService - createOverdueCheckoutSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should throw 403 if user role is not USER', async () => {
    console.log('\n--- Member 4 Test Case 1: Deny Non-User Role ---');
    const user = { role: 'SUPER_ADMIN', _id: 'admin123' };
    console.log('Testing: createOverdueCheckoutSession for user role: "SUPER_ADMIN"');
    console.log('Mocks Configured: User has non-USER role.');

    await expect(createOverdueCheckoutSession(user, 'locker123', {})).rejects.toThrow('Only regular users can pay overdue locker fees');
    try {
      await createOverdueCheckoutSession(user, 'locker123', {});
    } catch (error) {
      expect(error.statusCode).toBe(403);
      console.log('Result: Correctly threw 403 Forbidden. PASSED.');
    }
  });

  test('should throw 404 if locker is not found', async () => {
    console.log('\n--- Member 4 Test Case 2: Locker Not Found ---');
    Locker.findById.mockResolvedValue(null);

    const user = { role: 'USER', _id: 'user123' };
    console.log('Testing: createOverdueCheckoutSession for non-existent lockerId: "locker123"');
    console.log('Mocks Configured: Locker.findById returns null.');

    await expect(createOverdueCheckoutSession(user, 'locker123', {})).rejects.toThrow('Locker not found');
    try {
      await createOverdueCheckoutSession(user, 'locker123', {});
    } catch (error) {
      expect(error.statusCode).toBe(404);
      console.log('Result: Correctly threw 404 Locker not found. PASSED.');
    }
  });

  test('should throw 403 if user is not the current locker user', async () => {
    console.log('\n--- Member 4 Test Case 3: Deny Payment for Another User\'s Locker ---');
    const mockLocker = {
      _id: 'locker123',
      currentUserId: 'anotherUser'
    };
    Locker.findById.mockResolvedValue(mockLocker);

    const user = { role: 'USER', _id: 'user123' };
    console.log('Testing: createOverdueCheckoutSession for locker held by "anotherUser"');
    console.log('Mocks Configured: Locker currentUserId does not match user._id.');

    await expect(createOverdueCheckoutSession(user, 'locker123', {})).rejects.toThrow('You are not the current user of this locker');
    try {
      await createOverdueCheckoutSession(user, 'locker123', {});
    } catch (error) {
      expect(error.statusCode).toBe(403);
      console.log('Result: Correctly threw 403 Forbidden. PASSED.');
    }
  });

  test('should throw 400 if locker is not currently overdue', async () => {
    console.log('\n--- Member 4 Test Case 4: Reject If Locker Is Not Overdue ---');
    const mockLocker = {
      _id: 'locker123',
      currentUserId: 'user123',
      stationId: 'station456'
    };
    Locker.findById.mockResolvedValue(mockLocker);
    Station.findById.mockResolvedValue({ _id: 'station456' });

    getReservationPhase.mockReturnValue({
      phase: 'FREE',
      chargeAmount: 0,
      overdueMs: 0
    });

    const user = { role: 'USER', _id: 'user123' };
    console.log('Testing: createOverdueCheckoutSession when locker is in "FREE" status');
    console.log('Mocks Configured: getReservationPhase returns phase = "FREE".');

    await expect(createOverdueCheckoutSession(user, 'locker123', {})).rejects.toThrow('This locker is not currently overdue');
    try {
      await createOverdueCheckoutSession(user, 'locker123', {});
    } catch (error) {
      expect(error.statusCode).toBe(400);
      console.log('Result: Correctly threw 400 Bad Request. PASSED.');
    }
  });

  test('should successfully create checkout session when locker is overdue', async () => {
    console.log('\n--- Member 4 Test Case 5: Successfully Create Stripe Overdue Checkout Session ---');
    const mockLocker = {
      _id: 'locker123',
      currentUserId: 'user123',
      stationId: 'station456',
      code: 'L01'
    };
    Locker.findById.mockResolvedValue(mockLocker);
    Station.findById.mockResolvedValue({ _id: 'station456', name: 'West Station', overdueRatePerHour: 2.0 });

    getReservationPhase.mockReturnValue({
      phase: 'OVERDUE',
      chargeAmount: 5.0,
      overdueMs: 1500000 // 25 minutes
    });

    createOrder.mockResolvedValue({
      id: 'order123'
    });

    mockCreate.mockResolvedValue({
      id: 'sess_123',
      url: 'https://checkout.stripe.com/sess_123'
    });

    updateOrderById.mockResolvedValue({
      id: 'order123',
      stripeSessionId: 'sess_123',
      checkoutUrl: 'https://checkout.stripe.com/sess_123',
      status: 'PENDING'
    });

    const user = { role: 'USER', _id: 'user123', email: 'user@example.com' };
    const req = {
      body: { isMobile: true, origin: 'loxapp://payment' },
      get: jest.fn().mockReturnValue('localhost:3001'),
      protocol: 'http'
    };

    console.log('Testing: createOverdueCheckoutSession for overdue locker "L01" at "West Station"');
    console.log('Mocks Configured: Phase = OVERDUE, ChargeAmount = $5.00, Stripe resolves to session "sess_123".');

    const result = await createOverdueCheckoutSession(user, 'locker123', req);

    expect(createOrder).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user123',
      productId: 'locker123',
      productCategory: 'OVERDUE_FEE',
      amount: 5.0
    }));

    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      mode: 'payment',
      customer_email: 'user@example.com',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: 500,
            product_data: {
              name: 'Overdue Fee – Locker L01',
              description: 'Overdue by 25 min at West Station. Rate: $2/hr'
            }
          }
        }
      ]
    }));

    expect(updateOrderById).toHaveBeenCalledWith('order123', {
      stripeSessionId: 'sess_123',
      checkoutUrl: 'https://checkout.stripe.com/sess_123',
      notes: 'Overdue checkout session created. Overdue: 25 min'
    });

    expect(result).toEqual({
      order: expect.objectContaining({ id: 'order123' }),
      checkoutUrl: 'https://checkout.stripe.com/sess_123',
      sessionId: 'sess_123',
      chargeAmount: 5.0,
      overdueMinutes: 25
    });
    console.log('Result: Checkout session created, Order records saved, redirect URL returned. PASSED.');
  });
});
