import re

with open('src/app.jsx', 'r') as f:
    for i, line in enumerate(f):
        if 'startChallenge' in line and '=' in line:
            print(f"{i+1}: {line.strip()}")
