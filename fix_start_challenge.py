with open('src/app.jsx', 'r') as f:
    lines = f.readlines()

# Find SQLQuest
insert_idx = -1
for i, line in enumerate(lines):
    if "function SQLQuest()" in line:
        insert_idx = i
        break

if insert_idx != -1:
    # Add startChallenge definition
    lines.insert(insert_idx + 10, """
  const startChallenge = (challengeId) => {
    const challenge = (window.challengesData || []).find(c => c.id === challengeId);
    if (challenge) {
      setActiveTab('quests');
      setPracticeSubTab('challenges');
      setCurrentChallenge(challenge);
      setQuery('');
      setResults({ columns: [], rows: [], error: null });
    }
  };
""")

with open('src/app.jsx', 'w') as f:
    f.writelines(lines)
