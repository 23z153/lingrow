const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lingrow_ai';
  try {
    await mongoose.connect(uri, {
      maxPoolSize: 50,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 15000,
    });
    const sanitizedUri = uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
    console.log(`[db] connected -> ${sanitizedUri}`);
  } catch (err) {
    console.warn(`[db] Connection to ${uri} failed:`, err.message);
    console.log('[db] Attempting in-memory MongoDB fallback...');
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      const memUri = mongod.getUri();
      await mongoose.connect(memUri);
      console.log(`[db] Connected to In-Memory MongoDB -> ${memUri}`);
    } catch (memErr) {
      console.error('[db] In-memory MongoDB fallback failed:', memErr.message);
      process.exit(1);
    }
  }
}

module.exports = connectDB;

