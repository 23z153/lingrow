const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/lingrow_ai';
  try {
    await mongoose.connect(uri);
    const sanitizedUri = uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
    console.log(`[db] connected -> ${sanitizedUri}`);
  } catch (err) {
    console.error('[db] connection failed:', err.message);
    console.error('[db] Check your MONGO_URI in .env and verify IP Access List in MongoDB Atlas.');
    process.exit(1);
  }
}

module.exports = connectDB;
