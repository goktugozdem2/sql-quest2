file_path = 'src/data/challenges.js'
with open(file_path, 'r') as f:
    content = f.read()

challenge_0 = """  {
    id: 0,
    title: "Your First Query",
    difficulty: "Easy",
    category: "Basics",
    skills: ["SELECT"],
    xpReward: 50,
    description: "Welcome to SQL Quest! Let's start by getting all the data from our movies table. This is the foundation of everything you'll do.",
    tables: ["movies"],
    question: "Select all columns from the movies table.",
    solution: "SELECT * FROM movies",
    hint: "Use SELECT * followed by FROM and the table name.",
    dataset: "movies",
    isTutorial: true
  },"""

if 'window.challengesData = [' in content:
    if 'Your First Query' not in content:
        new_content = content.replace('window.challengesData = [', 'window.challengesData = [\n' + challenge_0)
        with open(file_path, 'w') as f:
            f.write(new_content)
        print("Updated challenges.js")
