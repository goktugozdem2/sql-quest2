with open('src/app.jsx', 'r') as f:
    content = f.read()

# Trigger tutorial when Challenge 0 is started
old_code = """      setCurrentChallenge(challenge);
      setQuery('');"""

new_code = """      setCurrentChallenge(challenge);
      if (challengeId === 0) {
        setShowTutorial(true);
        setTutorialStep(0);
      }
      setQuery('');"""

content = content.replace(old_code, new_code)

with open('src/app.jsx', 'w') as f:
    f.write(content)
