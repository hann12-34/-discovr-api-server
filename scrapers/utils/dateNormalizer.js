/**
 * Date Normalizer Utility
 * Converts various date formats to ISO 8601 (YYYY-MM-DD) for consistent iOS parsing
 */

function toISODate(dateText) {
  if (!dateText || typeof dateText !== 'string') {
    return null;
  }

  // Clean the date text
  let cleaned = dateText
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/(\d+)(st|nd|rd|th)/gi, '$1')
    .trim();

  // Month name to number mapping
  const monthMap = {
    'jan': 1, 'january': 1,
    'feb': 2, 'february': 2,
    'mar': 3, 'march': 3,
    'apr': 4, 'april': 4,
    'may': 5,
    'jun': 6, 'june': 6,
    'jul': 7, 'july': 7,
    'aug': 8, 'august': 8,
    'sep': 9, 'sept': 9, 'september': 9,
    'oct': 10, 'october': 10,
    'nov': 11, 'november': 11,
    'dec': 12, 'december': 12
  };

  let year, month, day;

  // Try to extract year, month, day from various formats
  
  // Format: "Nov 7, 2025" or "November 7, 2025"
  let match = cleaned.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)\s+(\d{1,2}),?\s+(\d{4})\b/i);
  if (match) {
    month = monthMap[match[1].toLowerCase()];
    day = parseInt(match[2]);
    year = parseInt(match[3]);
  }

  // Format: "2025-11-07" (already ISO)
  if (!match) {
    match = cleaned.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (match) {
      year = parseInt(match[1]);
      month = parseInt(match[2]);
      day = parseInt(match[3]);
    }
  }

  // Format: "11/7/2025" or "11-7-2025"
  if (!match) {
    match = cleaned.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (match) {
      month = parseInt(match[1]);
      day = parseInt(match[2]);
      year = parseInt(match[3]);
    }
  }

  // Format: "Tuesday 12, March 2024" or "12 March 2024"
  if (!match) {
    match = cleaned.match(/(\d{1,2}),?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)\s+(\d{4})/i);
    if (match) {
      day = parseInt(match[1]);
      month = monthMap[match[2].toLowerCase()];
      year = parseInt(match[3]);
    }
  }

  // Format: "March 12, 2024" (month first)
  if (!match) {
    match = cleaned.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)\s+(\d{1,2}),?\s+(\d{4})\b/i);
    if (match) {
      month = monthMap[match[1].toLowerCase()];
      day = parseInt(match[2]);
      year = parseInt(match[3]);
    }
  }

  // Format: "November 7 & 8, 2025" or "Nov 7-8, 2025" (multi-day, extract first date)
  if (!match) {
    match = cleaned.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)\s+(\d{1,2})\s*[&\-—]\s*\d{1,2},?\s+(\d{4})/i);
    if (match) {
      month = monthMap[match[1].toLowerCase()];
      day = parseInt(match[2]); // Take the first day
      year = parseInt(match[3]);
    }
  }
  
  // Format: "Saturday, November 8, 2:30PM to 4PM, 2025" (with time, extract date)
  if (!match) {
    match = cleaned.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)\s+(\d{1,2}),\s+\d{1,2}:\d{2}[AP]M.*?(\d{4})/i);
    if (match) {
      month = monthMap[match[1].toLowerCase()];
      day = parseInt(match[2]);
      year = parseInt(match[3]);
    }
  }

  // If we found all components, return ISO format
  if (year && month && day) {
    // Validate ranges
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return null;
    }
    
    // Format as ISO: YYYY-MM-DD
    const monthStr = month.toString().padStart(2, '0');
    const dayStr = day.toString().padStart(2, '0');
    return `${year}-${monthStr}-${dayStr}`;
  }

  return null; // Could not parse
}

function normalizeDateString(dateText) {
  // Try to convert to ISO first
  const iso = toISODate(dateText);
  if (iso) {
    return iso;
  }

  // Fallback to original logic if ISO conversion fails
  if (!dateText || typeof dateText !== 'string') {
    return null;
  }

  let normalized = dateText
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/(\d+)(st|nd|rd|th)/gi, '$1')
    .replace(/\d{1,2}:\d{2}\s*(AM|PM)\d{1,2}:\d{2}/gi, '')
    .trim();

  const hasYear = /\d{4}/.test(normalized);
  
  if (!hasYear) {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const dateLower = normalized.toLowerCase();
    
    const monthIndex = months.findIndex(m => dateLower.includes(m));
    
    if (monthIndex !== -1) {
      const year = monthIndex < currentMonth ? currentYear + 1 : currentYear;
      normalized = `${normalized}, ${year}`;
    } else {
      normalized = `${normalized}, ${currentYear}`;
    }
  }

  return normalized;
}

module.exports = { normalizeDateString, toISODate };
