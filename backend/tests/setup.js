process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-do-not-use-in-prod';
require('dotenv').config();
process.env.NODE_ENV = 'test';
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let connected = false;

beforeAll(async () => {
  const baseUri = process.env.TEST_MONGODB_URI || process.env.MONGODB_URI || process.env.MONGO_URI;
  let remoteUri = null;
  if (baseUri) {
    const isLocal = baseUri.includes('127.0.0.1') || baseUri.includes('localhost');
    const suffix = isLocal ? '' : '?retryWrites=true&w=majority';
    const root = baseUri.split('?')[0].replace(/\/+$/, '').replace(/\/lingrow_ai$/, '');
    remoteUri = `${root}/lingrow_test${suffix}`;
  }
  if (remoteUri) {
    try {
      await mongoose.connect(remoteUri, { serverSelectionTimeoutMS: 3000 });
      connected = true;
      return;
    } catch (e) {}
  }
  // Try local MongoDB first if running
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/lingrow_test', { serverSelectionTimeoutMS: 1500 });
    connected = true;
    return;
  } catch (e) {}

  try {
    mongod = await MongoMemoryServer.create({
      instance: {
        launchTimeout: 3000,
      },
    });
    await mongoose.connect(mongod.getUri(), { serverSelectionTimeoutMS: 3000 });
    connected = true;
  } catch (err) {
    // Running standalone unit tests without DB instance
  }
}, 15000);

afterEach(async () => {
  if (!connected || mongoose.connection.readyState !== 1) return;
  if (!mongoose.connection.name || !mongoose.connection.name.includes('test')) return;
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    try {
      await collections[key].deleteMany({});
    } catch (e) {}
  }
});

afterAll(async () => {
  if (connected && mongoose.connection.readyState === 1) {
    try {
      if (mongoose.connection.name && mongoose.connection.name.includes('test')) {
        await mongoose.connection.dropDatabase();
      }
      await mongoose.connection.close();
    } catch (e) {}
  }
  if (mongod) {
    try {
      await mongod.stop();
    } catch (e) {}
  }
});
