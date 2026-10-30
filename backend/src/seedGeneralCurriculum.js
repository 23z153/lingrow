require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const Passage = require('./models/Passage');
const ListeningClip = require('./models/ListeningClip');
const StoryPrompt = require('./models/StoryPrompt');
const DebateTopic = require('./models/DebateTopic');
const VocabWord = require('./models/VocabWord');

// 60 General Read Aloud Passages (20 Beginner, 20 Intermediate, 20 Advanced)
const GENERAL_PASSAGES = [
  // --- BEGINNER (20 passages, 60-80 words) ---
  {
    title: 'A Morning Walk in the Park',
    level: 'Beginner',
    text: 'Every morning, the sun rises gently over the neighborhood park. Many people come here to start their day. Some walk briskly along the paved paths, while others sit quietly on wooden benches and enjoy a warm cup of tea. Tall green trees provide cool shade, and birds sing sweet melodies from the branches. Starting the morning with fresh air and gentle exercise brings a peaceful feeling that lasts all day.',
  },
  {
    title: 'Cooking Dinner with Family',
    level: 'Beginner',
    text: 'Preparing a meal together is one of the easiest ways to bring family members closer. In our kitchen, everyone has a special task. My sister washes the fresh vegetables, while my father chops onions and tomatoes. The wonderful aroma of spices fills the room as the pot simmers on the stove. When dinner is finally ready, we sit around the table, share funny stories from school, and enjoy our delicious food.',
  },
  {
    title: 'My Favorite Season',
    level: 'Beginner',
    text: 'Autumn is my absolute favorite season of the year. The summer heat begins to fade, and a crisp, cool breeze sweeps through the streets. Leaves on the maple trees turn bright shades of yellow, orange, and red before falling gently to the ground. People put on warm sweaters and drink hot chocolate. Walking outdoors feels refreshing, and the golden afternoon light makes the whole world look peaceful and cozy.',
  },
  {
    title: 'Visiting the City Library',
    level: 'Beginner',
    text: 'The city library is a magical sanctuary for anyone who loves learning. When you walk through the heavy glass doors, a soft quietness welcomes you. Rows upon rows of tall wooden shelves are packed with thousands of exciting books. You can find inspiring biographies, captivating adventure stories, and colorful magazines. Finding a quiet corner by a sunny window with a good book is a wonderful way to spend an afternoon.',
  },
  {
    title: 'The Joy of Gardening',
    level: 'Beginner',
    text: 'Planting a small garden teaches you patience and care. It begins with tiny dark seeds pressed into rich, damp soil. Every afternoon, you water them carefully and ensure they receive enough bright sunlight. After several days, delicate green sprouts push their way through the earth. Watching colorful flowers bloom or harvesting fresh mint leaves gives you a deep sense of pride and connects you closely with nature.',
  },
  {
    title: 'Learning to Ride a Bicycle',
    level: 'Beginner',
    text: 'Riding a bicycle for the very first time can feel both thrilling and scary. At first, maintaining your balance seems almost impossible. Your hands grip the handlebars tightly, and your feet wobble on the pedals. But once you look straight ahead and keep moving forward, the bicycle glides smoothly across the pavement. The wind rushes against your face, and you suddenly experience the unforgettable joy of pure freedom.',
  },
  {
    title: 'A Weekend at the Beach',
    level: 'Beginner',
    text: 'Spending Saturday at the seashore always lifts my spirits. The sound of rolling ocean waves crashing against soft sand is calming and steady. Children build tall sandcastles adorned with shiny seashells, while seagulls soar gracefully across the blue sky. Walking barefoot along the water’s edge cools your feet on a warm sunny day. As evening approaches, the orange sunset paints the sky in breathtaking colors.',
  },
  {
    title: 'Packing for a Short Trip',
    level: 'Beginner',
    text: 'Preparing for a weekend trip requires thoughtful planning. You should lay out comfortable clothes, sturdy walking shoes, and essential toiletries. Packing light makes traveling much more pleasant, so it helps to choose versatile outfits that match easily. Do not forget important items like your mobile phone charger, a reusable water bottle, and a small notebook. Being well organized allows you to relax and enjoy the journey.',
  },
  {
    title: 'The Value of True Friendship',
    level: 'Beginner',
    text: 'Good friends make our everyday lives richer and brighter. A true friend listens attentively when you face a challenge and celebrates your happiest achievements. They offer honest advice without judgment and help you see the bright side during tough moments. Even when busy schedules keep you apart for weeks, meeting again feels like no time has passed at all. Mutual trust and respect form the heart of lasting friendship.',
  },
  {
    title: 'My First Job Interview',
    level: 'Beginner',
    text: 'Preparing for a first interview is an exciting milestone. Before leaving home, make sure your outfit is clean, neat, and professional. Arrive ten minutes early to compose your thoughts and review your resume. During the conversation, maintain friendly eye contact and listen carefully to each question. Speaking clearly and honestly about your practical skills leaves a positive, lasting impression on the interviewer.',
  },
  {
    title: 'A Visit to the Farmers Market',
    level: 'Beginner',
    text: 'Saturday mornings at the farmers market are full of lively energy. Local farmers proudly display wooden crates filled with freshly picked apples, crisp green lettuce, and ripe red strawberries. Bakers offer warm sourdough bread that smells irresistible. Friendly vendors gladly offer free samples and share tips on seasonal recipes. Buying directly from local growers supports the community and guarantees fresh, healthy meals.',
  },
  {
    title: 'Why Breakfast Matters',
    level: 'Beginner',
    text: 'Eating a nutritious breakfast provides your body and brain with essential energy after a night of sleep. A balanced morning meal might include warm oatmeal with fresh fruit, whole grain toast, or boiled eggs. Skipping breakfast often leaves you feeling sluggish and distracted during morning classes or work. Taking just fifteen minutes to eat well sets a positive, energized tone for the entire day ahead.',
  },
  {
    title: 'Adopting a Pet',
    level: 'Beginner',
    text: 'Welcoming a pet into your home brings immense joy and rewarding responsibility. Dogs and cats quickly become beloved companions who offer unconditional loyalty and warmth. However, caring for an animal requires consistent effort, including daily meals, clean water, regular exercise, and frequent veterinary visits. In return for your loving care, pets provide endless comfort, funny moments, and meaningful companionship that brightens every household.',
  },
  {
    title: 'Listening to Good Music',
    level: 'Beginner',
    text: 'Music has an incredible ability to influence our emotions and enhance our focus. An upbeat song can energize you during a morning workout, while soft instrumental melodies can calm your mind after a stressful afternoon. Learning to appreciate different musical styles opens your ears to creative rhythms and diverse cultural expressions. Putting on headphones and losing yourself in a beautiful song is one of life’s simplest pleasures.',
  },
  {
    title: 'Cleaning and Decluttering',
    level: 'Beginner',
    text: 'Taking time to organize your bedroom or study space creates a calm atmosphere. Begin by sorting through old papers, clothes you no longer wear, and unused items on your desk. Giving away things you do not need makes room for the essentials. When your living space is clean and tidy, your thoughts become clearer, helping you concentrate much better on studying or creative projects.',
  },
  {
    title: 'Taking Public Transit',
    level: 'Beginner',
    text: 'Using buses and subway trains is a convenient and eco-friendly way to travel around the city. You simply scan your transit card at the turnstile and wait patiently behind the yellow safety line. During your ride, you can observe colorful city streets, read an interesting chapter of your book, or listen to an informative podcast. Public transportation reduces traffic congestion and helps keep our air cleaner.',
  },
  {
    title: 'Sharing a Smile',
    level: 'Beginner',
    text: 'A warm and genuine smile costs nothing, yet it possesses immense power. When you smile at a busy cashier, a tired neighbor, or a classmate, you acknowledge their presence with kindness. Often, a friendly expression can brighten someone’s difficult morning and inspire them to pass that goodwill along. Small acts of simple courtesy make our schools, workplaces, and neighborhoods friendlier and more welcoming places to live.',
  },
  {
    title: 'Exploring a Local Museum',
    level: 'Beginner',
    text: 'Museums offer fascinating windows into history, science, and human creativity. As you wander through quiet exhibition halls, you discover ancient stone sculptures, historic photographs, and interactive scientific displays. Informative display plaques explain how people lived hundreds of years ago and how groundbreaking discoveries were made. Visiting a museum sparks your natural curiosity and deepens your appreciation for the world around us.',
  },
  {
    title: 'Drinking Enough Water',
    level: 'Beginner',
    text: 'Staying well hydrated is fundamental to maintaining good health and steady energy levels. Our bodies depend on water to regulate temperature, support healthy digestion, and keep our skin glowing. Carrying a reusable water bottle throughout the day serves as an easy reminder to take regular sips. When you drink sufficient water, you avoid headaches, stay alert in class, and feel refreshed from morning until night.',
  },
  {
    title: 'Planning a Productive Day',
    level: 'Beginner',
    text: 'Starting your morning with a written plan makes a world of difference. Take five minutes to write down three important tasks you genuinely want to complete before evening. Prioritizing your top responsibilities prevents you from feeling overwhelmed by small distractions. As you tick off each completed item, you build confidence and momentum. A thoughtful daily plan helps you achieve meaningful progress one step at a time.',
  },

  // --- INTERMEDIATE (20 passages, 80-100 words) ---
  {
    title: 'Why Sleep Matters',
    level: 'Intermediate',
    text: 'Quality sleep is not merely a period of physical rest; it is an active biological process essential for mental and emotional well-being. While you sleep, your brain consolidates newly learned information, organizing memories and clearing away metabolic waste that accumulates during waking hours. Consistent sleep deprivation impairs concentration, weakens immune function, and increases emotional irritability. Establishing a steady bedtime routine—such as dimming overhead lights and avoiding digital screens an hour before sleeping—signals to your nervous system that it is time to unwind, leading to deeper, restorative rest.',
  },
  {
    title: 'The Art of Active Listening',
    level: 'Intermediate',
    text: 'Effective communication is often mistaken for the ability to speak persuasively, yet listening attentively is equally vital. Active listening requires paying undivided attention to the speaker rather than mentally drafting your reply while they are still talking. It involves observing nonverbal cues, maintaining respectful eye contact, and nodding to demonstrate genuine understanding. Asking clarifying questions and summarizing key points shows that you value the other person’s perspective. When people feel genuinely heard and respected, mutual trust flourishes, paving the way for collaborative solutions in personal and professional relationships.',
  },
  {
    title: 'The Power of Habit Loops',
    level: 'Intermediate',
    text: 'Every habit we perform follows a simple psychological loop: a cue, a routine, and a reward. For instance, feeling stressed in the afternoon might serve as a cue that triggers the routine of snacking on sugary foods, yielding a brief sensory reward. To alter an unproductive habit, behavioral scientists recommend preserving the initial cue and desired reward while substituting a healthier routine, such as taking a brisk five-minute walk or drinking herbal tea. Over time, consistent repetition rewires neural pathways, making constructive behaviors feel completely natural and effortless.',
  },
  {
    title: 'Navigating Culture Shock When Traveling',
    level: 'Intermediate',
    text: 'Traveling or studying in a foreign country is an exhilarating adventure, but it frequently comes with the challenge of culture shock. Unfamiliar social customs, diverse communication styles, and unexpected culinary norms can initially feel bewildering or exhausting. Successful travelers navigate this transitional phase by cultivating genuine curiosity rather than quick judgment. Keeping an open mind, asking polite questions, and accepting occasional misunderstandings as natural learning opportunities transforms awkward encounters into memorable experiences. Embracing cultural differences broadens your worldview and fosters deep empathy for global communities.',
  },
  {
    title: 'Digital Minimalism in Everyday Life',
    level: 'Intermediate',
    text: 'Modern smartphones deliver endless convenience, yet constant notifications, infinite social media feeds, and breaking news alerts can fracture our attention span. Practicing digital minimalism does not mean abandoning technology altogether; instead, it involves using digital tools with deliberate intention. Setting boundaries—such as designating phone-free meal times, turning off nonessential app alerts, and keeping devices out of the bedroom—creates mental space for quiet reflection, deep study, and meaningful face-to-face conversations. Protecting your attention allows you to regain control over how you spend your valuable time.',
  },
  {
    title: 'The Science of Daily Exercise',
    level: 'Intermediate',
    text: 'Regular physical activity yields profound benefits that extend far beyond building muscular strength or cardiovascular endurance. When you engage in moderate exercise like cycling, jogging, or brisk walking, your brain releases endorphins and neurotrophic factors that elevate mood and alleviate anxiety. Furthermore, physical movement enhances blood circulation to the prefrontal cortex, boosting problem-solving capabilities and mental sharpness. You do not need to spend hours in an expensive gym to reap these rewards; twenty to thirty minutes of daily movement is sufficient to preserve long-term vitality.',
  },
  {
    title: 'Financial Literacy for Young Adults',
    level: 'Intermediate',
    text: 'Understanding how to manage personal finances is one of the most practical skills a young adult can acquire. It begins with creating a realistic monthly budget that distinguishes between essential needs and discretionary desires. Building an emergency savings fund provides a vital safety cushion against unexpected medical expenses or car repairs. Additionally, learning how compound interest works encourages early saving and prudent investing. By avoiding unnecessary consumer debt and living comfortably within your means, you lay the foundation for enduring financial independence and peace of mind.',
  },
  {
    title: 'Public Speaking Without Panic',
    level: 'Intermediate',
    text: 'Glossophobia, or the fear of speaking in front of an audience, is remarkably common among students and professionals alike. Experiencing a racing heartbeat and sweaty palms before a presentation is simply your body preparing for action. You can channel this nervous energy constructively through meticulous preparation and focused rehearsal. Practice delivering your talk aloud several times, concentrating on a measured pace and deliberate pauses. Remember that the audience is genuinely interested in your message, not looking for perfection. With each presentation, your confidence grows steadily.',
  },
  {
    title: 'The Value of Constructive Feedback',
    level: 'Intermediate',
    text: 'Receiving criticism about your work can feel uncomfortable, particularly when you have invested substantial time and emotional effort into a project. However, learning to separate your personal identity from your output is essential for continuous growth. Constructive feedback highlights blind spots you might have overlooked and offers actionable insights for refinement. Instead of reacting defensively, thank the reviewer, ask clarifying questions, and evaluate their suggestions objectively. Embracing honest feedback with humility and resilience accelerates your development as a skilled, adaptable professional.',
  },
  {
    title: 'Why We Need Urban Green Spaces',
    level: 'Intermediate',
    text: 'As cities grow denser and skyscrapers dominate the skyline, urban green spaces like public parks and community gardens become vital lifelines. These natural areas absorb atmospheric carbon dioxide, mitigate the urban heat island effect, and provide critical habitats for urban wildlife. Beyond environmental advantages, green spaces offer city dwellers peaceful environments to decompress, exercise, and socialize. Scientific studies demonstrate that even brief interactions with natural scenery significantly reduce cortisol levels, fostering healthier, happier communities within bustling metropolitan centers.',
  },
  {
    title: 'The Importance of Lifelong Reading',
    level: 'Intermediate',
    text: 'Reading regularly is one of the most effective ways to expand your vocabulary, refine your critical thinking, and strengthen your imagination. Whether you immerse yourself in literary fiction, historical biographies, or scientific journalism, books invite you to step into perspectives vastly different from your own. This immersive experience deepens emotional empathy and sharpens your analytical skills. Setting aside just twenty minutes each evening to read consistently replaces mindless digital scrolling with nourishing intellectual stimulation, enriching your understanding of the world year after year.',
  },
  {
    title: 'Collaboration in Diverse Teams',
    level: 'Intermediate',
    text: 'Modern workplaces increasingly bring together individuals from diverse cultural backgrounds, disciplines, and communication styles. While diversity fuels innovation by offering multifaceted approaches to complex problems, it also demands exceptional interpersonal sensitivity. Successful teamwork hinges on psychological safety—an environment where team members feel comfortable voicing bold ideas or admitting mistakes without fear of ridicule. By respecting diverse viewpoints, maintaining transparent communication, and uniting behind a common objective, diverse groups achieve outcomes that far surpass individual contributions.',
  },
  {
    title: 'The Impact of Fast Fashion on the Planet',
    level: 'Intermediate',
    text: 'The rise of fast fashion has made trendy clothing remarkably inexpensive, yet this rapid production cycle carries severe environmental consequences. Textile factories consume billions of liters of fresh water annually and release hazardous chemical dyes into nearby river systems. Furthermore, millions of low-quality garments end up discarded in overflowing landfills after being worn only a handful of times. Becoming a conscious consumer involves purchasing durable clothing, mending damaged garments, and supporting ethical brands, ensuring that our fashion choices do not burden future generations.',
  },
  {
    title: 'Mastering Time Management with Time Blocking',
    level: 'Intermediate',
    text: 'Many people struggle with endless to-do lists that generate anxiety rather than productivity. Time blocking is a practical organizational technique where you divide your day into distinct blocks of dedicated time, assigning specific tasks to each window. For instance, you might reserve nine to eleven for deep writing, followed by an hour for emails and administrative calls. By eliminating multitasking and treating each scheduled block as an unbreakable appointment, you protect your focus from interruptions and make consistent progress on major priorities.',
  },
  {
    title: 'Understanding Emotional Intelligence',
    level: 'Intermediate',
    text: 'While intellectual ability is undeniably valuable, emotional intelligence—the capacity to recognize, understand, and manage emotions in ourselves and others—often determines long-term success. Individuals with high emotional intelligence excel at self-regulation; they pause thoughtfully before responding to frustrating circumstances rather than reacting impulsively. They also display keen social awareness, accurately reading interpersonal dynamics and responding with empathy. Cultivating emotional maturity fosters harmonious personal relationships and distinguishes outstanding leaders who inspire trust and loyalty.',
  },
  {
    title: 'Renewable Energy and Our Future',
    level: 'Intermediate',
    text: 'The global transition toward clean, renewable energy sources represents one of the most critical endeavors of our era. Solar panels and wind turbines now generate electricity at unprecedented scale and decreasing costs, reducing reliance on finite fossil fuels. Advances in high-capacity battery storage are resolving intermittency issues, allowing clean energy to power electric grids even when the sun is not shining. Embracing sustainable energy infrastructure not only curbs greenhouse gas emissions but also creates millions of green jobs worldwide, safeguarding our planet’s ecological future.',
  },
  {
    title: 'The Psychology of Procrastination',
    level: 'Intermediate',
    text: 'Contrary to widespread belief, procrastination is rarely caused by laziness or poor time management. Psychologists have found that delaying tasks is primarily an emotional regulation issue: we avoid activities that trigger anxiety, self-doubt, or fear of failure. To overcome this inertia, break intimidating projects into ridiculously small, manageable actions. Instead of resolving to write a ten-page essay, commit to writing just one opening paragraph. Lowering the initial barrier reduces emotional resistance, allowing momentum to carry you forward toward successful completion.',
  },
  {
    title: 'Volunteering and Community Impact',
    level: 'Intermediate',
    text: 'Dedication to community service enriches both the giver and the recipient. When you volunteer at a local food pantry, animal shelter, or community tutoring center, you contribute directly to the well-being of vulnerable individuals. Simultaneously, volunteering broadens your perspective, connects you with compassionate neighbors, and provides meaningful purpose outside of personal ambition. Studies show that people who volunteer regularly report higher levels of life satisfaction and emotional resilience, proving that helping others is a powerful pathway to personal happiness.',
  },
  {
    title: 'The Art of Mindful Eating',
    level: 'Intermediate',
    text: 'In our fast-paced society, meals are frequently consumed hurriedly while staring at computer screens or scrolling through social media. Mindful eating encourages us to slow down and engage all our senses with the food before us. Notice the vibrant colors, savory aromas, and diverse textures of your meal, chewing each bite thoroughly. Eating without distractions allows your brain sufficient time to register feelings of fullness, preventing overeating and fostering a healthier, more appreciative relationship with nutrition and culinary craftsmanship.',
  },
  {
    title: 'Critical Thinking in the Information Age',
    level: 'Intermediate',
    text: 'We live in an era characterized by an unprecedented deluge of digital information, making critical thinking an indispensable life skill. Rather than accepting online headlines at face value, discerning readers evaluate the credibility of sources, search for corroborating evidence, and remain vigilant against cognitive biases. Asking who created the content and what perspective they represent prevents the spread of misinformation. Developing healthy intellectual skepticism enables you to form balanced opinions and make well-informed decisions in an increasingly complex society.',
  },

  // --- ADVANCED (20 passages, 100-120 words) ---
  {
    title: 'Navigating Ambiguity in Modern Careers',
    level: 'Advanced',
    text: 'The contemporary professional landscape is characterized by rapid technological innovation and volatile market conditions, rendering rigid, linear career pathways increasingly obsolete. Today’s professionals must cultivate adaptability and an appetite for navigating ambiguity with composure. Rather than seeking definitive blueprints, forward-thinking individuals treat uncertainty as an expansive canvas for creative experimentation. They continuously expand their interdisciplinary competencies, combining technical literacy with nuanced interpersonal acumen. By viewing complex challenges not as insurmountable obstacles but as opportunities to acquire novel capabilities, resilient workers future-proof their careers and emerge as invaluable problem-solvers in dynamic, unpredictable organizational environments.',
  },
  {
    title: 'Cultural Preservation in a Globalized Era',
    level: 'Advanced',
    text: 'As global telecommunications and international commerce bridge continents with astonishing speed, questions regarding cultural preservation become profoundly urgent. While global interconnectedness facilitates economic prosperity and cross-pollination of creative ideas, it risks homogenizing regional traditions, indigenous languages, and distinctive artisanal crafts. Preserving intangible cultural heritage requires deliberate societal commitment: incorporating oral histories into school curricula, supporting independent local craftspeople, and leveraging digital archives to document endangered dialects. True global sophistication does not demand the erasure of unique cultural identities; rather, it thrives when diverse communities proudly celebrate their ancestral heritage while contributing actively to the shared tapestry of human civilization.',
  },
  {
    title: 'The Architecture of Human Empathy',
    level: 'Advanced',
    text: 'Empathy is frequently romanticized as an instinctive emotional sentiment, yet cognitive neuroscientists reveal it to be an intricate neural architecture that can be deliberately developed and expanded. Affective empathy allows us to resonate intuitively with another person’s visceral feelings, whereas cognitive empathy enables us to reconstruct their subjective worldview with analytical detachment. Cultivating both dimensions safeguards against emotional burnout while ensuring compassionate, constructive action. In an increasingly polarized social climate, stepping outside our immediate ideological comfort zones to genuinely comprehend opposing perspectives is not a symptom of intellectual weakness; rather, it represents the highest manifestation of emotional maturity and democratic citizenship.',
  },
  {
    title: 'Ethical Frontiers in Artificial Intelligence',
    level: 'Advanced',
    text: 'The rapid integration of machine learning algorithms into criminal justice, healthcare diagnostics, and financial lending underscores the imperative for robust ethical frameworks. While algorithmic models deliver unprecedented computational efficiency, they inevitably reflect the historical biases embedded within their underlying training datasets. Ensuring fairness requires multidisciplinary oversight involving software architects, bioethicists, legal scholars, and affected community representatives. We must establish rigorous audit mechanisms that scrutinize automated decision-making processes for algorithmic bias, opacity, and unintended discriminatory consequences. Developing artificial intelligence responsibly demands that technological capability remain steadfastly anchored to human dignity, transparency, and equal opportunity for every individual.',
  },
  {
    title: 'The Philosophy of Stoic Resilience',
    level: 'Advanced',
    text: 'Ancient Stoic philosophy, articulated by thinkers like Epictetus and Marcus Aurelius, offers timeless psychological equilibrium for navigating contemporary turbulence. At the core of Stoicism lies the dichotomy of control: distinguishing sharply between external events beyond our influence and internal judgments wholly within our command. Economic downturns, geopolitical tensions, and unforeseen adversities cannot diminish our character unless we surrender our rational agency to grievance or despair. By focusing our energy exclusively on principled action, self-discipline, and benevolence toward others, we construct an unshakeable inner citadel that remains serene regardless of external vicissitudes and challenges.',
  },
  {
    title: 'Urban Design and Human Flourishing',
    level: 'Advanced',
    text: 'The physical architecture of a city profoundly influences the psychological and physical well-being of its residents. For decades, urban planning prioritized private automobiles, resulting in sprawling suburbs, congested highways, and social isolation. Progressive urbanists now champion human-centric design: pedestrian-friendly corridors, protected bicycle lanes, accessible public transit, and vibrant civic squares. When neighborhoods provide mixed-use zoning where residences, grocery stores, and cultural centers coexist within a fifteen-minute stroll, civic cohesion blossoms. Thoughtful urban design transforms asphalt jungles into nurturing environments that foster social spontaneity, physical vitality, and communal resilience.',
  },
  {
    title: 'The Dual Nature of Scientific Innovation',
    level: 'Advanced',
    text: 'Scientific discovery has consistently served as the primary catalyst for human emancipation from disease, poverty, and isolation. From the synthesis of antimicrobial pharmaceuticals to the emergence of renewable photovoltaic systems, technological breakthroughs have extended life expectancy and elevated living standards across the globe. However, every monumental scientific capability arrives with profound existential responsibilities. Nuclear physics unlocked boundless clean energy alongside catastrophic weaponry; genetic engineering offers cures for hereditary illnesses while raising complex ethical questions regarding biological equity. The true measure of civilizational progress lies not merely in our technical ingenuity, but in the moral wisdom with which we govern our inventions.',
  },
  {
    title: 'The Psychological Mechanics of Creative Flow',
    level: 'Advanced',
    text: 'Flow, a profound psychological state identified by psychologist Mihaly Csikszentmihalyi, occurs when an individual becomes completely immersed in an activity with energized focus and deep enjoyment. Achieving this optimal experience requires an exquisite balance between high challenge and high skill: if the task is too simple, apathy ensues; if excessively demanding, debilitating anxiety paralyzes action. During flow, self-consciousness dissolves, distorted time perception emerges, and intrinsic motivation replaces external validation. Fostering environments that minimize digital fragmentation and celebrate deep, uninterrupted contemplation enables scientists, artists, and scholars to produce their most transcendent and original contributions to human culture.',
  },
  {
    title: 'Ecosystem Regeneration and Biodiversity',
    level: 'Advanced',
    text: 'For centuries, human economic development operated under the extractive assumption that natural resources were virtually infinite, leading to alarming rates of deforestation, soil degradation, and species extinction. In response, modern ecological scientists advocate for regenerative frameworks that actively restore degraded ecosystems rather than merely slowing down destruction. Rewilding initiatives reintroduce apex predators and native flora to revive ecological trophic cascades, while regenerative agriculture restores soil microbiome health through cover cropping and minimized tilling. Rebuilding ecological resilience recognizes that human economic prosperity is inextricably intertwined with the intricate health of planetary biomes.',
  },
  {
    title: 'The Evolution of Written Language',
    level: 'Advanced',
    text: 'The invention of written language stands as humanity’s most revolutionary cognitive leap, enabling abstract ideas and experiential knowledge to transcend the biological limitations of human memory and mortality. From ancient Sumerian cuneiform etched into clay tablets to the mechanical movable type of the Gutenberg press, each communicative medium has restructured how societies think and organize. In our digital epoch, hyperlinked text and instant multimedia messaging have accelerated communication while shortening contemplative reflection. Reflecting upon the history of literacy reminds us that language is not merely an instrumental tool for data transfer, but the living vessel that carries our deepest cultural memories.',
  },
  {
    title: 'The Paradox of Choice in Consumer Society',
    level: 'Advanced',
    text: 'Contemporary Western consumer society operates upon the fundamental dogma that maximizing individual choice inevitably maximizes human freedom and happiness. However, as psychologist Barry Schwartz perceptively argued, an overwhelming profusion of options frequently produces psychological paralysis rather than liberation. When confronted with hundreds of competing mutual funds, career options, or digital devices, decision-making becomes burdensome and anxiety-provoking. Furthermore, post-decision regret intensifies, as consumers obsess over the hypothetical virtues of rejected alternatives. True personal autonomy often blossoms when we embrace self-imposed constraints, deliberate simplification, and gratitude for that which is genuinely sufficient.',
  },
  {
    title: 'The Sociology of Shared Rituals',
    level: 'Advanced',
    text: 'Across every recorded civilization, human beings have gathered to enact communal rituals—from seasonal harvest celebrations and rite-of-passage ceremonies to weekly shared meals. Anthropologists emphasize that these repeated cultural practices are essential mechanisms for generating social solidarity and reinforcing shared moral values. In our hyper-individualistic contemporary era, many traditional civic rituals have decayed, leaving a vacuum often filled by loneliness and social fragmentation. Reimagining collective rituals—whether through neighborhood clean-up days, shared musical performances, or communal athletic events—revitalizes social capital and reminds us of our deep, interdependence with those who share our physical space.',
  },
  {
    title: 'The Neuroscience of Habitual Thought',
    level: 'Advanced',
    text: 'Neuroplasticity demonstrates that the human brain continuously reorganizes its neural architecture in direct response to repeated experiential patterns and conscious attention. Every time we indulge in cynical rumination or habitual grievance, we reinforce synaptic pathways that make negative interpretations increasingly automatic. Conversely, deliberately practicing perspective-taking, mindfulness, and cognitive reappraisal physically strengthens the prefrontal regions responsible for emotional regulation and creative problem-solving. We are not passive victims of predetermined psychological wiring; through disciplined mental practice, we actively sculpt our neural substrates, cultivating intellectual resilience and enduring tranquility throughout our lives.',
  },
  {
    title: 'Rethinking Higher Education in the 21st Century',
    level: 'Advanced',
    text: 'Higher educational institutions worldwide face unprecedented scrutiny regarding tuition affordability, pedagogical relevance, and graduate career readiness. In an era where information is instantly accessible, traditional lecture-based instructional models feel increasingly antiquated. Visionary universities are transitioning toward project-based experiential learning, where students synthesize interdisciplinary knowledge to solve real-world dilemmas such as urban water purification or clean energy distribution. Rather than merely certifying domain-specific technical skills destined for obsolescence, modern education must prioritize meta-learning: teaching students how to think critically, evaluate evidence rigorously, communicate persuasively, and learn autonomously throughout their professional lives.',
  },
  {
    title: 'The Dynamics of Intergenerational Dialogue',
    level: 'Advanced',
    text: 'Bridging the experiential divide between older and younger generations is essential for maintaining a cohesive and forward-looking society. Younger cohorts often contribute urgent moral clarity regarding climate sustainability, technological fluency, and social equity, challenging stagnant institutional traditions. Meanwhile, older generations offer hard-earned historical perspective, institutional memory, and emotional equilibrium forged through surviving economic and personal adversities. When societal discourse degenerates into dismissive generational caricatures, both wisdom and innovation suffer. Fostering genuine intergenerational partnerships combines youthful idealism with mature prudence, creating durable solutions for civilizational challenges.',
  },
  {
    title: 'The Geopolitics of Clean Water Access',
    level: 'Advanced',
    text: 'While petroleum dominated twentieth-century geopolitical conflicts, freshwater accessibility is rapidly emerging as the defining resource challenge of the twenty-first century. Climate disruption, unchecked industrial contamination, and agricultural overextraction have depleted vital transboundary aquifers and river basins worldwide. Ensuring equitable water distribution requires sophisticated diplomatic cooperation alongside technological innovations like solar-powered desalination and closed-loop wastewater reclamation. Recognizing potable water as a fundamental human right rather than a speculative commodity is essential for averting regional instability and guaranteeing humanitarian dignity for vulnerable populations around the globe.',
  },
  {
    title: 'The Art of Constructive Disagreement',
    level: 'Advanced',
    text: 'In healthy democratic societies and thriving intellectual institutions, disagreement is not an unfortunate pathology to be suppressed; it is the vital engine of intellectual refinement and institutional vitality. However, productive debate requires participants to practice intellectual humility: adhering to the principle of charity by interpreting an opponent’s arguments in their strongest possible light before offering reasoned counterarguments. When discourse degenerates into ad hominem attacks, tribal loyalty, and caricature, collective intelligence evaporates. Reclaiming the art of vigorous, respectful debate enables communities to discover nuanced truths that transcend individual dogmatism.',
  },
  {
    title: 'The Aesthetic Power of Minimalist Design',
    level: 'Advanced',
    text: 'Minimalist aesthetics, prominent in Japanese Zen philosophy and Scandinavian architectural traditions, is frequently mischaracterized as stark deprivation or cold sterile austerity. In reality, true minimalism is an intentional subtraction of superfluous elements in order to elevate that which is fundamentally meaningful. By stripping away extraneous decorative ornament, designers draw attention to natural material textures, spatial proportions, and natural light. In both physical environments and digital user interfaces, minimalist clarity reduces sensory overload, calming the nervous system and fostering serene contemplation in a world saturated with visual noise.',
  },
  {
    title: 'The Ethics of Global Supply Chains',
    level: 'Advanced',
    text: 'The hyper-efficient global supply networks of multinational corporations have delivered unprecedented abundance and affordability to consumers across industrialized nations. Yet, beneath this seamless logistics veneer frequently lie severe labor exploitation, hazardous working conditions, and unchecked environmental degradation in developing countries. Corporate accountability requires comprehensive traceability: implementing decentralized digital auditing, mandating living wages throughout subcontracted manufacturing tiers, and enforcing stringent ecological standards. Ethical globalization demands that economic efficiency never be purchased at the exorbitant cost of human exploitation or environmental destruction in vulnerable regions.',
  },
  {
    title: 'The Cultivation of Intellectual Curiosity',
    level: 'Advanced',
    text: 'Intellectual curiosity is the luminous spark that separates passive mechanical existence from a richly engaged life of the mind. While formal education frequently rewards conformity and narrow exam memorization, true polymaths nurture an insatiable hunger to understand how disparate facets of reality connect. They read omnivorously across physics, philosophy, literature, and economics, embracing the vulnerability of being a beginner in unfamiliar disciplines. In a world increasingly dominated by narrow specialization and algorithmic recommendation loops, cultivating broad, independent curiosity remains humanity’s most reliable safeguard against dogmatism and intellectual stagnation.',
  },
];

// 30 General Debate Topics for Learners
const GENERAL_DEBATE_TOPICS = [
  {
    topic: 'Should smartphone use be restricted in schools and colleges?',
    context: 'Many schools debate whether allowing mobile devices in classrooms distracts students from learning or provides essential educational tools.',
    level: 'Intermediate',
    forKeyPoints: [
      'Reduces classroom distractions and improves student focus during lectures.',
      'Encourages real-world face-to-face social interactions during lunch and breaks.',
      'Minimizes digital cheating on examinations and reduces cyberbullying during school hours.',
    ],
    againstKeyPoints: [
      'Smartphones enable instant access to digital dictionaries, research papers, and educational apps.',
      'Prepares students for modern workplaces where managing digital tools responsibly is essential.',
      'Ensures students can quickly reach parents or emergency services in urgent situations.',
    ],
  },
  {
    topic: 'Is remote work better than working in a traditional office?',
    context: 'The shift toward remote work has transformed lifestyle, productivity, and office culture across many industries.',
    level: 'Intermediate',
    forKeyPoints: [
      'Eliminates stressful daily commutes, saving significant time and transit expenses.',
      'Provides flexible scheduling that enhances work-life balance and family time.',
      'Enables companies to hire talented people regardless of geographic location.',
    ],
    againstKeyPoints: [
      'Reduces spontaneous collaboration, mentorship, and creative brainstorming.',
      'Can blur the boundary between professional duties and personal relaxation at home.',
      'May lead to feelings of social isolation and disconnection from corporate culture.',
    ],
  },
  {
    topic: 'Should practical life skills be taught as mandatory school subjects?',
    context: 'Many educators argue that schools focus heavily on theoretical academics while neglecting essential everyday survival skills.',
    level: 'Beginner',
    forKeyPoints: [
      'Teaches critical financial literacy, budgeting, and tax basics before adulthood.',
      'Equips students with fundamental culinary, home maintenance, and basic medical skills.',
      'Reduces young adult anxiety by teaching practical self-reliance and problem solving.',
    ],
    againstKeyPoints: [
      'School schedules are already crowded with rigorous academic and scientific requirements.',
      'Parents and families are traditionally responsible for teaching personal life skills.',
      'Standardizing life skills grading across diverse socioeconomic backgrounds can be difficult.',
    ],
  },
  {
    topic: 'Does social media do more harm than good to young people?',
    context: 'With billions active on social media platforms, psychologists debate its impact on mental health versus connectivity.',
    level: 'Intermediate',
    forKeyPoints: [
      'Encourages unrealistic social comparisons and fuels teenage anxiety and depression.',
      'Addictive algorithms shorten attention spans and disrupt healthy sleep patterns.',
      'Facilitates the rapid spread of harmful misinformation and cyberbullying.',
    ],
    againstKeyPoints: [
      'Allows individuals to find supportive global communities and share creative work.',
      'Provides rapid access to educational news, career networking, and social causes.',
      'Helps distant friends and family stay intimately connected across long distances.',
    ],
  },
  {
    topic: 'Should standardized exams be replaced with continuous assessments?',
    context: 'Traditional high-stakes exams are being reconsidered in favor of ongoing portfolios and project evaluations.',
    level: 'Advanced',
    forKeyPoints: [
      'Single exams test memorization under extreme stress rather than true understanding.',
      'Project-based continuous evaluation reflects real-world workplace collaborative skills.',
      'Reduces student burnout, test anxiety, and unhealthy cramming habits.',
    ],
    againstKeyPoints: [
      'Standardized tests provide objective, uniform benchmarks across different schools.',
      'Continuous grading can increase teacher workload and introduce subjective grading bias.',
      'High-stakes examinations prepare students for rigorous professional certification standards.',
    ],
  },
  {
    topic: 'Is learning a second language essential in the modern global economy?',
    context: 'With automatic digital translation software improving, scholars question whether bilingualism remains crucial.',
    level: 'Intermediate',
    forKeyPoints: [
      'Enhances cognitive neuroplasticity, memory retention, and abstract problem solving.',
      'Builds deep cultural empathy and unlocks international career and travel opportunities.',
      'Human nuances, idioms, and emotional rapport cannot be replicated by automated software.',
    ],
    againstKeyPoints: [
      'Real-time AI voice translation tools are becoming fast, cheap, and highly accurate.',
      'Students could invest limited time mastering STEM or technical programming skills instead.',
      'English already serves as the universal lingua franca across global business and commerce.',
    ],
  },
  {
    topic: 'Should cities invest more in public transit than expanding highways?',
    context: 'Urban planners debate whether building more lanes solves traffic or whether rail and buses are the only sustainable path.',
    level: 'Intermediate',
    forKeyPoints: [
      'Public transit reduces harmful carbon emissions, urban smog, and fuel consumption.',
      'Wider highways cause induced demand, which leads to worse traffic congestion over time.',
      'Affordable transit offers equal mobility to citizens who cannot afford private automobiles.',
    ],
    againstKeyPoints: [
      'Highways allow flexible point-to-point transportation for suburban and rural residents.',
      'Heavy rail infrastructure requires immense upfront taxpayer capital and decades to construct.',
      'Commercial freight and delivery trucks rely heavily on road networks to distribute goods.',
    ],
  },
  {
    topic: 'Is printed paper books superior to reading on digital e-readers?',
    context: 'The debate between tactile physical books and convenient digital screens continues among passionate readers.',
    level: 'Beginner',
    forKeyPoints: [
      'Physical pages cause zero eye strain and promote deeper, distraction-free immersion.',
      'Tactile memory and spatial orientation aid comprehension and long-term retention.',
      'Books do not require battery charging, software updates, or device screens.',
    ],
    againstKeyPoints: [
      'E-readers can store thousands of books in a lightweight, travel-friendly device.',
      'Adjustable fonts and built-in dictionary lookups assist language learners and seniors.',
      'Digital publication eliminates paper waste and reduces global book shipping costs.',
    ],
  },
  {
    topic: 'Should public parks and recreation centers be completely free to all citizens?',
    context: 'Some municipalities charge user fees for sports courts and parks, while others advocate complete free public access.',
    level: 'Beginner',
    forKeyPoints: [
      'Promotes public physical fitness, community gathering, and mental health for all income levels.',
      'Public spaces funded by general taxation should be unconditionally accessible to everyone.',
      'Prevents socioeconomic segregation in neighborhood recreational opportunities.',
    ],
    againstKeyPoints: [
      'Nominal entry fees help fund ongoing maintenance, clean restrooms, and security staff.',
      'User fees prevent overcrowding and vandalism in popular sports complexes.',
      'Private-public partnerships can maintain higher quality facilities than strained city budgets.',
    ],
  },
  {
    topic: 'Should homework be banned for primary and middle school students?',
    context: 'Educational psychologists debate whether daily homework enhances academic mastery or robs children of family time and play.',
    level: 'Intermediate',
    forKeyPoints: [
      'Children need unstructured free play and physical exercise for healthy brain development.',
      'Heavy homework creates unnecessary family stress and leads to early academic burnout.',
      'Research shows minimal correlation between heavy homework and elementary academic success.',
    ],
    againstKeyPoints: [
      'Homework reinforces lessons taught during the day and builds personal discipline.',
      'Provides parents insight into what their children are learning in the classroom.',
      'Prepares students for the independent study habits demanded by higher education.',
    ],
  },
];

// General Listening Clips
const GENERAL_LISTENING_CLIPS = [
  {
    title: 'Morning Routine for Better Energy',
    level: 'Beginner',
    accent: 'General American',
    script: 'Starting your morning with a glass of water and ten minutes of gentle stretching can transform your energy levels throughout the entire day. Nutritionists recommend eating a protein-rich breakfast and avoiding heavy sugary snacks early in the morning.',
    question: 'According to the speaker, what morning habit helps sustain energy levels?',
  },
  {
    title: 'The Benefits of Taking Short Study Breaks',
    level: 'Intermediate',
    accent: 'General American',
    script: 'Psychological research demonstrates that continuous studying without pauses leads to mental fatigue. Taking a brief five-minute walk or resting your eyes between forty-five-minute study sessions significantly enhances information retention and creative problem-solving.',
    question: 'Why does the speaker recommend taking short breaks during study sessions?',
  },
  {
    title: 'Effective Workplace Communication',
    level: 'Advanced',
    accent: 'British',
    script: 'In modern collaborative work environments, clear and succinct communication prevents misunderstandings. Rather than sending long, ambiguous emails, professionals should articulate their key message in the opening sentences and confirm mutual expectations.',
    question: 'What is the primary communication advice offered for professional workplaces?',
  },
  {
    title: 'Exploring Nature and Well-Being',
    level: 'Beginner',
    accent: 'General American',
    script: 'Spending time outdoors in parks or forests reduces stress and lowers blood pressure. Even a short walk beneath green trees helps calm the nervous system and refreshes tired eyes from digital screens.',
    question: 'How does spending time outdoors benefit our physical and mental health?',
  },
  {
    title: 'Managing Everyday Time Wisely',
    level: 'Intermediate',
    accent: 'General American',
    script: 'Prioritizing three key tasks every morning ensures steady productivity without feeling overwhelmed. When you finish the most challenging project first, the rest of your daily goals feel much more achievable.',
    question: 'What technique does the speaker suggest for prioritizing daily responsibilities?',
  },
  {
    title: 'The Art of Active Listening',
    level: 'Advanced',
    accent: 'General American',
    script: 'True listening requires quiet attention rather than drafting your response while someone else is speaking. Acknowledging emotions and clarifying key points fosters profound mutual trust and genuine understanding.',
    question: 'What does the speaker identify as the foundation of true active listening?',
  },
];

// General Vocabulary Words
const GENERAL_VOCAB_WORDS = [
  { word: 'Meticulous', partOfSpeech: 'adjective', level: 'Intermediate', meaning: 'Showing great attention to detail; very careful and precise.', example: 'She kept meticulous notes during every lecture, which helped her ace the exam.' },
  { word: 'Ambiguous', partOfSpeech: 'adjective', level: 'Intermediate', meaning: 'Open to more than one interpretation; having a double or unclear meaning.', example: 'His instructions were ambiguous, leaving the team confused about what to do next.' },
  { word: 'Resilient', partOfSpeech: 'adjective', level: 'Beginner', meaning: 'Able to withstand or recover quickly from difficult conditions.', example: 'Children are remarkably resilient and often adapt quickly to new surroundings.' },
  { word: 'Candid', partOfSpeech: 'adjective', level: 'Advanced', meaning: 'Truthful and straightforward; frank and honest.', example: 'The mentor gave candid feedback that helped the student improve her speaking style.' },
  { word: 'Diligent', partOfSpeech: 'adjective', level: 'Beginner', meaning: 'Having or showing care and conscientiousness in one’s work or duties.', example: 'Thanks to her diligent study habits, she mastered the English vocabulary quickly.' },
  { word: 'Pragmatic', partOfSpeech: 'adjective', level: 'Advanced', meaning: 'Dealing with things sensibly and realistically based on practical considerations.', example: 'Instead of dreaming about ideal conditions, they took a pragmatic approach to the project.' },
  { word: 'Coherent', partOfSpeech: 'adjective', level: 'Intermediate', meaning: 'Logical and consistent; easy to understand.', example: 'He gave a coherent speech that clearly laid out the three main arguments.' },
  { word: 'Versatile', partOfSpeech: 'adjective', level: 'Intermediate', meaning: 'Able to adapt or be adapted to many different functions or activities.', example: 'A smartphone is a versatile device that serves as a phone, camera, and computer.' },
  { word: 'Eloquent', partOfSpeech: 'adjective', level: 'Advanced', meaning: 'Fluent or persuasive in speaking or writing.', example: 'The guest speaker delivered an eloquent presentation on cultural diversity.' },
  { word: 'Empathy', partOfSpeech: 'noun', level: 'Beginner', meaning: 'The ability to understand and share the feelings of another.', example: 'Showing empathy toward classmates makes everyone feel welcomed and respected.' },
  { word: 'Persevere', partOfSpeech: 'verb', level: 'Intermediate', meaning: 'Continue in a course of action even in the face of difficulty or with little prospect of success.', example: 'If you persevere with daily pronunciation practice, you will notice steady progress.' },
  { word: 'Concise', partOfSpeech: 'adjective', level: 'Intermediate', meaning: 'Giving a lot of information clearly and in a few words; brief but comprehensive.', example: 'A concise email gets your point across without wasting the reader’s time.' },
  { word: 'Authentic', partOfSpeech: 'adjective', level: 'Beginner', meaning: 'Of undisputed origin; genuine and real.', example: 'The restaurant serves authentic Mediterranean dishes made from traditional recipes.' },
  { word: 'Collaborate', partOfSpeech: 'verb', level: 'Beginner', meaning: 'Work jointly on an activity, especially to produce or create something.', example: 'Students were asked to collaborate in pairs to design a campus green initiative.' },
  { word: 'Nuance', partOfSpeech: 'noun', level: 'Advanced', meaning: 'A subtle difference in or shade of meaning, expression, or sound.', example: 'Understanding the nuances of English humor takes time and wide reading.' },
  { word: 'Curiosity', partOfSpeech: 'noun', level: 'Beginner', meaning: 'A strong desire to know or learn something.', example: 'Natural curiosity drives scientists to explore unexplained natural phenomena.' },
  { word: 'Integrity', partOfSpeech: 'noun', level: 'Intermediate', meaning: 'The quality of being honest and having strong moral principles.', example: 'He is respected for his professional integrity and commitment to fair play.' },
  { word: 'Optimism', partOfSpeech: 'noun', level: 'Beginner', meaning: 'Hopefulness and confidence about the future or the success of something.', example: 'Her cheerful optimism kept the team motivated during difficult deadlines.' },
  { word: 'Articulate', partOfSpeech: 'verb', level: 'Advanced', meaning: 'Express an idea or feeling fluently and coherently.', example: 'She was able to articulate her career ambitions with remarkable poise and clarity.' },
  { word: 'Mindful', partOfSpeech: 'adjective', level: 'Intermediate', meaning: 'Conscious or aware of something; focusing attention on the present moment.', example: 'Being mindful of your tone of voice helps prevent unnecessary misunderstandings.' },
];

async function runSeed() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lingrow_ai';
  console.log('[SeedCurriculum] Connecting to:', uri);
  await mongoose.connect(uri);

  // 1. Deactivate department-specific legacy content (do not delete user history)
  console.log('[SeedCurriculum] Deactivating legacy department content...');
  const pDeact = await Passage.updateMany(
    { $or: [{ department: { $ne: 'General' } }, { source: 'scraped' }, { title: /Scraped Set/i }] },
    { $set: { active: false } }
  );
  console.log(`[SeedCurriculum] Deactivated ${pDeact.modifiedCount} legacy passages.`);

  const lDeact = await ListeningClip.updateMany(
    { $or: [{ department: { $ne: 'General' } }, { source: 'scraped' }, { title: /Scraped Set/i }] },
    { $set: { active: false } }
  );
  console.log(`[SeedCurriculum] Deactivated ${lDeact.modifiedCount} legacy listening clips.`);

  const dDeact = await DebateTopic.updateMany(
    { $or: [{ department: { $ne: 'General' } }, { source: 'scraped' }] },
    { $set: { active: false } }
  );
  console.log(`[SeedCurriculum] Deactivated ${dDeact.modifiedCount} legacy debate topics.`);

  const sDeact = await StoryPrompt.updateMany(
    { $or: [{ department: { $exists: true, $ne: null } }, { source: { $ne: 'general_curriculum' } }] },
    { $set: { active: false } }
  );
  console.log(`[SeedCurriculum] Deactivated ${sDeact.modifiedCount} legacy story prompts.`);

  // 2. Seed 60 General Read Aloud Passages (20 per level)
  console.log('[SeedCurriculum] Upserting 60 General Read Aloud passages...');
  let passagesUpserted = 0;
  for (const p of GENERAL_PASSAGES) {
    const wordCount = p.text.trim().split(/\s+/).length;
    await Passage.findOneAndUpdate(
      { title: p.title },
      {
        $set: {
          title: p.title,
          level: p.level,
          department: 'General',
          text: p.text,
          wordCount,
          source: 'curated',
          active: true,
        },
      },
      { upsert: true, new: true }
    );
    passagesUpserted++;
  }
  console.log(`[SeedCurriculum] Upserted ${passagesUpserted} general Read Aloud passages.`);

  // 3. Seed General Debate Topics
  console.log('[SeedCurriculum] Upserting General Debate Topics...');
  let debatesUpserted = 0;
  for (const d of GENERAL_DEBATE_TOPICS) {
    await DebateTopic.findOneAndUpdate(
      { topic: d.topic },
      {
        $set: {
          topic: d.topic,
          context: d.context,
          level: d.level,
          forKeyPoints: d.forKeyPoints,
          againstKeyPoints: d.againstKeyPoints,
          department: 'General',
          source: 'curated',
          active: true,
        },
      },
      { upsert: true, new: true }
    );
    debatesUpserted++;
  }
  console.log(`[SeedCurriculum] Upserted ${debatesUpserted} general debate topics.`);

  // 4. Seed General Listening Clips
  console.log('[SeedCurriculum] Upserting General Listening clips...');
  let clipsUpserted = 0;
  for (const c of GENERAL_LISTENING_CLIPS) {
    await ListeningClip.findOneAndUpdate(
      { title: c.title },
      {
        $set: {
          title: c.title,
          level: c.level,
          accent: c.accent,
          script: c.script,
          question: c.question,
          department: 'General',
          source: 'curated',
          active: true,
        },
      },
      { upsert: true, new: true }
    );
    clipsUpserted++;
  }
  console.log(`[SeedCurriculum] Upserted ${clipsUpserted} general listening clips.`);

  // 5. Seed General Vocabulary Words
  console.log('[SeedCurriculum] Upserting General Vocabulary words...');
  let vocabUpserted = 0;
  for (const v of GENERAL_VOCAB_WORDS) {
    await VocabWord.findOneAndUpdate(
      { word: v.word },
      {
        $set: {
          word: v.word,
          partOfSpeech: v.partOfSpeech,
          level: v.level,
          meaning: v.meaning,
          example: v.example,
          active: true,
        },
      },
      { upsert: true, new: true }
    );
    vocabUpserted++;
  }
  console.log(`[SeedCurriculum] Upserted ${vocabUpserted} general vocabulary words.`);

  // Verify counts
  const activePassages = await Passage.countDocuments({ active: true });
  const activeDebates = await DebateTopic.countDocuments({ active: true });
  const activeClips = await ListeningClip.countDocuments({ active: true });
  const activeStories = await StoryPrompt.countDocuments({ active: true });
  const activeVocab = await VocabWord.countDocuments({ active: true });

  console.log('=== Seed Migration Summary ===');
  console.log(`Active General Passages: ${activePassages} (Target >= 60)`);
  console.log(`Active General Debate Topics: ${activeDebates} (Target >= 10)`);
  console.log(`Active General Listening Clips: ${activeClips} (Target >= 5)`);
  console.log(`Active General Stories: ${activeStories} (Target >= 60)`);
  console.log(`Active General Vocab Words: ${activeVocab}`);

  await mongoose.disconnect();
  console.log('[SeedCurriculum] Done successfully.');
}

if (require.main === module) {
  runSeed().catch((err) => {
    console.error('[SeedCurriculum] Error:', err);
    process.exit(1);
  });
}

module.exports = { runSeed, GENERAL_PASSAGES, GENERAL_DEBATE_TOPICS, GENERAL_VOCAB_WORDS };
