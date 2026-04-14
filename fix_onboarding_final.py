with open('src/app.jsx', 'r') as f:
    content = f.read()

# Update handleNext to save state
old_handle_next = """    if (onboardingStep < steps.length - 1) {
      setOnboardingStep(onboardingStep + 1);
    } else {
      setShowOnboarding(false);
      if (typeof startChallenge === 'function') {
        startChallenge(0);
      }
    }"""

new_handle_next = """    if (onboardingStep < steps.length - 1) {
      setOnboardingStep(onboardingStep + 1);
    } else {
      setShowOnboarding(false);
      localStorage.setItem('sqlquest_onboarding_completed', 'true');
      if (typeof startChallenge === 'function') {
        startChallenge(0);
      }
    }"""

content = content.replace(old_handle_next, new_handle_next)

# Ensure the trigger is correct
# I previously added: useEffect(() => { if (!localStorage.getItem('sqlquest_has_onboarded')) { setShowOnboarding(true); setOnboardingStep(0); localStorage.setItem('sqlquest_has_onboarded', 'true'); } }, []);
# Let's remove it and use the one that was already there or improve it.

import re
content = re.sub(r"useEffect\(\(\) => \{ if \(!localStorage\.getItem\('sqlquest_has_onboarded'\)\).*?\}, \[\]\);", "", content)

with open('src/app.jsx', 'w') as f:
    f.write(content)
