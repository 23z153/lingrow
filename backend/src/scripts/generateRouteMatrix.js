'use strict';

const fs = require('fs');
const path = require('path');
const createApp = require('../app');
const { MODULE_MIN_LEVEL, LEVELS } = require('../config/levelAccess');

const app = createApp();

function splitRegexp(thing) {
  if (typeof thing === 'string') return thing;
  if (thing.fast_slash) return '';
  const match = thing.toString()
    .replace('\\/?', '')
    .replace('(?=\\/|$)', '$')
    .match(/^\/\^((?:\\[.*+?^${}()|[\]\\\/]|[^.*+?^${}()|[\]\\\/])*)\$\//);
  return match ? match[1].replace(/\\(.)/g, '$1') : '';
}

function getRoutes(appInstance) {
  const routes = [];

  // Group top-level middleware layers by mount path
  const prefixMiddlewares = {};
  appInstance._router.stack.forEach((layer) => {
    const mount = splitRegexp(layer.regexp);
    if (mount) {
      if (!prefixMiddlewares[mount]) prefixMiddlewares[mount] = [];
      if (layer.name !== 'router' && layer.name !== 'bound dispatch') {
        prefixMiddlewares[mount].push(layer.name || 'anonymous');
      }
    }
  });

  appInstance._router.stack.forEach((layer) => {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods).map((m) => m.toUpperCase());
      methods.forEach((method) => {
        routes.push({
          method,
          path: layer.route.path,
          middlewares: layer.route.stack.map((s) => s.name || 'anonymous'),
        });
      });
    } else if (layer.name === 'router' && layer.handle.stack) {
      const mountPath = splitRegexp(layer.regexp);
      const topMw = prefixMiddlewares[mountPath] || [];

      layer.handle.stack.forEach((subLayer) => {
        if (subLayer.route) {
          const methods = Object.keys(subLayer.route.methods).map((m) => m.toUpperCase());
          const routeMw = subLayer.route.stack.map((s) => s.name || 'anonymous');
          const fullMw = [...topMw, ...routeMw];

          methods.forEach((method) => {
            routes.push({
              method,
              path: (mountPath + subLayer.route.path).replace('//', '/'),
              middlewares: fullMw,
            });
          });
        }
      });
    }
  });

  return routes;
}

const allRoutes = getRoutes(app);

// Learner-facing module prefixes
const LEARNER_PREFIXES = [
  '/api/grammar',
  '/api/vocabulary',
  '/api/listening',
  '/api/story',
  '/api/situational',
  '/api/weakwords',
  '/api/tutor',
  '/api/practice',
  '/api/simulation',
  '/api/idioms',
  '/api/peer',
  '/api/world-stage',
  '/api/debate',
  '/api/gd',
  '/api/tests',
  '/api/challenges',
  '/api/lessons',
  '/api/notifications',
  '/api/progress',
];

const learnerRoutes = allRoutes.filter((r) =>
  LEARNER_PREFIXES.some((prefix) => r.path.startsWith(prefix))
);

function getRequiredLevel(routePath) {
  for (const [modKey, lvl] of Object.entries(MODULE_MIN_LEVEL)) {
    if (routePath.startsWith(`/api/${modKey}`)) return lvl;
  }
  if (routePath.startsWith('/api/read-aloud') || routePath.startsWith('/api/practice')) return LEVELS.INTERMEDIATE;
  if (routePath.startsWith('/api/simulation')) return LEVELS.INTERMEDIATE;
  if (routePath.startsWith('/api/world-stage') || routePath.startsWith('/api/debate')) return LEVELS.ADVANCED;
  return 'None (Onboarded only)';
}

function getRolesExempt(routePath) {
  return 'Teacher, Admin';
}

function formatMiddlewareChain(mwList) {
  // Deduplicate and filter noise
  const clean = mwList
    .map((m) => (m === '<anonymous>' ? 'anonymous' : m))
    .filter((m, i, arr) => arr.indexOf(m) === i);
  return clean.join(' -> ');
}

let table = '| HTTP METHOD | PATH | MIDDLEWARE CHAIN | LEVEL REQUIRED | ROLES EXEMPT |\n';
table += '|---|---|---|---|---|\n';

learnerRoutes.forEach((r) => {
  const mw = formatMiddlewareChain(r.middlewares);
  const lvl = getRequiredLevel(r.path);
  const exempt = getRolesExempt(r.path);
  table += `| \`${r.method}\` | \`${r.path}\` | \`${mw}\` | **${lvl}** | ${exempt} |\n`;
});

const docsDir = path.join(__dirname, '..', '..', '..', 'docs');
if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });

const docPath = path.join(docsDir, 'route-access-matrix.md');
fs.writeFileSync(
  docPath,
  `# LinGrow AI: Learner-Facing Route Access Matrix\n\n*Generated from the running Express application stack.*\n\n${table}\n`
);

console.log(`Successfully generated route matrix with ${learnerRoutes.length} learner-facing endpoints.`);
console.log(`Saved to ${docPath}`);
