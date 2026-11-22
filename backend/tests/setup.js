process.env.NODE_ENV = 'test';
process.env.ALLOW_TEST_REGISTRATION = '1';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-do-not-use-in-prod';
require('dotenv').config();
process.env.NODE_ENV = 'test';
process.env.ALLOW_TEST_REGISTRATION = '1';
const dns = require('dns');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (_) {}

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

    const db = dbName || 'lingrow_test';
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

let mongod;
let connected = false;

beforeAll(async () => {
  const baseUri = process.env.TEST_MONGODB_URI || process.env.MONGODB_URI || process.env.MONGO_URI;
  let remoteUri = null;
  if (baseUri) {
    const isLocal = baseUri.includes('127.0.0.1') || baseUri.includes('localhost');
    if (isLocal) {
      const root = baseUri.split('?')[0].replace(/\/+$/, '').replace(/\/lingrow_ai$/, '');
      remoteUri = `${root}/lingrow_test`;
    } else {
      const [basePart, queryPart] = baseUri.split('?');
      const root = basePart.replace(/\/+$/, '').replace(/\/lingrow_ai$/, '');
      remoteUri = `${root}/lingrow_test${queryPart ? '?' + queryPart : ''}`;
    }
  }
  if (remoteUri) {
    try {
      await mongoose.connect(remoteUri, { serverSelectionTimeoutMS: 5000 });
      connected = true;
      return;
    } catch (e) {
      if (remoteUri.startsWith('mongodb+srv://')) {
        const directUri = convertSrvToDirectUri(remoteUri);
        if (directUri) {
          try {
            await mongoose.connect(directUri, { serverSelectionTimeoutMS: 5000 });
            connected = true;
            return;
          } catch (_) {}
        }
      }
    }
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
