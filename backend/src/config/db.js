const dns = require('dns');
const mongoose = require('mongoose');

// Configure public DNS resolvers to handle SRV records on networks with restrictive local DNS
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (_) {}

// Fallback direct replica set mapping for Atlas clusters when DNS SRV resolution fails
const DIRECT_ATLAS_FALLBACKS = {
  'cluster0.4edcnvn.mongodb.net': {
    hosts: [
      'ac-ro5zqus-shard-00-00.4edcnvn.mongodb.net:27017',
      'ac-ro5zqus-shard-00-01.4edcnvn.mongodb.net:27017',
      'ac-ro5zqus-shard-00-02.4edcnvn.mongodb.net:27017',
    ],
    replicaSet: 'atlas-mtg9yu-shard-0',
    authSource: 'admin',
  },
};

function convertSrvToDirectUri(srvUri) {
  try {
    const match = srvUri.match(/^mongodb\+srv:\/\/([^:]+):([^@]+)@([^/?]+)(?:\/([^?]*))?(?:\?(.*))?$/);
    if (!match) return null;
    const [, user, pass, host, dbName, queryStr] = match;
    const fallback = DIRECT_ATLAS_FALLBACKS[host];
    if (!fallback) return null;

    const db = dbName || 'lingrow_ai';
    const params = new URLSearchParams(queryStr || '');
    params.set('ssl', 'true');
    params.set('replicaSet', fallback.replicaSet);
    params.set('authSource', fallback.authSource);
    if (!params.has('retryWrites')) params.set('retryWrites', 'true');
    if (!params.has('w')) params.set('w', 'majority');

    return `mongodb://${user}:${pass}@${fallback.hosts.join(',')}/${db}?${params.toString()}`;
  } catch (_) {
    return null;
  }
}

async function connectDB() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lingrow_ai';
  const connectionOptions = {
    maxPoolSize: 50,
    minPoolSize: 5,
    serverSelectionTimeoutMS: 15000,
  };

  // Attempt 1: Connect with configured URI
  try {
    await mongoose.connect(uri, connectionOptions);
    const sanitizedUri = uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
    console.log(`[db] connected -> ${sanitizedUri}`);
    return;
  } catch (err) {
    console.warn(`[db] Connection to ${uri} failed: ${err.message}`);

    // Attempt 2: If SRV resolution failed on mongodb+srv://, use direct replica set URI
    const directUri = convertSrvToDirectUri(uri);
    if (directUri) {
      try {
        console.log('[db] Attempting direct Atlas replica set connection fallback...');
        await mongoose.connect(directUri, connectionOptions);
        const sanitizedDirect = directUri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
        console.log(`[db] connected -> ${sanitizedDirect}`);
        return;
      } catch (directErr) {
        console.warn(`[db] Direct Atlas connection failed: ${directErr.message}`);
      }
    }

    // Attempt 3: Local MongoDB instance if available
    try {
      console.log('[db] Attempting local MongoDB connection (mongodb://127.0.0.1:27017/lingrow_ai)...');
      await mongoose.connect('mongodb://127.0.0.1:27017/lingrow_ai', { serverSelectionTimeoutMS: 3000 });
      console.log('[db] connected -> mongodb://127.0.0.1:27017/lingrow_ai');
      return;
    } catch (_) {}

    // Attempt 4: In-memory fallback
    console.log('[db] Attempting in-memory MongoDB fallback...');
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      const memUri = mongod.getUri();
      await mongoose.connect(memUri);
      console.log(`[db] Connected to In-Memory MongoDB -> ${memUri}`);
    } catch (memErr) {
      console.error('[db] In-memory MongoDB fallback failed:', memErr.message);
      console.error('[db] Fatal: Could not connect to any MongoDB database.');
      process.exit(1);
    }
  }
}

module.exports = connectDB;

