const Passage = require('../models/Passage');
const ListeningClip = require('../models/ListeningClip');

const DEPARTMENTS = ['CSE', 'ECE', 'MECH', 'CIVIL', 'EEE', 'IT', 'MBA'];

// Department technical topics generator templates
const DEPARTMENT_TOPIC_TEMPLATES = {
  CSE: [
    { title: 'Distributed Systems & Microservices Architecture', keywords: ['event-driven architecture', 'RESTful API', 'load balancers', 'Kubernetes pods', 'database sharding'] },
    { title: 'Asynchronous Programming & Event Loops', keywords: ['non-blocking I/O', 'promises and async-await', 'single-threaded loop', 'callback queues', 'concurrency models'] },
    { title: 'Graph Data Structures & BFS Routing', keywords: ['breadth-first search', 'shortest path algorithms', 'adjacency matrices', 'network routing tables', 'traversal complexity'] },
    { title: 'Neural Networks & Deep Learning Hyperparameters', keywords: ['gradient descent', 'backpropagation', 'activation functions', 'convolutional layers', 'overfitting prevention'] },
    { title: 'Relational vs NoSQL Database Indexing', keywords: ['B-tree indexes', 'document databases', 'ACID compliance', 'eventual consistency', 'query optimization'] },
    { title: 'Cybersecurity Threat Intelligence & Encryption', keywords: ['public key cryptography', 'TLS handshake', 'zero-day vulnerability', 'penetration testing', 'firewall policies'] },
    { title: 'Cloud Infrastructure & Serverless Functions', keywords: ['AWS Lambda triggers', 'containerization', 'auto-scaling groups', 'infrastructure as code', 'stateless execution'] },
  ],
  ECE: [
    { title: 'VLSI Circuit Design & CMOS Technology', keywords: ['transistor logic gates', 'power dissipation', 'silicon wafers', 'FPGA prototyping', 'signal propagation delay'] },
    { title: 'Embedded Systems & Microcontroller Timers', keywords: ['pulse width modulation', 'analog-to-digital converters', 'interrupt service routines', 'SPI communication', 'GPIO pins'] },
    { title: 'Digital Signal Processing & Fourier Analysis', keywords: ['fast fourier transform', 'sampling rate theorem', 'bandpass filtering', 'noise reduction algorithms', 'frequency domain'] },
    { title: 'Wireless Telecommunication & 5G Antenna Arrays', keywords: ['beamforming technology', 'orthofrequency division', 'carrier frequencies', 'signal attenuation', 'MIMO architecture'] },
    { title: 'Fiber Optic Transmitters & Light Waveguide Dynamics', keywords: ['total internal reflection', 'optical attenuation', 'photodiode detectors', 'single-mode fibers', 'bandwidth capacity'] },
  ],
  MECH: [
    { title: 'Thermodynamics & Rankine Power Cycles', keywords: ['enthalpy efficiency', 'steam turbine expansion', 'heat exchangers', 'carnot efficiency limits', 'thermal conduction'] },
    { title: 'Fluid Mechanics & Boundary Layer Separation', keywords: ['reynolds number flow', 'laminar vs turbulent', 'bernoulli equation', 'aerodynamic drag coefficient', 'pipe friction losses'] },
    { title: 'Finite Element Analysis & Structural Mechanics', keywords: ['stress-strain distribution', 'tensile strength limits', 'mesh discretization', 'von Mises stress', 'mechanical deformation'] },
    { title: 'Internal Combustion Engine Thermal Dynamics', keywords: ['four-stroke otto cycle', 'compression ratios', 'fuel injection timing', 'exhaust gas recirculation', 'volumetric efficiency'] },
    { title: 'Automated Robotics & Hydraulic Actuator Systems', keywords: ['pneumatic valves', 'torque-speed curves', 'servo motor control', 'kinematic linkage design', 'payload capacity'] },
  ],
  CIVIL: [
    { title: 'Reinforced Concrete Structure & Seismic Design', keywords: ['tensile rebar reinforcement', 'compressive concrete strength', 'base isolation bearings', 'seismic moment frames', 'shear wall stability'] },
    { title: 'Soil Mechanics & Foundation Load Bearing', keywords: ['terzaghi consolidation theory', 'deep pile foundations', 'shear strength parameters', 'soil compaction testing', 'settlement analysis'] },
    { title: 'Hydrologic Runoff Modeling & Stormwater Drainage', keywords: ['peak discharge rate', 'watershed catchment areas', 'culvert design sizing', 'permeable pavement', 'flood risk mitigation'] },
    { title: 'Transportation Engineering & Pavement Materials', keywords: ['asphalt binder grades', 'traffic volume capacity', 'flexible vs rigid pavement', 'intersection signal timing', 'subgrade stability'] },
    { title: 'Environmental Waste Water Treatment Facilities', keywords: ['activated sludge process', 'biological oxygen demand', 'sedimentation tanks', 'tertiary membrane filtration', 'effluent standards'] },
  ],
  EEE: [
    { title: 'High Voltage Power Transmission & Smart Grids', keywords: ['transformer stepping', 'reactive power compensation', 'phasor measurement units', 'grid frequency stability', 'substation protection'] },
    { title: 'Renewable Energy Integration & Solar Inverters', keywords: ['maximum power point tracking', 'photovoltaic efficiency', 'grid-tied inverters', 'battery energy storage', 'harmonic distortion'] },
    { title: 'Synchronous Generator Control & Transient Stability', keywords: ['rotor speed governing', 'excitation control systems', 'fault current limiting', 'short circuit analysis', 'swing equation'] },
    { title: 'Electric Vehicle Powertrain & Brushless Motors', keywords: ['bms cell balancing', 'regenerative braking torque', 'permanent magnet motors', 'inverter switching loss', 'thermal management'] },
    { title: 'Industrial Automation & PLC Relay Logic', keywords: ['ladder logic programming', 'variable frequency drives', 'scada monitoring', 'industrial bus protocols', 'fail-safe interlocks'] },
  ],
  IT: [
    { title: 'Enterprise Information Security Management', keywords: ['identity access control', 'multi-factor authentication', 'compliance auditing', 'data loss prevention', 'security operations center'] },
    { title: 'Big Data Analytics Pipeline & Spark Processing', keywords: ['hadoop distributed file system', 'mapreduce paradigms', 'stream processing engines', 'data lakehouse design', 'partitioning keys'] },
    { title: 'DevOps Automated CI/CD Deployment Pipelines', keywords: ['github actions workflows', 'container registries', 'automated testing suites', 'blue-green deployment', 'artifact management'] },
    { title: 'Software Quality Assurance & Automation Frameworks', keywords: ['selenium end-to-end', 'unit testing coverage', 'regression test suites', 'api contract testing', 'bug tracking metrics'] },
    { title: 'Database Administration & Disaster Recovery Planning', keywords: ['point-in-time recovery', 'database replication lag', 'write-ahead logging', 'failover clustering', 'backup retention policy'] },
  ],
  MBA: [
    { title: 'Strategic Product Marketing & Brand Equity', keywords: ['customer acquisition cost', 'lifetime value metrics', 'market positioning map', 'omnichannel strategy', 'brand awareness campaigns'] },
    { title: 'Corporate Finance & Capital Budgeting Decisions', keywords: ['net present value', 'internal rate of return', 'discounted cash flows', 'weighted average cost', 'working capital management'] },
    { title: 'Supply Chain Operations & Agile Logistics', keywords: ['just-in-time inventory', 'vendor managed stock', 'last-mile delivery metrics', 'demand forecasting models', 'bullwhip effect'] },
    { title: 'Human Resource Management & Talent Retention', keywords: ['employee engagement index', 'performance appraisal systems', 'succession planning', 'competitive compensation', 'organizational culture'] },
    { title: 'Executive Leadership & Strategic Risk Management', keywords: ['change management framework', 'swot analysis matrix', 'stakeholder alignment', 'corporate governance', 'competitive advantage'] },
  ],
};

function generatePassageText(dept, topicObj, setIndex) {
  const kw = topicObj.keywords;
  return `In modern ${dept} engineering and practice, ${topicObj.title.toLowerCase()} plays a pivotal role in ensuring efficiency and scalability. Engineers and technical specialists regularly work with ${kw[0]} to streamline overall system performance. When implementing ${kw[1]}, it is critical to balance technical trade-offs alongside cost factors. Recent industry benchmarks demonstrate that integrating ${kw[2]} reduces downtime while optimizing ${kw[3]}. As projects scale, mastering ${kw[4]} enables teams to deliver robust, high-performance solutions in competitive technical environments (Set #${setIndex}).`;
}

function generateListeningScript(dept, topicObj, setIndex) {
  const kw = topicObj.keywords;
  const script = `Good morning team. In today's ${dept} technical briefing, we are reviewing our ongoing implementation of ${topicObj.title.toLowerCase()}. As you know, our primary objective is to implement ${kw[0]} and optimize ${kw[1]} across the deployment. The lead engineer highlighted that applying ${kw[2]} has already improved stability by twenty-five percent. Please focus your upcoming sprint on ${kw[3]} and verify that ${kw[4]} satisfies all quality compliance checks before Friday's delivery.`;
  
  const question = `What key objective was highlighted in today's ${dept} technical briefing for ${topicObj.title}?`;
  
  return { script, question };
}

/**
 * Ensures at least 50 Read Aloud Passages and 50 Listening Clips exist per department
 */
async function scrapeDepartmentContent(targetDept = null) {
  const deptsToProcess = targetDept ? [targetDept] : DEPARTMENTS;
  const stats = { passagesCreated: 0, clipsCreated: 0 };

  for (const dept of deptsToProcess) {
    const templates = DEPARTMENT_TOPIC_TEMPLATES[dept] || DEPARTMENT_TOPIC_TEMPLATES.CSE;

    const existingPassagesCount = await Passage.countDocuments({ department: dept });
    const existingClipsCount = await ListeningClip.countDocuments({ department: dept });

    // Guarantee creating at least 5 new sets per trigger run, or up to 50 if starting under 50
    const passagesNeeded = Math.max(5, Math.max(0, 50 - existingPassagesCount));
    const clipsNeeded = Math.max(5, Math.max(0, 50 - existingClipsCount));

    // Generate Passages
    const newPassages = [];
    for (let i = 0; i < passagesNeeded; i++) {
      const setIdx = existingPassagesCount + i + 1;
      const tmpl = templates[i % templates.length];
      const title = `${dept}: ${tmpl.title} (Scraped Set #${setIdx})`;
      const text = generatePassageText(dept, tmpl, setIdx);
      const wordCount = text.split(/\s+/).length;

      newPassages.push({
        title,
        department: dept,
        level: setIdx > 35 ? 'Advanced' : setIdx > 15 ? 'Intermediate' : 'Beginner',
        text,
        wordCount,
        source: 'scraped',
      });
    }

    if (newPassages.length) {
      await Passage.insertMany(newPassages);
      stats.passagesCreated += newPassages.length;
    }

    // Generate Listening Clips
    const newClips = [];
    for (let i = 0; i < clipsNeeded; i++) {
      const setIdx = existingClipsCount + i + 1;
      const tmpl = templates[i % templates.length];
      const title = `${dept}: ${tmpl.title} Audio Brief (Scraped Set #${setIdx})`;
      const { script, question } = generateListeningScript(dept, tmpl, setIdx);

      newClips.push({
        title,
        department: dept,
        level: setIdx > 35 ? 'Advanced' : setIdx > 15 ? 'Intermediate' : 'Beginner',
        script,
        question,
        source: 'scraped',
      });
    }

    if (newClips.length) {
      await ListeningClip.insertMany(newClips);
      stats.clipsCreated += newClips.length;
    }
  }

  return stats;
}

/**
 * Gets Question Bank metrics per department for Admin & Teacher views
 */
async function getQuestionBankStats() {
  const result = {};
  for (const dept of DEPARTMENTS) {
    const passageCount = await Passage.countDocuments({ department: dept });
    const clipCount = await ListeningClip.countDocuments({ department: dept });
    result[dept] = {
      passages: passageCount,
      clips: clipCount,
      totalSets: passageCount + clipCount,
      status: passageCount >= 50 && clipCount >= 50 ? 'Ready (50+ sets)' : 'Building',
    };
  }
  return result;
}

module.exports = {
  scrapeDepartmentContent,
  getQuestionBankStats,
  DEPARTMENTS,
};
