require('dotenv').config();
const createApp = require('./src/app');
const connectDB = require('./src/config/db');

const app = createApp();
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`[server] LinGrow AI backend running on http://localhost:${PORT}`));
});
