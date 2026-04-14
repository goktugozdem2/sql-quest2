with open('src/app.jsx', 'r') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "const [showOnboarding, setShowOnboarding] = useState(false);" in line:
        lines.insert(i+1, "  window.setShowOnboarding = setShowOnboarding;\n")
        break

with open('src/app.jsx', 'w') as f:
    f.writelines(lines)
