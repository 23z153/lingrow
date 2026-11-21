# LinGrow AI: Production Deployment Sequence & Rollback Plan

## 1. Analysis of Migration-Before-Code Race Window

Running the database migration (`src/scripts/migrateUserLevels.js`) *before* deploying updated backend application code causes severe operational failures:

### What happens if an existing student logs in between migration and code deployment?
1. **Unassigned Level in Legacy Code**: The migration sets `onboardingCompleted: false`, archives the existing level into `legacyLevel`, and resets `level: null`. Legacy backend code (prior to Gate 2/Gate 3) expects `user.level` to be a valid enum string (`'Beginner'`, `'Intermediate'`, `'Advanced'`) and has no awareness of `onboardingCompleted`.
2. **Access Control Crash / 500 Errors**: Route gates using `canUserAccessLevel` or `user.getUnlockedLevels()` without null-safety will either crash, throw unhandled exceptions, or fall back to inconsistent states (`['Beginner']`).
3. **Session Desynchronization**: Legacy frontend has no UI modal or routing to direct an un-onboarded user to `/placement/start` or `select-level`. The user sees locked kingdoms with no actionable path forward, causing panic and support tickets.
4. **Data Corruption**: If a student interacts with legacy progression endpoints before code deploy, their XP activity completion could attempt to write to `unlockedLevels` or overwrite fields without setting `onboardingCompleted`.

---

## 2. Safe Phased Deployment Order

To guarantee zero downtime and fail-closed security, the deployment must strictly follow this order:

```
[Phase 0: Backup]
       │
       ▼
[Phase 1: Deploy Backend & Frontend (Gate 4 UI)]
       │  (Fail-closed guards active; legacy users missing onboardingCompleted
       │   are safely intercepted with ONBOARDING_REQUIRED)
       ▼
[Phase 2: Database Migration]
       │  (Dry-run verification -> Idempotent batch update -> Re-verify)
       ▼
[Phase 3: Smoke Verification & Monitoring]
```

### Phase 0: Pre-Deployment Safety & Database Snapshot
1. Complete automated CI test suite run: `cd backend && npm test`.
2. Create an isolated full MongoDB backup snapshot:
   ```bash
   mongodump --uri="$MONGODB_URI" --out="/backups/lingrow-pre-gate3b-$(date +%Y%m%d%H%M%S)"
   ```
3. Verify backup archive integrity and document timestamp.

### Phase 1: Deploy Backend & Frontend Application Code
1. Deploy the updated backend code containing:
   - Fail-closed `requireOnboarded` and `requireModuleAccess` middlewares.
   - Atomic placement session issuance with partial unique index (`activeKey`).
   - Cleaned `TIER_DETAILS` configuration and isolated placement question bank.
2. Deploy the updated frontend code (Gate 4):
   - Navigation sync with `NAV.student` and kingdom display names.
   - Onboarding modal interceptor triggering when `user.onboardingCompleted === false`.
3. **Handling of In-Flight / Mixed State**:
   - At this moment, existing users in the database still have `onboardingCompleted: undefined`.
   - Because `requireOnboarded` is **fail-closed** (`req.user.onboardingCompleted === true && typeof req.user.level === 'string'`), any unmigrated student hitting a gated kingdom is cleanly caught with `403 ONBOARDING_REQUIRED` and presented the onboarding modal by the newly deployed frontend.
   - Teachers and administrators bypass all learner gates and retain uninterrupted access.

### Phase 2: Database Migration Execution
1. Run the migration in dry-run mode to verify impacted document counts:
   ```bash
   cd backend
   node src/scripts/migrateUserLevels.js --dry-run
   ```
2. Confirm the dry-run statistics match expected active student counts (teachers and admins must show as exempt).
3. Execute the live migration:
   ```bash
   node src/scripts/migrateUserLevels.js --apply
   ```
4. Verify idempotency by immediately re-running with `--apply`:
   ```bash
   node src/scripts/migrateUserLevels.js --apply
   ```
   *Expected output: `alreadyMigrated: N`, `migratedCount: 0`.*

### Phase 3: Post-Deployment Smoke Verification
1. Health check:
   ```bash
   curl -s http://localhost:5000/api/health
   ```
2. Configuration schema check:
   ```bash
   curl -s http://localhost:5000/api/levels/config -H "Authorization: Bearer <ADMIN_OR_TEACHER_TOKEN>"
   ```
   *Verify: Hatchling, Flame Keeper, Sky Guardian; no answer keys; promotionCriteria is null.*
3. Test a newly provisioned student login: verify redirection to Dragon Egg Trial.
4. Test teacher login: verify full access to class overview and student legacy levels.

---

## 3. Rollback Plan

If an unrecoverable defect is detected during or after deployment:

### Scenario A: Rollback during Phase 1 (Code Deploy Failure)
1. Revert application containers / processes to the previous stable release commit (`gate-2.2`).
2. Database was untouched; zero data restoration needed.

### Scenario B: Rollback after Phase 2 (Migration Reversal)
1. Immediately stop the API server to prevent dirty writes:
   ```bash
   pm2 stop lingrow-backend
   ```
2. Restore the pre-deployment database snapshot:
   ```bash
   mongorestore --uri="$MONGODB_URI" --drop "/backups/lingrow-pre-gate3b-<TIMESTAMP>"
   ```
3. Revert code deploy to the previous stable commit:
   ```bash
   git checkout gate-2.2
   npm install --production
   ```
4. Restart application server:
   ```bash
   pm2 start lingrow-backend
   ```
5. Smoke test application login and verify user levels match pre-deployment state.
