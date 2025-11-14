/**
 * Generic Program Filter
 * Filters out generic recurring programs that aren't actual unique events
 */

// Generic program patterns that are NOT real events
const GENERIC_PROGRAM_PATTERNS = [
  // School/Education programs (generic, not specific events)
  /^PD\s+Days?$/i,
  /^Professional Development Days?$/i,
  /^School\s+(Programs?|Days?|Visits?)$/i,
  /^Field\s+Trips?$/i,
  /^Group\s+(Visits?|Tours?|Programs?)$/i,
  /^Education\s+Programs?$/i,
  /^Student\s+Programs?$/i,
  /^Teacher\s+Programs?$/i,
  
  // Generic admission/access (not events)
  /^Free\s+(Admission|Entry|Day)$/i,
  /^Free\s+First\s+(Friday|Thursday|Saturday|Sunday)/i,  // Free First Friday Nights, etc.
  /^General\s+Admission$/i,
  /^Open\s+(House|Day)$/i,
  /^Community\s+Day$/i,
  /^Family\s+Day$/i,
  /^Members?\s+(Day|Night|Hour)$/i,
  /^Pay\s+What\s+You\s+(Can|Wish)$/i,
  
  // Recurring studio/workshop programs (Vancouver Art Gallery patterns)
  /^The Making Place/i,  // VAG generic family program
  /^Art Studio\s/i,
  /^Family Studio\s/i,
  /^Drop[- ]in Studio/i,
  
  // Generic time-based (not specific events)
  /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+(Programs?|Events?)$/i,
  /^Weekly\s+/i,
  /^Daily\s+/i,
  /^Monthly\s+/i,
  /^\d{2}\/\d{2}\s+Season$/i,  // "25/26 Season", "24/25 Season"
  /^\d{4}[-\/]\d{2,4}\s+Season$/i,  // "2025-26 Season", "2025/2026 Season"
  
  // Generic categories (not specific events)
  /^(Music|Art|Dance|Theater|Film|Food|Sports?)\s+Programs?$/i,
  /^(Kids?|Children|Youth|Teen|Adult|Senior)\s+Programs?$/i,
  
  // Facility/service names (not events)
  /^(Tours?|Classes?|Workshops?|Programs?)$/i,
  /^Drop[- ]in\s+/i,
  /^Self[- ]Guided\s+/i,
  
  // Booking/registration pages
  /^(Book|Reserve|Register|Sign\s+Up)$/i,
  /^Private\s+(Events?|Tours?|Rentals?)$/i,
  /^Event\s+Rentals?$/i,
  
  // Navigation/menu items
  /^Events?\s+(and|&)\s+Public\s+Programs?$/i,
  /^Public\s+Programs?\s+(and|&)\s+Events?$/i,
  /^Programs?\s+(and|&)\s+Events?$/i,
  /^Events?\s+(and|&)\s+Programs?$/i,
];

// Keywords that indicate a generic program (use with caution)
const GENERIC_KEYWORDS = [
  'program', 'programs', 'series', 'season', 'general', 'ongoing',
  'recurring', 'regular', 'schedule', 'calendar'
];

/**
 * Check if an event title is a generic program (not a real event)
 * @param {string} title - Event title to check
 * @param {string} description - Event description (optional)
 * @returns {Object} - { isGeneric: boolean, reason: string }
 */
function isGenericProgram(title, description = '') {
  if (!title) return { isGeneric: false };
  
  const titleLower = title.toLowerCase().trim();
  const descLower = (description || '').toLowerCase();
  
  // Check against patterns
  for (const pattern of GENERIC_PROGRAM_PATTERNS) {
    if (pattern.test(title)) {
      return {
        isGeneric: true,
        reason: `Matches generic program pattern: ${pattern}`
      };
    }
  }
  
  // Special case: Very short generic titles (likely incomplete scraping)
  if (titleLower.length <= 15) {
    // Check if it's ONLY generic keywords
    const words = titleLower.split(/\s+/);
    if (words.length <= 2 && words.some(w => GENERIC_KEYWORDS.includes(w))) {
      return {
        isGeneric: true,
        reason: `Short generic title: "${title}"`
      };
    }
  }
  
  // Check description for generic program indicators
  if (descLower.includes('every ') && descLower.includes('day')) {
    // "every monday", "every day" = recurring program
    if (titleLower.length < 30) {
      return {
        isGeneric: true,
        reason: 'Appears to be recurring program (description mentions "every day")'
      };
    }
  }
  
  return { isGeneric: false };
}

/**
 * Filter out generic programs from event list
 * @param {Array} events - Array of event objects
 * @returns {Array} - Filtered events
 */
function filterGenericPrograms(events) {
  if (!Array.isArray(events)) return events;
  
  const filtered = events.filter(event => {
    const check = isGenericProgram(event.title, event.description);
    if (check.isGeneric) {
      console.log(`  ❌ Filtered out generic program: "${event.title}"`);
      if (check.reason) {
        console.log(`     Reason: ${check.reason}`);
      }
      return false;
    }
    return true;
  });
  
  const removedCount = events.length - filtered.length;
  if (removedCount > 0) {
    console.log(`  🧹 Removed ${removedCount} generic programs`);
  }
  
  return filtered;
}

module.exports = {
  isGenericProgram,
  filterGenericPrograms,
  GENERIC_PROGRAM_PATTERNS
};
