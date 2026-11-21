# SQL Quest - Rewards & XP Management

## Quick Start

All XP values are in `src/data/rewards-config.js`. Edit and deploy!

```javascript
window.REWARDS = {
  challenges: { easy: 15, medium: 25, hard: 40, expert: 60 },
  daily: { warmup: 10, core: 30, insight: 10 },
  interviews: { perQuestion: 20, completion: 30, passing: 50 },
  // ... more settings
};
```

## All XP Values

### Challenges
| Difficulty | XP | Config |
|------------|-----|--------|
| Easy | 15 | `challenges.easy` |
| Medium | 25 | `challenges.medium` |
| Hard | 40 | `challenges.hard` |
| Expert | 60 | `challenges.expert` |

### Daily Challenge
| Part | XP | Config |
|------|-----|--------|
| Warmup | 10 | `daily.warmup` |
| Core | 30 | `daily.core` |
| Insight | 10 | `daily.insight` |

### Streak Bonuses
| Days | Bonus | Config |
|------|-------|--------|
| 3 | +15 | `daily.streak3` |
| 7 | +30 | `daily.streak7` |
| 14 | +50 | `daily.streak14` |
| 30 | +100 | `daily.streak30` |

### Workout
- Base: 20 XP (`workout.base`)
- Per Correct: 15 XP (`workout.perCorrect`)
- Formula: `base + (correct × perCorrect)`

## Multipliers (Events)

```javascript
window.REWARDS.multipliers = {
  weekend: 2.0,  // 2x XP weekends
  event: 1.5,    // 50% bonus event
};
```

## Console Commands

```javascript
window.REWARDS                    // View all
window.REWARDS.daily.core = 50    // Change (temp)
window.Rewards.calcWorkoutXP(5)   // Test calc
```

## Deploy

```bash
node scripts/bundle-data.js
vercel --prod
```
