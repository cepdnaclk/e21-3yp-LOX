const { requestLogger } = require('../src/middleware/requestLogger');
const { EventEmitter } = require('events');

// Mock request
const req = {
  method: 'POST',
  originalUrl: '/api/lockers/reserve',
  url: '/api/lockers/reserve'
};

// Mock response as an event emitter
class MockResponse extends EventEmitter {
  constructor() {
    super();
    this.statusCode = 201;
  }
}

const res = new MockResponse();

// Mock next function
const next = () => {
  // Simulate request processing time
  setTimeout(() => {
    res.emit('finish');
  }, 150);
};

// Run the middleware
requestLogger(req, res, next);
