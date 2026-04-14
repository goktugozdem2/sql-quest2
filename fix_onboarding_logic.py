with open('src/app.jsx', 'r') as f:
    lines = f.readlines()

# Remove the duplicated/incorrect trigger
new_lines = []
for line in lines:
    if "localStorage.getItem('sqlquest_has_onboarded')" in line:
        continue
    new_lines.append(line)

with open('src/app.jsx', 'w') as f:
    f.writelines(new_lines)
