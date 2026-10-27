require('dotenv').config();
const createApp = require('./src/app');
const connectDB = require('./src/config/db');
const { scrapeDepartmentContent } = require('./src/services/departmentScraperService');

const app = createApp();
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[server] LinGrow AI backend running on http://0.0.0.0:${PORT} (http://localhost:${PORT})`);
    
    // Trigger initial automated background content & story narration scraper
    scrapeDepartmentContent()
      .then((res) => console.log(`[scraper] Initial background scrape finished: ${res.passagesCreated} passages, ${res.clipsCreated} clips, ${res.storyPromptsCreated} story narration prompts.`))
      .catch((err) => console.error('[scraper] Background scraper error:', err.message));

    // Schedule recurring background content scraper every 30 minutes
    setInterval(async () => {
      try {
        const res = await scrapeDepartmentContent();
        console.log(`[scraper] Recurring background scrape complete: +${res.passagesCreated} passages, +${res.clipsCreated} clips, +${res.storyPromptsCreated} story narration prompts.`);
      } catch (err) {
        console.error('[scraper] Recurring scrape error:', err.message);
      }
    }, 30 * 60 * 1000);
  });
});

