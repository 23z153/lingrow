const request = require('supertest');
const createApp = require('../src/app');
const StoryPrompt = require('../src/models/StoryPrompt');
const User = require('../src/models/User');

const app = createApp();

function newUserPayload() {
  return {
    name: 'Story Student',
    email: `story.${Date.now()}.${Math.random().toString(36).slice(2)}@example.com`,
    password: 'password123',
    role: 'student',
  };
}

describe('Story Continuation API Routes', () => {
  let token;
  let user;

  beforeEach(async () => {
    const reg = await request(app).post('/api/auth/register').send(newUserPayload());
    token = reg.body.token;

    // Grant 600 XP so user passes requireMinXP(500)
    user = await User.findOne({ email: reg.body.user.email });
    user.xp = 600;
    await user.save();

    // Create an active general story
    await StoryPrompt.create({
      title: 'The Lost Train Ticket',
      theme: 'Travel & Exploration',
      level: 'Beginner',
      openingNarration: 'The platform conductor blew the whistle as the train arrived. Kabir searched his coat pocket for his ticket.',
      prompt: 'Continue the story for 45 to 60 seconds.',
      suggestedWords: ['searched', 'relieved', 'journey'],
      active: true,
    });

    // Create an inactive legacy department story
    await StoryPrompt.create({
      title: 'CSE Narration Case #55',
      department: 'CSE',
      level: 'Advanced',
      openingNarration: 'The server rack overheated.',
      prompt: 'Describe stakeholder alignment.',
      active: false,
    });
  });

  test('GET /api/story/prompts returns active general stories without department filter', async () => {
    // Calling with or without department query yields the active general stories
    const res = await request(app)
      .get('/api/story/prompts?department=CSE')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    const activeStory = res.body.find((p) => p.title === 'The Lost Train Ticket');
    expect(activeStory).toBeDefined();
    expect(activeStory.theme).toBe('Travel & Exploration');
    expect(activeStory.suggestedWords).toEqual(['searched', 'relieved', 'journey']);

    // Inactive legacy department stories should NOT be returned
    const inactiveStory = res.body.find((p) => p.title === 'CSE Narration Case #55');
    expect(inactiveStory).toBeUndefined();
  });
});
