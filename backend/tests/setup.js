const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-do-not-use-in-prod';
process.env.NODE_ENV = 'test';

let mongod;
let connected = false;

beforeAll(async () => {
  try {
    mongod = await MongoMemoryServer.create({
      instance: {
        launchTimeout: 3000,
      },
    });
    await mongoose.connect(mongod.getUri(), { serverSelectionTimeoutMS: 3000 });
    connected = true;
  } catch (err) {
    try {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lingrow_test', { serverSelectionTimeoutMS: 1500 });
      connected = true;
    } catch (e) {
      // Running standalone unit tests without DB instance
    }
  }
}, 15000);

afterEach(async () => {
  if (!connected || mongoose.connection.readyState !== 1) return;
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
      await mongoose.connection.dropDatabase();
      await mongoose.connection.close();
    } catch (e) {}
  }
  if (mongod) {
    try {
      await mongod.stop();
    } catch (e) {}
  }
});

