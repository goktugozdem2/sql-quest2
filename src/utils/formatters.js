// Format cell values - numbers to 2 decimal places
const formatCell = (cell, maxLength = null) => {
  if (cell === null || cell === undefined) return 'NULL';

  // Check if it's a number or a numeric string
  const numValue = typeof cell === 'number' ? cell : (typeof cell === 'string' && !isNaN(cell) && cell.trim() !== '' ? parseFloat(cell) : null);

  if (numValue !== null && typeof numValue === 'number' && !isNaN(numValue)) {
    // Format numbers: if it has decimals, round to 2
    if (!Number.isInteger(numValue)) {
      const formatted = numValue.toFixed(2);
      return maxLength ? formatted.slice(0, maxLength) : formatted;
    }
    return maxLength ? String(numValue).slice(0, maxLength) : String(numValue);
  }
  return maxLength ? String(cell).slice(0, maxLength) : String(cell);
};

// Format seconds to MM:SS
const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Highlight SQL code using Prism.js (browser-only, returns escaped HTML as fallback)
const highlightSQL = (code) => {
  if (!code) return '';
  try {
    if (typeof window !== 'undefined' && window.Prism && window.Prism.languages.sql) {
      return window.Prism.highlight(code, window.Prism.languages.sql, 'sql');
    }
  } catch (e) {
    console.warn('Prism highlighting failed:', e);
  }
  return code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
};

export { formatCell, formatTime, highlightSQL };
