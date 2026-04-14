import re

with open('src/app.jsx', 'r') as f:
    lines = f.readlines()

new_wizard = """
const OnboardingWizard = ({ showOnboarding, onboardingStep, setOnboardingStep, onboardingData, setOnboardingData, setShowOnboarding, currentUser, startChallenge }) => {
  const steps = [
    {
      title: "Welcome to SQL Quest! 🚀",
      description: "Ready to master the language of data? We'll get you from SELECT to JOIN in no time.",
      image: "https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=400&h=250&fit=crop",
      button: "Let's go!"
    },
    {
      title: "Tell us about yourself",
      description: "How much SQL do you know? We'll tailor the experience for you.",
      options: [
        { id: 'beginner', label: 'Beginner', desc: 'New to SQL' },
        { id: 'intermediate', label: 'Intermediate', desc: 'Know basics, want practice' },
        { id: 'pro', label: 'Pro', desc: 'Interview prep & advanced' }
      ]
    },
    {
      title: "What's your main goal?",
      description: "What are you looking to achieve first?",
      options: [
        { id: 'career', label: 'Career Growth', desc: 'Land a data job' },
        { id: 'skill', label: 'Skill Up', desc: 'Improve my technical skills' },
        { id: 'fun', label: 'Just for Fun', desc: 'Learn something new' }
      ]
    }
  ];

  if (onboardingStep >= steps.length) return null;
  const currentStepData = steps[onboardingStep];

  const handleNext = () => {
    if (onboardingStep < steps.length - 1) {
      setOnboardingStep(onboardingStep + 1);
    } else {
      setShowOnboarding(false);
      if (typeof startChallenge === 'function') {
        startChallenge(0);
      }
    }
  };

  if (!showOnboarding) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-purple-500/30 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl">
        <div className="h-2 bg-gray-800">
          <div
            className="h-full bg-purple-600 transition-all duration-500"
            style={{ width: `${((onboardingStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        <div className="p-8 text-center">
          {currentStepData.image && (
            <img src={currentStepData.image} alt="Welcome" className="w-full h-40 object-cover rounded-2xl mb-6 border border-white/10" />
          )}

          <h2 className="text-3xl font-bold mb-2 text-white">{currentStepData.title}</h2>
          <p className="text-gray-400 mb-8">{currentStepData.description}</p>

          {currentStepData.options ? (
            <div className="space-y-3 mb-8">
              {currentStepData.options.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setOnboardingData({ ...onboardingData, [onboardingStep === 1 ? 'level' : 'goal']: opt.id })}
                  className={`w-full p-4 rounded-xl border transition-all text-left flex items-center justify-between ${
                    (onboardingStep === 1 ? onboardingData.level : onboardingData.goal) === opt.id
                    ? 'bg-purple-600/20 border-purple-500 ring-1 ring-purple-500'
                    : 'bg-gray-800/50 border-gray-700 hover:border-gray-500'
                  }`}
                >
                  <div>
                    <div className="font-bold text-white">{opt.label}</div>
                    <div className="text-xs text-gray-400">{opt.desc}</div>
                  </div>
                  {(onboardingStep === 1 ? onboardingData.level : onboardingData.goal) === opt.id && (
                    <div className="bg-purple-500 rounded-full p-1">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : null}

          <button
            onClick={handleNext}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-purple-500/25 transition-all transform active:scale-[0.98]"
          >
            {currentStepData.button || "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
};
"""

def find_block_end(lines, start_idx):
    depth = 0
    for i in range(start_idx, len(lines)):
        line = lines[i]
        depth += line.count('(') - line.count(')')
        depth += line.count('{') - line.count('}')
        if depth == 0:
            return i + 1
    return -1

# Find where to insert component (before SQLQuest)
insert_idx = -1
for i, line in enumerate(lines):
    if "export default function SQLQuest" in line:
        insert_idx = i
        break

if insert_idx != -1:
    lines.insert(insert_idx, new_wizard + "\n")
    print("Inserted OnboardingWizard component")

# Replace old onboarding block in JSX
for i, line in enumerate(lines):
    if "showOnboarding && (" in line and i > insert_idx:
        end = find_block_end(lines, i)
        if end != -1:
            lines[i:end] = ["      {showOnboarding && <OnboardingWizard showOnboarding={showOnboarding} onboardingStep={onboardingStep} setOnboardingStep={setOnboardingStep} onboardingData={onboardingData} setOnboardingData={setOnboardingData} setShowOnboarding={setShowOnboarding} currentUser={currentUser} startChallenge={startChallenge} />}\n"]
            print("Replaced onboarding usage in JSX")
            break

# Add trigger logic in useEffect
for i, line in enumerate(lines):
    if "const [showOnboarding, setShowOnboarding] = useState(false);" in line:
        lines.insert(i+1, "  useEffect(() => { if (!localStorage.getItem('sqlquest_has_onboarded')) { setShowOnboarding(true); setOnboardingStep(0); localStorage.setItem('sqlquest_has_onboarded', 'true'); } }, []);\n")
        print("Added onboarding trigger")
        break

with open('src/app.jsx', 'w') as f:
    f.writelines(lines)
