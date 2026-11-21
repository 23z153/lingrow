require('dotenv').config();

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is required in production.');
}

if (process.env.NODE_ENV === 'production' && process.env.ALLOW_TEST_REGISTRATION === '1') {
  throw new Error('FATAL: ALLOW_TEST_REGISTRATION cannot be enabled in production.');
}

const createApp = require('./src/app');
const connectDB = require('./src/config/db');

const app = createApp();
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[server] LinGrow AI backend running on http://0.0.0.0:${PORT} (http://localhost:${PORT})`);
  });
});
