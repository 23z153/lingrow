require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
/**
 * seedStories.js
 * Migration & seeding script:
 * 1. Marks all existing department stories as inactive (active: false).
 * 2. Seeds 60 high-quality, general English stories (20 Beginner, 20 Intermediate, 20 Advanced).
 * 3. Preserves all user attempts and existing records intact.
 */

const mongoose = require('mongoose');
const StoryPrompt = require('./models/StoryPrompt');

const GENERAL_STORIES = [
  /* =========================================================================
     20 BEGINNER STORIES (Everyday life, school, friendship, simple problem-solving)
     ========================================================================= */
  {
    title: 'The Lost Library Book',
    theme: 'School & College Life',
    level: 'Beginner',
    openingNarration: 'Rohan searched his backpack three times, but the history textbook was nowhere to be found. The librarian had told him it was due today before the bell rang. He remembered reading near the park bench during lunchtime. With only twenty minutes left, he decided to retrace his steps.',
    prompt: 'Continue the story for 45 to 60 seconds. Describe where you found the book and how you returned it on time. Use simple past tense.',
    suggestedWords: ['searched', 'relieved', 'returned'],
  },
  {
    title: 'A Rainy Morning Surprise',
    theme: 'Everyday Life',
    level: 'Beginner',
    openingNarration: 'The morning started with heavy rain pouring outside my bedroom window. When I walked to the kitchen, the power was out and my alarm had not rung. My mother smiled and handed me a warm cup of tea with fresh toast. She said we had plenty of time if we left right away.',
    prompt: 'Continue the story for 45 to 60 seconds. Describe how you reached school or college during the rain and what happened next.',
    suggestedWords: ['umbrella', 'puddles', 'punctual'],
  },
  {
    title: 'The New Student in Class',
    theme: 'Friendship',
    level: 'Beginner',
    openingNarration: 'A new student named Arjun joined our classroom on a bright Monday morning. He stood quietly near the doorway, looking nervous and holding a blue notebook. The teacher asked someone to show him around the campus during break. I raised my hand and offered to sit next to him.',
    prompt: 'Continue the story for 45 to 60 seconds. Explain how you introduced yourself and made Arjun feel welcome. Mention your shared interests.',
    suggestedWords: ['welcomed', 'canteen', 'friendly'],
  },
  {
    title: 'Cooking Dinner with Grandfather',
    theme: 'Family & Home',
    level: 'Beginner',
    openingNarration: 'My grandfather decided to teach me his secret vegetable curry recipe on Sunday evening. We chopped carrots, potatoes, and green beans on the wooden cutting board. The kitchen filled with the aroma of cumin and coriander seeds. Just as we added the spices, the doorbell suddenly rang.',
    prompt: 'Continue the story for 45 to 60 seconds. Describe who was at the door and how the dinner turned out. Use descriptive words for food.',
    suggestedWords: ['delicious', 'flavor', 'guest'],
  },
  {
    title: 'The Stray Kitten at the Porch',
    theme: 'Kindness & Pets',
    level: 'Beginner',
    openingNarration: 'While tying my shoes outside the front door, I heard a faint meowing sound. Underneath the wooden bench sat a tiny grey kitten shivering from the cold breeze. Its big green eyes looked up at me with curiosity and hunger. I ran inside to find a small saucer and some warm milk.',
    prompt: 'Continue the story for 45 to 60 seconds. Explain how you cared for the kitten and whether your family allowed you to keep it.',
    suggestedWords: ['gentle', 'shelter', 'comfort'],
  },
  {
    title: 'The Broken Bicycle Chain',
    theme: 'Everyday Problem-Solving',
    level: 'Beginner',
    openingNarration: 'I was riding my bicycle to meet my friends for football practice at the community ground. Suddenly, there was a loud metallic click, and the pedals stopped moving forward. I stepped off and saw that the bicycle chain had slipped off the rear gear. I had no tools, but practice was starting in ten minutes.',
    prompt: 'Continue the story for 45 to 60 seconds. Explain how you fixed the bicycle or got help to reach practice on time.',
    suggestedWords: ['grease', 'patiently', 'arrived'],
  },
  {
    title: 'The Missing Bus Pass',
    theme: 'Travel & Commute',
    level: 'Beginner',
    openingNarration: 'As the red city bus pulled up to the stop, I tapped my jacket pocket for my monthly pass. It was completely empty, and the line of passengers behind me was waiting impatiently. The conductor looked at me expectantly with the ticket machine in hand. I checked my small coin pouch to see if I had exact change.',
    prompt: 'Continue the story for 45 to 60 seconds. Describe how you handled the situation with the conductor and reached your destination safely.',
    suggestedWords: ['conductor', 'helpful', 'pocket'],
  },
  {
    title: 'The Science Fair Volcano',
    theme: 'School & College Life',
    level: 'Beginner',
    openingNarration: 'My partner Priya and I spent three days crafting a papier-mâché volcano for the annual science fair. We prepared a mixture of baking soda, red food coloring, and dish soap in a plastic bottle inside. The head judge walked up to our table with a clipboard and asked for a demonstration. Priya poured the vinegar into the crater.',
    prompt: 'Continue the story for 45 to 60 seconds. Describe the reaction, the judges feedback, and how your team felt about the result.',
    suggestedWords: ['bubbled', 'erupted', 'applause'],
  },
  {
    title: 'A Visit to the Sunday Farmers Market',
    theme: 'Everyday Life',
    level: 'Beginner',
    openingNarration: 'The weekly farmers market was bustling with vibrant colors and energetic shouts from vendors. Stalls were overflowing with fresh mangoes, crisp greens, and fragrant flowers. My aunt gave me a cloth shopping bag and a small list of ingredients to collect. Walking into the crowded aisle, I spotted the sweetest strawberries I had ever seen.',
    prompt: 'Continue the story for 45 to 60 seconds. Describe your interactions with the vegetable vendor and what you carried home.',
    suggestedWords: ['bargain', 'fresh', 'crowded'],
  },
  {
    title: 'The First Time Giving a Speech',
    theme: 'Personal Growth',
    level: 'Beginner',
    openingNarration: 'My name was called to step up to the auditorium podium for the English speech contest. My hands were trembling slightly as I arranged my cue cards on the wooden stand. When I looked up, dozens of friendly faces were watching attentively from the audience. I took one deep breath and adjusted the microphone.',
    prompt: 'Continue the story for 45 to 60 seconds. Tell how your speech went, how your confidence grew, and how the audience responded.',
    suggestedWords: ['confidence', 'breathed', 'proud'],
  },
  {
    title: 'The Surprise Birthday Party',
    theme: 'Friendship',
    level: 'Beginner',
    openingNarration: 'We hid quietly behind the living room sofa, holding balloons and party blowers. It was Neha’s fifteenth birthday, and she thought everyone had forgotten because no one sent wishes that morning. We heard the key turn in the front lock and footsteps approaching. As the door swung open, the lights flicked on.',
    prompt: 'Continue the story for 45 to 60 seconds. Describe Neha’s reaction, the celebration, and your favorite memory from the party.',
    suggestedWords: ['surprise', 'delighted', 'celebrate'],
  },
  {
    title: 'Lost in the Shopping Mall',
    theme: 'Everyday Life',
    level: 'Beginner',
    openingNarration: 'The holiday weekend crowd at the city mall was enormous and moving in every direction. While admiring a display of robotic toys in a shop window, I turned around and realized my cousins were gone. I looked left and right, but none of the faces were familiar. I walked over to the customer assistance desk near the escalator.',
    prompt: 'Continue the story for 45 to 60 seconds. Explain what the staff did to assist you and how you reunited with your family.',
    suggestedWords: ['announcement', 'reunited', 'calm'],
  },
  {
    title: 'The Backyard Treehouse',
    theme: 'Adventure & Outdoors',
    level: 'Beginner',
    openingNarration: 'During summer vacation, my brother and I gathered scrap timber and sturdy ropes to build a shelter in the old banyan tree. Our uncle helped us nail the floorboards securely into the main branches. By sunset, we had a cozy elevated hideout with a rope ladder. We climbed up with a flashlight and a box of biscuits to spend the evening.',
    prompt: 'Continue the story for 45 to 60 seconds. Describe what you saw from the treehouse and what plans you made for the summer.',
    suggestedWords: ['branches', 'hideout', 'stargazing'],
  },
  {
    title: 'A Broken Mug and Honesty',
    theme: 'Kindness & Values',
    level: 'Beginner',
    openingNarration: 'While washing the dishes, I accidentally knocked over my mother’s favorite ceramic mug. It struck the tile floor and shattered into several sharp pieces. My heart sank because that mug was a souvenir from her college trip to Darjeeling. I could have hidden the fragments in the dustbin, but I chose to tell her immediately.',
    prompt: 'Continue the story for 45 to 60 seconds. Describe your conversation with your mother and her reaction to your honesty.',
    suggestedWords: ['apologized', 'truthful', 'forgiven'],
  },
  {
    title: 'The Weekend Football Match',
    theme: 'Sports & Teamwork',
    level: 'Beginner',
    openingNarration: 'Our neighborhood football match was tied 1-1 with only three minutes remaining on the scoreboard. The grass was slippery from an earlier drizzle, making every pass unpredictable. Our captain passed the ball toward my feet as two defenders rushed to block the path. I had to decide between shooting on goal or passing to my teammate.',
    prompt: 'Continue the story for 45 to 60 seconds. Describe the final play of the match and how your team celebrated afterward.',
    suggestedWords: ['striker', 'goalkeeper', 'cheering'],
  },
  {
    title: 'Learning to Ride a Two-Wheeler',
    theme: 'Personal Growth',
    level: 'Beginner',
    openingNarration: 'The neighborhood road was wide and empty on a cool Sunday morning. My father held the back of the bicycle seat tightly as I tried to keep my balance on the pedals. Every time I wobbled, he told me to look straight ahead rather than at the front wheel. Then, without telling me, he slowly let go of his grip.',
    prompt: 'Continue the story for 45 to 60 seconds. Describe the feeling of balancing on your own and what you learned that morning.',
    suggestedWords: ['balance', 'pedaled', 'thrilled'],
  },
  {
    title: 'An Unexpected Power Cut on Study Night',
    theme: 'Everyday Problem-Solving',
    level: 'Beginner',
    openingNarration: 'The night before the final mathematics exam, the ceiling fan suddenly stopped and the room went pitch dark. A transformer down the street had blown during a thunderstorm. I had two chapters of formulas left to revise before morning. My grandmother came in with an old brass oil lamp and two candles.',
    prompt: 'Continue the story for 45 to 60 seconds. Describe how you completed your revision and how the exam went the next morning.',
    suggestedWords: ['flickering', 'focused', 'determined'],
  },
  {
    title: 'The School Picnic at the Botanical Garden',
    theme: 'Travel & Exploration',
    level: 'Beginner',
    openingNarration: 'Three yellow school buses arrived at the gates of the botanical garden amidst joyful chatter. The park was filled with giant bamboo groves, blooming lotus ponds, and ancient pine trees. Our science teacher handed each group a map with five botanical specimens to discover. My group dashed toward the glass greenhouse first.',
    prompt: 'Continue the story for 45 to 60 seconds. Describe what interesting plants you found and how your group enjoyed lunch.',
    suggestedWords: ['specimens', 'greenhouse', 'scenery'],
  },
  {
    title: 'Returning a Lost Wallet',
    theme: 'Kindness & Values',
    level: 'Beginner',
    openingNarration: 'While sitting at a bus stop bench, I noticed a brown leather wallet resting on the wooden slats. Inside were an employee identity card, a train ticket, and several currency notes. The photo on the ID showed a young man named Vikram who worked at a nearby bank. I walked into the bank branch to find him.',
    prompt: 'Continue the story for 45 to 60 seconds. Describe how Vikram reacted when you returned his wallet and how you felt.',
    suggestedWords: ['grateful', 'integrity', 'appreciated'],
  },
  {
    title: 'Adopting a Green Plant for the Desk',
    theme: 'Everyday Life',
    level: 'Beginner',
    openingNarration: 'I bought a small potted succulent from the plant nursery to brighten my study table. The nursery owner explained that it needed sunlight and only a splash of water once every few days. I placed it next to my reading lamp and gave it a name. Over the next few weeks, I watched a tiny new green leaf begin to sprout.',
    prompt: 'Continue the story for 45 to 60 seconds. Explain how taking care of the plant created a positive daily habit for you.',
    suggestedWords: ['nurture', 'sunlight', 'flourish'],
  },

  /* =========================================================================
     20 INTERMEDIATE STORIES (Travel, campus events, community, workplace basics, adventure)
     ========================================================================= */
  {
    title: 'The Train Journey to the Hill Station',
    theme: 'Travel & Exploration',
    level: 'Intermediate',
    openingNarration: 'The overnight express chugged slowly as it began ascending the winding mountain railway. Through the foggy window, lush tea plantations appeared on the steep hillside like emerald carpets. A cool breeze swept into the train corridor as passengers gathered to take photographs. The conductor announced that we would reach the hilltop terminus in thirty minutes.',
    prompt: 'Continue the story for 45 to 60 seconds. Describe your arrival at the hill station, the scenery, and your first excursion. Use rich descriptive adjectives.',
    suggestedWords: ['picturesque', 'misty', 'exhilarating'],
  },
  {
    title: 'The College Cultural Fest Auditions',
    theme: 'Campus Life & Arts',
    level: 'Intermediate',
    openingNarration: 'Dozens of hopeful students were warming up in the amphitheater for the annual theater festival auditions. Some recited dramatic monologues in corners, while others practiced synchronized acoustic chords. When the director called my name, I stood in the spotlight with the script in hand. My heart was pounding, but the stage lights made everything else fade into shadow.',
    prompt: 'Continue the story for 45 to 60 seconds. Describe your performance, how you handled an unexpected slip, and the directors feedback.',
    suggestedWords: ['spotlight', 'reverberated', 'enthusiastic'],
  },
  {
    title: 'The Community Clean-Up Drive',
    theme: 'Kindness & Community',
    level: 'Intermediate',
    openingNarration: 'A group of thirty neighborhood volunteers assembled at the lake park on a crisp Saturday morning. The shoreline had suffered from months of neglected plastic debris and overgrown weeds. Armed with reusable canvas bags and gardening gloves, we divided the perimeter into four sectors. My team was assigned to clear the waterfowl nesting zone near the willow trees.',
    prompt: 'Continue the story for 45 to 60 seconds. Explain the impact of your teamwork and how the community celebrated the restored shoreline.',
    suggestedWords: ['revitalized', 'collective', 'environment'],
  },
  {
    title: 'A Critical Bug on Deployment Day',
    theme: 'Workplace & Technology',
    level: 'Intermediate',
    openingNarration: 'Two hours before our team was scheduled to deliver the client website, the payment gateway failed to process test transactions. An error code flashed repeatedly across the monitor, causing anxious murmurs around the conference table. The project lead asked everyone to stay calm and systematically inspect recent code commits. I opened the network log to trace the root of the handshake failure.',
    prompt: 'Continue the story for 45 to 60 seconds. Describe how you diagnosed the error, collaborated with your teammate, and saved the deployment.',
    suggestedWords: ['diagnosed', 'collaboration', 'triumph'],
  },
  {
    title: 'The Overnight Mountain Trek',
    theme: 'Adventure & Outdoors',
    level: 'Intermediate',
    openingNarration: 'Our hiking group reached the alpine ridge just as the golden evening sun dipped behind the jagged peaks. The temperature plunged rapidly, turning our breaths into visible clouds of vapor. We pitched our nylon tents on a sheltered grassy knoll before darkness enveloped the valley. As we gathered around the camping stove, distant thunder began to rumble across the western range.',
    prompt: 'Continue the story for 45 to 60 seconds. Describe how your group prepared for the changing weather and experienced the sunrise.',
    suggestedWords: ['wilderness', 'perseverance', 'panoramic'],
  },
  {
    title: 'The Internship Interview Experience',
    theme: 'Workplace & Career',
    level: 'Intermediate',
    openingNarration: 'I arrived at the headquarters of a renowned design firm fifteen minutes ahead of my scheduled interview. The reception lobby was sleek and modern, with awards and client prototypes proudly displayed in glass cases. A senior interviewer ushered me into a sunlit conference room with a warm handshake. She began by asking me to walk her through a challenging project where things did not go as planned.',
    prompt: 'Continue the story for 45 to 60 seconds. Relate how you structured your answer, communicated your problem-solving skills, and concluded the meeting.',
    suggestedWords: ['articulate', 'demonstrated', 'perspective'],
  },
  {
    title: 'A Lost Luggage Adventure at the Airport',
    theme: 'Travel & Problem-Solving',
    level: 'Intermediate',
    openingNarration: 'The baggage carousel finally stopped revolving, leaving the terminal hall nearly deserted. My large maroon suitcase, which contained my conference presentation materials, had failed to appear. I approached the airline baggage counter with my boarding pass and baggage receipt in hand. The customer service representative listened attentively and initiated an urgent baggage tracking query.',
    prompt: 'Continue the story for 45 to 60 seconds. Describe how the airline located your luggage and how you adapted while waiting for it.',
    suggestedWords: ['inconvenience', 'resourceful', 'delivered'],
  },
  {
    title: 'Organizing the High School Blood Donation Camp',
    theme: 'Community & Leadership',
    level: 'Intermediate',
    openingNarration: 'As president of the student council, organizing the regional blood donation camp was my biggest responsibility of the semester. We coordinated with the municipal hospital staff, arranged resting beds in the gymnasium, and put up posters across campus. By mid-morning, a surprisingly long line of eager college students had gathered outside the registration desk. However, the medical team informed us that they were running low on disposable testing kits.',
    prompt: 'Continue the story for 45 to 60 seconds. Explain how you resolved the supplies shortage and the final tally of units collected.',
    suggestedWords: ['mobilized', 'logistics', 'impactful'],
  },
  {
    title: 'The Stray Dog That Guarded the Neighborhood',
    theme: 'Everyday Life & Animals',
    level: 'Intermediate',
    openingNarration: 'A golden-coated stray dog named Bruno had lived near our street corner for as long as anyone could remember. The shopkeepers took turns feeding him, and children petted his head on their walk back from school. One stormy midnight, Bruno’s frantic barking woke the entire lane. Looking out the balcony, my neighbor noticed smoke billowing from the back of an electrical appliance store.',
    prompt: 'Continue the story for 45 to 60 seconds. Describe how Bruno’s warning alerted the fire department and how the neighborhood honored him.',
    suggestedWords: ['heroic', 'vigilant', 'celebrated'],
  },
  {
    title: 'The Mystery of the Antique Pocket Watch',
    theme: 'Mystery & Discovery',
    level: 'Intermediate',
    openingNarration: 'While clearing the dusty attic of my grandparents ancestral home, I discovered a velvet pouch hidden behind a wardrobe. Inside lay an exquisite silver pocket watch with intricate engravings of a sailing vessel. When I wound the brass crown, the delicate balance wheel miraculously began ticking again. As the back lid sprang open, I found a handwritten inscription with coordinates and a date from 1942.',
    prompt: 'Continue the story for 45 to 60 seconds. Describe your investigation into the coordinates and what historical secret you uncovered.',
    suggestedWords: ['heirloom', 'investigated', 'fascinating'],
  },
  {
    title: 'The First Independent Road Trip',
    theme: 'Travel & Independence',
    level: 'Intermediate',
    openingNarration: 'After months of meticulous route planning, four close friends and I loaded our backpacks into a rented hatchback. The highway stretched before us, flanked by golden sunflower fields and open blue skies. With our favorite road trip playlist playing on the radio, we left city traffic behind. Two hours in, the navigation app redirected us toward an unpaved scenic mountain bypass.',
    prompt: 'Continue the story for 45 to 60 seconds. Describe the detours you encountered, a memorable roadside diner, and arriving at your destination.',
    suggestedWords: ['scenic', 'spontaneous', 'memorable'],
  },
  {
    title: 'Hosting an International Exchange Student',
    theme: 'Culture & Friendship',
    level: 'Intermediate',
    openingNarration: 'Our household welcomed Kenji, a high school exchange student from Kyoto, for a six-month cultural program. At first, differences in language, dining etiquette, and daily habits created humorous misunderstandings. On his first weekend, we decided to cook a festive traditional dinner together in our kitchen. Kenji demonstrated how to roll authentic sushi while my sister showed him how to bake homemade flatbreads.',
    prompt: 'Continue the story for 45 to 60 seconds. Describe how cultural exchange brought your family closer and what you learned from Kenji.',
    suggestedWords: ['traditions', 'hospitality', 'harmony'],
  },
  {
    title: 'The Broken Water Pipeline in the Village',
    theme: 'Everyday Problem-Solving',
    level: 'Intermediate',
    openingNarration: 'During our college social outreach week, we arrived at a village that had experienced a water supply rupture for three days. The main intake pipe from the hillside reservoir had cracked beneath a landslide of loose shale. Villagers were forced to hike two miles to a distant hand pump for cooking water. Our student team partnered with the village elders to inspect the fracture and draft a temporary bypass.',
    prompt: 'Continue the story for 45 to 60 seconds. Describe the physical effort to repair the pipeline and the moment fresh water flowed again.',
    suggestedWords: ['restored', 'cooperation', 'resilience'],
  },
  {
    title: 'Launching a Campus Book Exchange Club',
    theme: 'Campus Life & Education',
    level: 'Intermediate',
    openingNarration: 'Noticing that students were spending exorbitant sums on reference textbooks each semester, my roommate and I envisioned a book swap library. We secured permission from the student union to set up two wooden bookshelves in the student lounge. Within four days, over two hundred novels, engineering manuals, and poetry collections had been contributed. Then, someone donated a rare first edition signed by a prominent author.',
    prompt: 'Continue the story for 45 to 60 seconds. Describe the excitement around the club and how it changed reading culture on campus.',
    suggestedWords: ['initiative', 'generosity', 'enthusiasm'],
  },
  {
    title: 'The Unexpected Flight Delay',
    theme: 'Travel & Patience',
    level: 'Intermediate',
    openingNarration: 'Dense fog had grounded all outgoing departures at the international airport terminal for eight hours. Stranded travelers were sitting on suitcase trolleys, checking departure monitors with visible fatigue. I struck up a conversation with an elderly retired architect who was traveling to meet his granddaughter for the first time. He pulled out a sketchbook and showed me hand-drawn perspectives of historic bridges across Europe.',
    prompt: 'Continue the story for 45 to 60 seconds. Describe the connection you formed, how you passed the waiting hours, and boarding the plane.',
    suggestedWords: ['perspective', 'insightful', 'journey'],
  },
  {
    title: 'The Photography Exhibition Competition',
    theme: 'Arts & Creative Expression',
    level: 'Intermediate',
    openingNarration: 'The gallery wall was lined with dozens of captivating prints captured by amateur photographers from across the state. My entry was a black-and-white portrait of a potter shaping clay at dawn, bathed in gentle sidelight. Visitors drifted through the exhibition hall with programs, pausing before each photograph to debate composition. When the chief judge stood before my portrait, she leaned in to study the subtle texture of the hands.',
    prompt: 'Continue the story for 45 to 60 seconds. Explain the judges critique and how this competition influenced your creative ambitions.',
    suggestedWords: ['composition', 'expressive', 'recognition'],
  },
  {
    title: 'Defusing a Workplace Misunderstanding',
    theme: 'Workplace & Communication',
    level: 'Intermediate',
    openingNarration: 'A terse email sent in haste regarding project deadlines had created palpable tension between two collaborating project managers. Neither person was willing to speak directly during the morning status briefing, causing critical decisions to stall. Recognizing that project momentum was at risk, I invited both colleagues for an informal coffee in the cafeteria courtyard. I gently initiated the conversation by clarifying the shared objective of our team.',
    prompt: 'Continue the story for 45 to 60 seconds. Describe how you facilitated open dialogue, resolved the conflict, and rebuilt mutual trust.',
    suggestedWords: ['diplomatic', 'clarified', 'reconciled'],
  },
  {
    title: 'The Midnight Astronomy Watch',
    theme: 'Science & Discovery',
    level: 'Intermediate',
    openingNarration: 'The college astronomy club set up two high-powered reflector telescopes on the science building rooftop. It was the night of the annual Perseid meteor shower, and the sky was unusually crystal-clear with zero light pollution. As our eyes adjusted to the darkness, silver shooting stars began streaking across the celestial dome. Then, a student focusing on Jupiter spotted four Galilean moons lined up like glowing pearls.',
    prompt: 'Continue the story for 45 to 60 seconds. Describe the awe of the experience and what thoughts it provoked about the universe.',
    suggestedWords: ['celestial', 'breathtaking', 'wonder'],
  },
  {
    title: 'A Remote Island Cycling Expedition',
    theme: 'Adventure & Travel',
    level: 'Intermediate',
    openingNarration: 'We boarded a wooden passenger ferry with our bicycles bound for a tranquil island known for having no motorized cars. The narrow coastal path wound past fisherman shacks, mangrove estuaries, and secluded sandy coves. By noon, the tide was coming in, cutting off the main route back to the ferry jetty. We had to navigate a rugged inland forest trail marked only by faded wooden signposts.',
    prompt: 'Continue the story for 45 to 60 seconds. Describe your journey through the forest trail and catching the evening ferry in time.',
    suggestedWords: ['secluded', 'navigated', 'triumphant'],
  },
  {
    title: 'Mentoring a Junior Student',
    theme: 'Kindness & Growth',
    level: 'Intermediate',
    openingNarration: 'I was assigned to mentor Karthik, a first-year student who was struggling with spoken English and academic self-confidence. During our first session, he barely spoke above a whisper and was hesitant to attempt practice sentences. Instead of lecturing, I suggested we discuss his favorite hobbies and read interesting magazine articles together. Week after week, I noticed his posture straighten and his vocabulary expand.',
    prompt: 'Continue the story for 45 to 60 seconds. Describe Karthik’s breakthrough moment and the reward of mentoring someone.',
    suggestedWords: ['encouragement', 'transformation', 'rewarding'],
  },

  /* =========================================================================
     20 ADVANCED STORIES (Complex dilemmas, resilience, philosophical choices, leadership)
     ========================================================================= */
  {
    title: 'The Whistleblower’s Dilemma',
    theme: 'Ethics & Integrity',
    level: 'Advanced',
    openingNarration: 'While conducting a mandatory safety audit on a newly built public bridge, civil engineer Maya discovered alarming micro-fissures in the primary load-bearing piers. Her supervisor quietly urged her to classify the defect as cosmetic to prevent costly construction delays and media scrutiny. She knew that signing off on the fraudulent report would safeguard her career, while speaking out risked immediate termination. That night, she sat at her desk with the raw sensor logs on one side and the official sign-off sheet on the other.',
    prompt: 'Continue the story for 45 to 60 seconds. Analyze the ethical confrontation, Maya’s decision, and the long-term impact on public safety. Use sophisticated vocabulary and persuasive cadence.',
    suggestedWords: ['compromise', 'conscientious', 'accountability'],
  },
  {
    title: 'Negotiating the Cross-Border Peace Treaty',
    theme: 'Diplomacy & Global Affairs',
    level: 'Advanced',
    openingNarration: 'After eighteen grueling months of international diplomacy, envoys from both neighboring nations convened in Geneva for the final treaty session. Decades of territorial disputes and cross-border tensions had eroded trust, leaving diplomats intensely cautious. The sticking point remained the shared sovereignty over the fertile river basin that sustained millions of agrarian livelihoods. As midnight approached, the lead mediator called for a private, off-the-record recess between the two chief negotiators.',
    prompt: 'Continue the story for 45 to 60 seconds. Describe the critical breakthrough achieved in the room and the historic press conference that followed.',
    suggestedWords: ['concession', 'unprecedented', 'sovereignty'],
  },
  {
    title: 'The AI Algorithm and Unconscious Bias',
    theme: 'Technology & Ethics',
    level: 'Advanced',
    openingNarration: 'An artificial intelligence recruiting tool developed by a prominent tech conglomerate was praised for screening thousands of job applicants in seconds. However, deep-dive forensic analytics revealed that the model systematically downgraded candidates who attended rural colleges or had non-traditional career breaks. The engineering vice president faced fierce pressure from executives who wanted to launch the product globally to meet quarterly revenue forecasts. Dr. Sen, the lead data scientist, presented undeniable empirical evidence of disparate impact to the board of directors.',
    prompt: 'Continue the story for 45 to 60 seconds. Detail the rigorous debate that ensued and how the team re-engineered the predictive model to guarantee fairness.',
    suggestedWords: ['scrutiny', 'mitigate', 'algorithmic'],
  },
  {
    title: 'Surviving the Alpine Blizzard at 14,000 Feet',
    theme: 'Adventure & Resilience',
    level: 'Advanced',
    openingNarration: 'An unpredicted sub-zero gale struck our mountaineering expedition along the knife-edge traverse of Mount Rainier. Whiteout conditions obliterated visibility within minutes, transforming the familiar route into a disorienting labyrinth of crevasses. With satellite communication disabled by the electrical storm, the expedition leader had to decide whether to bivouac on an exposed ice shelf or risk a treacherous descent. Hypothermia was setting in rapidly as teammates huddled against the howling vortex.',
    prompt: 'Continue the story for 45 to 60 seconds. Narrate the survival ordeal, the display of mutual fortitude, and how the team navigated back to high camp.',
    suggestedWords: ['harrowing', 'tenacity', 'treacherous'],
  },
  {
    title: 'The Endangered Language Reclamation Project',
    theme: 'Culture & Linguistics',
    level: 'Advanced',
    openingNarration: 'In a secluded valley nestled in the eastern highlands, eighty-four-year-old Elder Tenzin was the last fluent speaker of an ancient oral dialect rich in botanical folklore. A team of socio-linguists arrived with high-fidelity audio equipment to document the vanishing grammatical structures and cosmological chants before they were lost forever. Tenzin was initially apprehensive, fearing his ancestors’ oral history would be commodified without reverence. The lead linguist sat with him in silence for days, listening to his reservations before turning on a single microphone.',
    prompt: 'Continue the story for 45 to 60 seconds. Describe how a bond of deep trust was established and how the archive was preserved for future generations.',
    suggestedWords: ['heritage', 'nuance', 'invaluable'],
  },
  {
    title: 'The High-Stakes Venture Capital Pitch',
    theme: 'Workplace & Innovation',
    level: 'Advanced',
    openingNarration: 'After mortgaging their savings to engineer an affordable water-filtration membrane from agricultural biomass, two young founders walked into a boardroom of formidable Silicon Valley investors. The venture partners were notorious for sharp interrogations that dismantled unprepared entrepreneurs in minutes. As the presentation timer started, the lead investor aggressively questioned the scalability and profit margins of deploying in impoverished rural markets. The founder paused, stepped away from the slideshow, and poured water from a muddy pond directly through their prototype.',
    prompt: 'Continue the story for 45 to 60 seconds. Deliver the founder’s compelling counter-argument, the demonstration, and the decisive outcome of the pitch.',
    suggestedWords: ['compelling', 'unflinching', 'viability'],
  },
  {
    title: 'The Restoration of the Masterpiece',
    theme: 'Art & History',
    level: 'Advanced',
    openingNarration: 'Chief conservator Elena stood over a five-hundred-year-old Renaissance oil portrait whose luminous canvas had been obscured by centuries of darkened varnish and botched touch-ups. A controversial proposal emerged to use infrared spectroscopy and laser ablation to strip away the over-paint and expose the original masterstrokes. Critics argued that the intervention risked irreversible damage to the fragile tempera beneath. With museum patrons and art historians observing behind glass, Elena adjusted her surgical microscope and applied the solvent to a single millimeter test square.',
    prompt: 'Continue the story for 45 to 60 seconds. Describe the dramatic moment the authentic original brushwork was revealed and the reaction of the art world.',
    suggestedWords: ['restoration', 'spectacular', 'revelation'],
  },
  {
    title: 'Navigating the Urban Public Health Crisis',
    theme: 'Leadership & Society',
    level: 'Advanced',
    openingNarration: 'When an unidentified waterborne pathogen caused a sudden surge of hospital admissions across the metropolis, the municipal commissioner convened an emergency task force. Conflicting scientific hypotheses emerged regarding whether the vector originated in the municipal reservoirs or decentralized cooling towers. Enforcing a citywide lockdown would trigger immense economic turmoil for daily-wage laborers, yet hesitation could lead to exponential casualties. Standing before live television cameras, the commissioner had to convey lucid directives without inciting mass panic.',
    prompt: 'Continue the story for 45 to 60 seconds. Describe the epidemiological strategy implemented and how transparent communication preserved public order.',
    suggestedWords: ['epidemiological', 'decisive', 'transparent'],
  },
  {
    title: 'The Deep-Sea Hydrothermal Exploration',
    theme: 'Science & Discovery',
    level: 'Advanced',
    openingNarration: 'Submerged three miles beneath the Pacific surface inside a titanium research submersible, marine biologists entered a realm of perpetual abyss where pressures exceed eight thousand pounds per square inch. Suddenly, the external floodlights illuminated towering hydrothermal chimneys spewing mineral-rich superheated fluids into the frigid depths. Thriving in this hostile ecosystem were blind crustaceans and bioluminescent organisms that defied conventional photosynthesis. As the mechanical claw reached to collect a geological specimen, the main sonar pinged an unexpected acoustic anomaly behind the ridge.',
    prompt: 'Continue the story for 45 to 60 seconds. Describe the scientific discovery made in the deep abyss and how it reshaped biology textbooks.',
    suggestedWords: ['abyssal', 'chemosynthesis', 'astonishing'],
  },
  {
    title: 'The Re-wilding of the Scorched Valley',
    theme: 'Environment & Renewal',
    level: 'Advanced',
    openingNarration: 'A catastrophic wildfire had reduced fifty thousand acres of pristine pine forest to a desolate landscape of ash and charred stumps. Rather than re-planting commercial monoculture timber, an alliance of ecologists and local indigenous foresters advocated for an ambitious ecological re-wilding initiative. They introduced native nitrogen-fixing flora, re-channeled silted tributaries, and reintroduced apex keystone species to balance herbivores. A decade later, the project director stood on the high ridge overlooking a transformed canopy vibrant with biodiversity.',
    prompt: 'Continue the story for 45 to 60 seconds. Reflect on nature’s astounding resilience, the ecological equilibrium achieved, and the lessons for modern conservation.',
    suggestedWords: ['biodiversity', 'rejuvenation', 'equilibrium'],
  },
  {
    title: 'The Courtroom Cross-Examination',
    theme: 'Law & Justice',
    level: 'Advanced',
    openingNarration: 'The high-profile intellectual property trial had reached its climax as defense counsel rose to cross-examine the opposing expert witness. At stake was the patent ownership of a revolutionary gene-editing technology capable of eradicating hereditary anemia. The witness had testified with polished composure, asserting that their corporation had conceived the molecular sequence six months prior to the university lab. Defense attorney Vasquez placed a marked deposition transcript on the podium, opened an envelope containing time-stamped laboratory notebooks, and asked a deceptively simple opening question.',
    prompt: 'Continue the story for 45 to 60 seconds. Describe the rigorous cross-examination, the unraveling of the deception, and the courtroom verdict.',
    suggestedWords: ['impeachment', 'irrefutable', 'vindication'],
  },
  {
    title: 'The Solo Trans-Oceanic Sailor',
    theme: 'Adventure & Solitude',
    level: 'Advanced',
    openingNarration: 'Forty-two days into a solitary non-stop voyage across the Southern Ocean, sailor David faced the most intimidating swell of his life. In the notorious Roaring Forties, fifty-foot waves marched like dark mountains against a relentless gale. A freak wave struck the starboard beam, dismasting the yacht and flooding the navigation cabin with freezing brine. Isolated by thousands of miles from the nearest maritime rescue vessel, David strapped his safety harness to the jackline and crawled onto the violently pitching deck with an emergency hacksaw.',
    prompt: 'Continue the story for 45 to 60 seconds. Narrate how David cut away the dangerous wreckage, rigged a jury sail, and survived the tempest.',
    suggestedWords: ['indomitable', 'tempest', 'resourcefulness'],
  },
  {
    title: 'The Architectural Heritage Preservation',
    theme: 'Culture & Architecture',
    level: 'Advanced',
    openingNarration: 'Urban developers unveiled plans to demolish a century-old brick textile mill to construct luxury high-rise condominiums in the historic waterfront quarter. The mill had been the historic epicenter of the city’s labor movement and stood as an iconic masterpiece of industrial masonry. Lead architect Sunita presented an alternative adaptive-reuse blueprint to the municipal planning commission that demonstrated how the historic facades could be integrated into a bustling public arts center and affordable housing cooperative. The planning commissioners sat in tense deliberation as the public gallery held its breath.',
    prompt: 'Continue the story for 45 to 60 seconds. Detail Sunita’s impassioned defense of civic memory and the transformative legacy of the project.',
    suggestedWords: ['preservation', 'adaptive-reuse', 'heritage'],
  },
  {
    title: 'The Cybersecurity Ransomware Infiltration',
    theme: 'Technology & Crisis Management',
    level: 'Advanced',
    openingNarration: 'At 3:15 AM, the red alerts on the cybersecurity command center illuminated as a sophisticated ransomware variant began encrypting patient records across a national hospital network. The extortionist syndicate demanded forty million dollars in cryptocurrency within four hours, threatening to wipe medical files and paralyze intensive care life-support telemetry. Chief Information Security Officer Daniel refused to pay the illicit ransom and rallied his incident-response engineers. They initiated a zero-trust network quarantine to sever malicious command-and-control servers while spinning up cold air-gapped backups.',
    prompt: 'Continue the story for 45 to 60 seconds. Describe the high-stakes cyber counter-offensive and the restoration of hospital systems without capitulating to criminals.',
    suggestedWords: ['quarantine', 'mitigation', 'resilience'],
  },
  {
    title: 'The Renewable Energy Transition in a Coal Town',
    theme: 'Society & Economics',
    level: 'Advanced',
    openingNarration: 'For four generations, the subterranean coal mines had served as the sole economic lifeblood of the valley town of Blackwood. As federal decarbonization mandates scheduled the imminent closure of the last colliery, fear and resentment gripped the community. The newly elected mayor invited miners, renewable energy entrepreneurs, and federal workforce trainers into the town hall for a candid town hall summit. She proposed transforming the vast abandoned surface mines into a monumental solar farm and hydrogen manufacturing hub with guaranteed retraining equity for every displaced miner.',
    prompt: 'Continue the story for 45 to 60 seconds. Describe how skepticism gave way to constructive negotiation and a sustainable future for the town.',
    suggestedWords: ['transition', 'decarbonization', 'reinvestment'],
  },
  {
    title: 'The Genetic Pioneer’s Ethical Boundary',
    theme: 'Bioethics & Science',
    level: 'Advanced',
    openingNarration: 'Dr. Evelyn had spent a decade pioneering germline therapeutics to eliminate Huntington’s disease from embryonic lineages. During the clinical validation phase, a private foreign clinic offered unlimited funding on the quiet condition that she permit enhancements for physical endurance and cognitive vanity traits. Evelyn understood that accepting the compromise would guarantee her lab’s survival for decades, yet it crossed the Rubicon of eugenics. She walked into the international bioethics conference with a prepared manifesto that would redefine global regulatory oversight.',
    prompt: 'Continue the story for 45 to 60 seconds. Relate Evelyn’s courageous stand on the conference stage and her defense of humane scientific limits.',
    suggestedWords: ['precedent', 'eugenics', 'uncompromising'],
  },
  {
    title: 'The Post-Disaster Humanitarian Airlift',
    theme: 'Leadership & Compassion',
    level: 'Advanced',
    openingNarration: 'A magnitude 7.8 earthquake had severed roads, power grids, and mountain communication lines to remote mountain villages in the high Himalayas. Captain Tariq piloted a twin-engine cargo turboprop through treacherous mountain turbulence to conduct an emergency airdrop of pediatric medical supplies, water purifiers, and thermal blankets. As clouds closed in over the makeshift landing strip in the gorge, the ground crew signaled that crosswinds exceeded safe landing maximums. A field hospital was treating hundreds of critically injured survivors who would not survive another night without plasma.',
    prompt: 'Continue the story for 45 to 60 seconds. Describe Tariq’s split-second tactical calculations, the landing execution, and the humanitarian triumph.',
    suggestedWords: ['precision', 'audacious', 'humanitarian'],
  },
  {
    title: 'The Investigative Journalist and the Secret Ledger',
    theme: 'Media & Democracy',
    level: 'Advanced',
    openingNarration: 'Investigative reporter Farah received an encrypted memory drive from an anonymous postal locker containing leaked banking records of offshore accounts held by influential politicians. The documents corroborated years of whispered allegations regarding embezzled public infrastructure funds meant for rural schools. Before the story could go to print, Farah received intimidating phone calls threatening her family and libel litigation designed to bankrupt the independent newspaper. Her editor-in-chief placed a supportive hand on her desk and affirmed that truthful journalism is the cornerstone of democracy.',
    prompt: 'Continue the story for 45 to 60 seconds. Describe the painstaking corroboration of the evidence, the publication of the expose, and the societal reckoning.',
    suggestedWords: ['unflinching', 'corroborated', 'accountability'],
  },
  {
    title: 'The Interstellar Signal Decryption',
    theme: 'Science & Philosophy',
    level: 'Advanced',
    openingNarration: 'At the high-altitude radio observatory in the Atacama Desert, a persistent narrowband radio transmission on the 1.42 gigahertz hydrogen line was registered by the receiver array. Unlike random pulsars or cosmic background radiation, the transmission contained an undeniable mathematical sequence of prime numbers followed by a complex dimensional fractal. The international astrophysical consortium convened an urgent classified video conference to verify whether the signal was terrestrial interference or humankind’s first verified contact with an extraterrestrial intelligence.',
    prompt: 'Continue the story for 45 to 60 seconds. Explore the philosophical and scientific impact of deciphering the signal and how it unified human perspective.',
    suggestedWords: ['extraterrestrial', 'profound', 'transcendence'],
  },
  {
    title: 'The Re-building of Community Trust',
    theme: 'Leadership & Reconciliation',
    level: 'Advanced',
    openingNarration: 'A divisive civic municipal election had fractured the diverse neighborhood of Riverdale along socio-economic and cultural fault lines. Neighbors who had lived alongside each other for decades stopped greeting one another in the park, and community council meetings frequently devolved into bitter recriminations. A coalition of youth leaders, teachers, and shopkeepers organized an open-air "Long Table" dinner spanning five city blocks on a car-free Sunday. As dusk fell and shared dishes were passed from hand to hand, the silence was broken by an elder who shared memories of the town’s founding spirit.',
    prompt: 'Continue the story for 45 to 60 seconds. Describe how genuine empathy and listening disarmed hostilities and forged a renewed neighborhood solidarity.',
    suggestedWords: ['reconciliation', 'empathy', 'solidarity'],
  },
];

async function seedGeneralStories() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lingrow_ai';
  let shouldClose = false;

  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(uri);
    shouldClose = true;
  }

  console.log('[Stories Migration] Deactivating legacy department & uncurated stories...');
  // Deactivate any legacy department or non-curriculum story
  await StoryPrompt.updateMany(
    {
      $or: [
        { department: { $exists: true, $ne: null } },
        { source: { $ne: 'general_curriculum' } },
        { title: { $exists: false } },
        { theme: { $exists: false } },
      ],
    },
    { $set: { active: false } }
  );

  console.log('[Stories Migration] Inserting/Updating 60 general English curriculum stories...');
  let inserted = 0;
  for (const story of GENERAL_STORIES) {
    const exists = await StoryPrompt.findOne({ title: story.title });
    if (!exists) {
      await StoryPrompt.create({
        title: story.title,
        theme: story.theme,
        level: story.level,
        openingNarration: story.openingNarration,
        prompt: story.prompt,
        suggestedWords: story.suggestedWords,
        active: true,
        source: 'general_curriculum',
      });
      inserted++;
    } else {
      exists.theme = story.theme;
      exists.level = story.level;
      exists.openingNarration = story.openingNarration;
      exists.prompt = story.prompt;
      exists.suggestedWords = story.suggestedWords;
      exists.active = true;
      exists.department = undefined;
      exists.source = 'general_curriculum';
      await exists.save();
    }
  }

  const activeCount = await StoryPrompt.countDocuments({ active: true });
  console.log(`[Stories Migration] Complete! Active general stories count: ${activeCount}`);

  if (shouldClose) {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  seedGeneralStories()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { seedGeneralStories, GENERAL_STORIES };
