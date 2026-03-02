# SQL Quest — Architecture Guide

## Quick Overview

The app is **one main file** (`src/app.jsx` ~18,600 lines) that gets compiled to `public/app.js`.

```
src/app.jsx          → Source code (edit this)
public/app.js        → Built output (auto-generated, don't edit)
public/data.js       → Challenge/exercise data
public/index.html    → Entry HTML
public/styles.css    → Tailwind CSS
api/chat.js          → AI tutor API endpoint
```

Build command: `npm run build:jsx`


## Feature Registry (top of app.jsx)

Every optional feature has a flag in the `FEATURES` object at the top of `src/app.jsx`:

```js
const FEATURES = {
  BOSS_BATTLE:      true,
  DAILY_WORKOUT:    true,
  THIRTY_DAY:       true,
  CERTIFICATES:     true,
  // ...set to false to hide from UI
};
```

**To disable a feature instantly**: set its flag to `false` → rebuild.
**To fully remove a feature**: delete the line ranges below → rebuild.


## Feature Map — Where Everything Lives

Each feature has 3 parts: **State** (useState), **Logic** (functions), **UI** (JSX render).

### Optional Features (safe to remove)

| Feature | Flag | Logic Lines | UI Lines | ~Size |
|---------|------|-------------|----------|-------|
| Boss Battle | `BOSS_BATTLE` | 3612–3867 | search `bossBattle` in JSX | 256 |
| Daily Workout | `DAILY_WORKOUT` | 3868–3974 | search `dailyWorkout` in JSX | 107 |
| Weakness Training | `WEAKNESS_TRAIN` | 3975–5146 | search `weakness` in JSX | 1172 |
| 30-Day Challenge | `THIRTY_DAY` | 6252–6826 | L11437 `show30DayChallenge` | 575 |
| Certificates | `CERTIFICATES` | 6114–6251 | L11385 `showCertificateModal` | 138 |
| Share Results | `SHARE_RESULTS` | 6004–6113 | L11229 `showShareModal` | 110 |
| Shareable Assets | `SHAREABLE_ASSETS` | 6827–7575 | search `showShareable` in JSX | 749 |
| SQL Detective | `DETECTIVE` | 2542–2684 | L16846 `practiceSubTab === 'detective'` | 143 |
| Warm-Up Quiz | `WARMUP_QUIZ` | 2685–2782 | L11073 `showWarmUp` | 98 |
| Learning Goals | `LEARNING_GOALS` | 5928–6003 | L11135 `showGoalsModal` | 76 |
| Referrals | `REFERRALS` | search `referral` | L11309 `showReferralModal` | ~80 |
| Weekly Report | `WEEKLY_REPORT` | search `weeklyReport` | L13219 `showWeeklyReport` | ~100 |
| Smart Notifications | `SMART_NOTIFS` | 2783–3611 | notification bell in header | 829 |

### Core Features (don't remove)

| Feature | Lines | Description |
|---------|-------|-------------|
| Auth/Login | 7681–8129 | Login, signup, password reset |
| Guest Mode | 7576–7680 | Try-before-signup |
| Interview System | 5147–5821 | Mock interviews |
| Daily Challenge | 8286–8442 admin, UI at L12304 | Daily SQL challenge |
| AI Tutor | 8443+ and Learn tab | AI-powered lessons |
| Challenges (Solve) | Practice tab | Core SQL challenges |
| Exercises (Drills) | Practice tab | Guided SQL exercises |
| Admin | 8130–8285 | Admin panel |


## How to Remove a Feature (3 steps)

Example: Removing **Boss Battle**

1. **Set flag to false** (or delete the line):
   ```js
   BOSS_BATTLE: false,
   ```

2. **Delete the logic block** (lines 3612–3867):
   - Look for `// ============ BOSS BATTLE SYSTEM ============`
   - Delete until the next `// ============` marker

3. **Clean up references** (search & delete):
   ```bash
   grep -n "bossBattle\|bossHP\|bossMax\|defeatedBosses\|bossReward" src/app.jsx
   ```
   - Delete matching useState lines (~L2137)
   - Delete any JSX render blocks that reference these vars
   - Delete from the save/load objects

4. Rebuild: `npm run build:jsx`


## How to Add a New Feature

1. **Add flag** to `FEATURES` at top of file

2. **Add state** near line ~2100 (with other feature state):
   ```js
   // === MY_FEATURE STATE ===
   const [myData, setMyData] = useState(null);
   ```

3. **Add logic** after existing features (~line 6800):
   ```js
   // ============ MY FEATURE SYSTEM ============
   const doMyThing = () => { ... };
   // ============ END MY FEATURE ============
   ```

4. **Add UI** in the render section (~line 11000 for modals, ~16000 for tabs):
   ```jsx
   {FEATURES.MY_FEATURE && showMyModal && (
     <div>...</div>
   )}
   ```

5. **Add to save/load** (~line 2420 save effect) if data needs persistence

6. Rebuild: `npm run build:jsx`


## File Structure

```
sql-quest2/
├── src/
│   ├── app.jsx          ← THE source file (edit here)
│   ├── data/            ← Challenge/exercise JSON data
│   ├── index.html       ← HTML template
│   └── input.css        ← Tailwind input
├── public/              ← Served files (auto-generated)
│   ├── app.js           ← Built from src/app.jsx
│   ├── data.js          ← Built from src/data/
│   ├── index.html       ← Entry point
│   └── styles.css       ← Built Tailwind
├── api/
│   └── chat.js          ← AI tutor Vercel function
├── supabase/            ← Edge functions (Stripe, etc.)
├── ARCHITECTURE.md      ← This file
├── package.json
└── vercel.json
```

## Build Commands

```bash
npm run build:jsx    # Compile src/app.jsx → public/app.js
npm run build:css    # Compile Tailwind → public/styles.css
npm run build:data   # Bundle data files → public/data.js
npm run build        # All of the above
npm run dev          # Serve public/ locally
```

## Section Map (line ranges in src/app.jsx)

```
L1-90        Icons & globals
L91-284      Storage & Supabase helpers
L285-580     User data functions
L581-672     Load external data
L673-976     Topic detection & recommendations
L977-1791    Shared UI components (PixelCoin, charts, etc.)
L1792-2200   State declarations (all useState)
L2200-2541   Init effects (login, save/load, timers)
L2542-3611   Feature data & logic (Detective, Warmup, Notifications)
L3612-5146   Game systems (Boss, Workout, Weakness)
L5147-5821   Interview enhancement
L5822-6826   Rewards & progression (Login, Goals, Share, Certs, 30-Day)
L6827-7575   Shareable assets
L7576-8442   Auth, Admin, Guest mode
L8443-9500   AI tutor context & helpers
L9500-10500  Header, auth modals, profile, admin UI
L10500-15100 Feature modals (all the popup overlays)
L15100-16000 Main layout, tab nav, sub-tab nav
L16000-18632 Tab content renders (Learn, Practice, Interview, Stats)
```
