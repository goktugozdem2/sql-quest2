import React from 'react';
import ReactDOM from 'react-dom/client';

// CSS (Tailwind + custom styles)
import './index.css';

// Bridge: set up window globals for supabase, lucide icons, etc.
import './setup.js';

// Data files (these set window.* globals)
import './data/config.js';
import './data/datasets.js';
import './data/challenges.js';
import './data/exercises.js';
import './data/lessons.js';
import './data/daily-challenges.js';
import './data/mock-interviews.js';
import './data/thirty-day-challenge.js';
import './data/curriculum.js';
import './data/thirty-day-complete-1.js';
import './data/thirty-day-complete-2.js';

// Main app component
import SQLQuest from './app.jsx';

// Render
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(SQLQuest));

console.log(`[${Math.round(performance.now())}ms] App rendered`);
