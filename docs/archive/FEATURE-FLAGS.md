# SQL Quest - Feature Flags & A/B Testing Guide

## Quick Start

### Enable/Disable a Tab
Edit `src/data/feature-flags.js`:
```javascript
window.FEATURE_FLAGS = {
  tabs: {
    guide: true,        // ✅ Visible
    quests: true,       // ✅ Visible  
    trials: false,      // ❌ Hidden - set to false to hide
    leaderboard: true,  // ✅ Visible
    hero: true,         // ✅ Visible
    community: false,   // ❌ Hidden (new feature, disabled by default)
  },
  // ...
};
```

### Enable/Disable a Feature
```javascript
window.FEATURE_FLAGS = {
  features: {
    smartErrorFeedback: true,   // ✅ Enabled
    voiceMode: false,           // ❌ Disabled
    // ...
  },
};
```

---

## Testing Features via URL

You can override any feature flag via URL parameters for testing:

```
https://sqlquest.app/app?ff_tabs_community=true
https://sqlquest.app/app?ff_features_voiceMode=true
https://sqlquest.app/app?ff_tabs_trials=false
```

Format: `?ff_{category}_{flag}={true|false}`

---

## A/B Testing

### Enabling an A/B Test
Set `enabled: true` in the test configuration:

```javascript
window.AB_TESTS = {
  tabNames: {
    id: 'tab_names_v1',
    enabled: true,  // ← Set to true to activate
    variants: {
      control: { guide: '🧠 Learn', ... },
      questTheme: { guide: '🧙 Guide', ... },
      simple: { guide: '📖 Learn', ... }
    },
    weights: { control: 34, questTheme: 33, simple: 33 }
  },
};
```

### Check User's Variant (in code)
```javascript
const variant = window.AB.getVariant('tabNames');
// Returns: 'control', 'questTheme', or 'simple'

const config = window.AB.getConfig('tabNames');
// Returns the variant's config object
```

### Track Conversion Events
```javascript
// When user completes an action you want to measure
window.AB.trackEvent('tabNames', 'tab_clicked', 'quests');
window.AB.trackEvent('pricing', 'purchase', 'annual');
```

### Force a Variant (for testing)
```javascript
// In browser console:
window.AB.force('tabNames', 'questTheme');
// Refresh to see changes

// Reset all tests:
window.AB.reset();
```

---

## Available Feature Flags

### Tabs
| Flag | Description | Default |
|------|-------------|---------|
| `tabs.guide` | 🧠 Learn tab | `true` |
| `tabs.quests` | ⚔️ Practice tab | `true` |
| `tabs.trials` | 💼 Interview tab | `true` |
| `tabs.leaderboard` | 🏅 Ranks tab | `true` |
| `tabs.hero` | 📊 Stats tab | `true` |
| `tabs.community` | 👥 Community (new) | `false` |
| `tabs.courses` | 📚 Courses (new) | `false` |

### Practice Subtabs
| Flag | Description | Default |
|------|-------------|---------|
| `practiceSubtabs.challenges` | 🏆 Solve | `true` |
| `practiceSubtabs.speedRun` | ⚡ Blitz | `true` |
| `practiceSubtabs.skillForge` | 🎯 Train | `true` |
| `practiceSubtabs.exercises` | 📝 Drills | `true` |
| `practiceSubtabs.explain` | 🔍 Read | `true` |
| `practiceSubtabs.sandbox` | 🧪 Sandbox (new) | `false` |

### Features
| Flag | Description | Default |
|------|-------------|---------|
| `features.aiTutor` | AI tutoring system | `true` |
| `features.dailyChallenge` | Daily challenges | `true` |
| `features.mockInterviews` | Mock interviews | `true` |
| `features.smartErrorFeedback` | Helpful error messages | `true` |
| `features.voiceMode` | Text-to-speech | `false` |
| `features.offlineMode` | PWA offline support | `false` |

---

## Console Commands

```javascript
// Check if a feature is enabled
window.FF.tab('community')           // false
window.FF.feature('smartErrorFeedback')  // true

// Toggle a feature (development only)
window.FF.toggle('tabs', 'community')

// Get all enabled tabs
window.FF.getEnabled('tabs')  
// ['guide', 'quests', 'trials', 'leaderboard', 'hero']

// A/B Testing
window.AB.getActive()     // Get all active tests with user's variants
window.AB.force('tabNames', 'questTheme')  // Force a variant
window.AB.reset()         // Reset all test assignments
```

---

## Adding a New Tab

1. **Add the flag** in `feature-flags.js`:
```javascript
tabs: {
  // ... existing tabs
  myNewTab: false,  // Disabled by default
},
```

2. **Add to tab array** in `app.jsx`:
```javascript
{ id: 'myNewTab', label: '✨ New Tab', flag: 'myNewTab' },
```

3. **Add tab content** in `app.jsx`:
```javascript
{activeTab === 'myNewTab' && (
  <div>Your new tab content here</div>
)}
```

4. **Enable when ready**:
```javascript
tabs: {
  myNewTab: true,  // Now visible!
},
```

---

## Adding a New A/B Test

1. **Define the test** in `feature-flags.js`:
```javascript
window.AB_TESTS = {
  // ... existing tests
  myTest: {
    id: 'my_test_v1',
    enabled: true,
    variants: {
      control: { buttonText: 'Sign Up' },
      variantA: { buttonText: 'Get Started' },
      variantB: { buttonText: 'Try Free' }
    },
    weights: { control: 34, variantA: 33, variantB: 33 }
  }
};
```

2. **Use in code**:
```javascript
const config = window.AB.getConfig('myTest');
const buttonText = config?.buttonText || 'Sign Up';
```

3. **Track conversions**:
```javascript
window.AB.trackEvent('myTest', 'button_clicked');
window.AB.trackEvent('myTest', 'signup_completed');
```

---

## Build & Deploy

After changing feature flags:

```bash
# Bundle the data files (including feature-flags.js)
node scripts/bundle-data.js

# Deploy to Vercel
vercel --prod
```

Changes to feature flags take effect immediately on the next page load!
